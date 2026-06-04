"""
/api/contact — contact form endpoint.

Pipeline
--------
1. Rate limit (per IP, via slowapi middleware).
2. Pydantic validation + sanitization (schemas.ContactRequest).
3. reCAPTCHA v3 verification (if enabled).
4. Persist to database.
5. Send email via SMTP in the background.
6. Return a minimal success response (never leak internal errors).
"""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.models import ContactMessage
from app.schemas import ContactRequest, ContactResponse
from app.services.email_service import EmailServiceError, send_contact_email
from app.services.recaptcha import RecaptchaError, verify_recaptcha

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["contact"])

# Limiter is configured in main.py but we reference it by name via request.state
limiter = Limiter(key_func=get_remote_address)


def _client_ip(request: Request) -> str:
    """Best-effort client IP extraction (trusts X-Forwarded-For last hop)."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        # Take the first (leftmost) entry but cap its length.
        return fwd.split(",")[0].strip()[:45]
    return (request.client.host if request.client else "") [:45]


@router.post(
    "/contact",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"description": "Validation or reCAPTCHA failed"},
        429: {"description": "Rate limit exceeded"},
        500: {"description": "Internal error"},
    },
)
@limiter.limit("5/minute")
async def create_contact_message(
    request: Request,
    payload: ContactRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ContactResponse:
    """Accept a contact form submission, persist it, and email the owner."""

    client_ip = _client_ip(request)
    user_agent = (request.headers.get("user-agent") or "")[:512]

    # -------- reCAPTCHA --------
    score = 1.0
    if settings.recaptcha_enabled:
        try:
            score = await verify_recaptcha(
                settings=settings,
                token=payload.recaptcha_token or "",
                remote_ip=client_ip,
            )
        except RecaptchaError as exc:
            # Return a generic error — don't hint at the mechanism.
            logger.info("reCAPTCHA rejected submission from %s: %s", client_ip, exc)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification failed. Please try again.",
            )

    # -------- Persist --------
    try:
        record = ContactMessage(
            name=payload.name,
            email=payload.email,
            subject=payload.subject or "(No subject)",
            message=payload.message,
            ip_address=client_ip,
            user_agent=user_agent,
            recaptcha_score=f"{score:.2f}" if settings.recaptcha_enabled else None,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
    except Exception as exc:  # pragma: no cover
        db.rollback()
        logger.error("DB insert failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save your message. Please try again later.",
        )

    # -------- Email (background) --------
    def _send_mail_safely() -> None:
        try:
            send_contact_email(
                settings=settings,
                sender_name=payload.name,
                sender_email=payload.email,
                subject=payload.subject or "(No subject)",
                body_text=payload.message,
                ip_address=client_ip,
                user_agent=user_agent,
            )
            logger.info("Contact email delivered for id=%s", record.id)
        except EmailServiceError as exc:
            # Message is already persisted — log and move on.
            logger.error("Email delivery failed for id=%s: %s", record.id, exc)

    background_tasks.add_task(_send_mail_safely)

    return ContactResponse(
        success=True,
        message="Thanks! Your message has been sent. I'll get back to you soon.",
        id=record.id,
    )
