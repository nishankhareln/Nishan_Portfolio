"""
SMTP email service.

Sends contact form submissions to the portfolio owner using an authenticated
SMTP connection (defaults to Gmail with App Password).

Security notes
--------------
- Credentials are loaded from environment variables — never hardcoded.
- Subject and body are escaped before being rendered into HTML.
- STARTTLS is required in production.
- SMTP is called in a background task so the HTTP response stays fast and
  so a slow SMTP server can't be used for timing attacks.
"""

import html
import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid

from app.config import Settings

logger = logging.getLogger(__name__)


class EmailServiceError(Exception):
    """Raised when an email could not be sent."""


def _build_message(
    *,
    settings: Settings,
    sender_name: str,
    sender_email: str,
    subject: str,
    body_text: str,
    ip_address: str,
    user_agent: str,
) -> EmailMessage:
    """Construct a safe multipart email message."""

    msg = EmailMessage()
    msg["From"] = formataddr((settings.mail_from_name, settings.mail_from))
    msg["To"] = settings.mail_to
    msg["Reply-To"] = formataddr((sender_name, sender_email))
    msg["Subject"] = f"[Portfolio] {subject[:100]}"
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain="nishankharel.com.np")
    msg["X-Mailer"] = "nishankharel-portfolio/1.0"

    # --- Plain text body ---
    plain = (
        f"New contact form submission\n"
        f"============================\n\n"
        f"Name:    {sender_name}\n"
        f"Email:   {sender_email}\n"
        f"Subject: {subject}\n"
        f"IP:      {ip_address}\n"
        f"Agent:   {user_agent}\n\n"
        f"--- Message ---\n\n"
        f"{body_text}\n"
    )
    msg.set_content(plain)

    # --- HTML body (escaped) ---
    safe_name = html.escape(sender_name)
    safe_email = html.escape(sender_email)
    safe_subject = html.escape(subject)
    safe_body = html.escape(body_text).replace("\n", "<br>")
    safe_ip = html.escape(ip_address or "unknown")
    safe_agent = html.escape(user_agent or "unknown")

    html_body = f"""\
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; background:#f5f3ef; padding:24px; color:#1a1a1a;">
  <div style="max-width:620px; margin:0 auto; background:#ffffff; border:1px solid #e8e6e1; border-radius:12px; overflow:hidden;">
    <div style="background:#1a1a1a; color:#f5f3ef; padding:20px 28px;">
      <h2 style="margin:0; font-size:18px; letter-spacing:-0.01em;">New Contact Submission</h2>
      <p style="margin:4px 0 0; font-size:12px; opacity:0.7;">nishankharel.com.np</p>
    </div>
    <div style="padding:28px;">
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr><td style="padding:6px 0; color:#6b6b6b; width:90px;">Name</td>
            <td style="padding:6px 0; font-weight:600;">{safe_name}</td></tr>
        <tr><td style="padding:6px 0; color:#6b6b6b;">Email</td>
            <td style="padding:6px 0;"><a href="mailto:{safe_email}" style="color:#1a1a1a;">{safe_email}</a></td></tr>
        <tr><td style="padding:6px 0; color:#6b6b6b;">Subject</td>
            <td style="padding:6px 0;">{safe_subject}</td></tr>
      </table>
      <hr style="border:none; border-top:1px solid #e8e6e1; margin:20px 0;">
      <div style="font-size:14px; line-height:1.65; white-space:pre-wrap;">{safe_body}</div>
      <hr style="border:none; border-top:1px solid #e8e6e1; margin:24px 0 16px;">
      <p style="font-size:11px; color:#9a9a9a; margin:0;">
        IP: {safe_ip}<br>
        User-Agent: {safe_agent}
      </p>
    </div>
  </div>
</body>
</html>
"""
    msg.add_alternative(html_body, subtype="html")
    return msg


def send_contact_email(
    *,
    settings: Settings,
    sender_name: str,
    sender_email: str,
    subject: str,
    body_text: str,
    ip_address: str = "",
    user_agent: str = "",
) -> None:
    """
    Send a contact form email via SMTP.

    Raises ``EmailServiceError`` on any failure. The caller decides whether
    to surface the error to the user or swallow it (e.g. background task).
    """
    if not settings.smtp_username or not settings.smtp_password:
        raise EmailServiceError(
            "SMTP credentials are not configured. Set SMTP_USERNAME and SMTP_PASSWORD."
        )

    msg = _build_message(
        settings=settings,
        sender_name=sender_name,
        sender_email=sender_email,
        subject=subject,
        body_text=body_text,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    context = ssl.create_default_context()

    try:
        with smtplib.SMTP(
            settings.smtp_host,
            settings.smtp_port,
            timeout=settings.smtp_timeout,
        ) as server:
            server.ehlo()
            if settings.smtp_use_tls:
                server.starttls(context=context)
                server.ehlo()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)
    except (smtplib.SMTPException, ssl.SSLError, OSError) as exc:
        logger.error("SMTP send failed: %s", exc, exc_info=True)
        raise EmailServiceError(f"Failed to send email: {exc}") from exc
