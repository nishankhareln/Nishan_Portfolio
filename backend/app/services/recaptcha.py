"""
Google reCAPTCHA v3 verification.

The client-side gets a token from grecaptcha.execute(). We send that token
to Google's siteverify endpoint with our server-side secret key. Google
returns a score (0.0 bot — 1.0 human); we accept submissions >= min_score.
"""

import logging
from typing import Optional

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)

RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


class RecaptchaError(Exception):
    """Raised when reCAPTCHA verification fails."""


async def verify_recaptcha(
    *,
    settings: Settings,
    token: str,
    remote_ip: Optional[str] = None,
) -> float:
    """
    Verify a reCAPTCHA v3 token with Google and return its score.

    If reCAPTCHA is disabled in settings, returns 1.0 (always pass).
    Raises ``RecaptchaError`` on failure or if the score is below threshold.
    """
    if not settings.recaptcha_enabled or not settings.recaptcha_secret_key:
        return 1.0

    if not token:
        raise RecaptchaError("Missing reCAPTCHA token")

    payload = {
        "secret": settings.recaptcha_secret_key,
        "response": token,
    }
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(RECAPTCHA_VERIFY_URL, data=payload)
            resp.raise_for_status()
            data = resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.error("reCAPTCHA request failed: %s", exc)
        raise RecaptchaError("Could not reach reCAPTCHA service") from exc

    if not data.get("success"):
        errors = data.get("error-codes", [])
        logger.warning("reCAPTCHA rejected token: %s", errors)
        raise RecaptchaError(f"reCAPTCHA failed: {', '.join(errors) or 'invalid token'}")

    score = float(data.get("score", 0.0))
    action = data.get("action", "")

    if action and action != "contact":
        raise RecaptchaError(f"Unexpected reCAPTCHA action: {action}")

    if score < settings.recaptcha_min_score:
        logger.warning("reCAPTCHA score too low: %.2f", score)
        raise RecaptchaError(f"Bot detection score too low ({score:.2f})")

    return score
