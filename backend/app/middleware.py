"""
Custom middleware: security headers.

Applies strict HTTP response headers to harden the API against common
web attacks (XSS, clickjacking, MIME sniffing, etc.).
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach hardening headers to every response."""

    def __init__(self, app, *, is_production: bool = False):
        super().__init__(app)
        self.is_production = is_production

    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)

        # Prevent MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Disallow framing — blocks clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        # Modern equivalent of X-Frame-Options
        response.headers["Content-Security-Policy"] = "frame-ancestors 'none'"
        # Don't leak the referrer to third parties
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Disable dangerous browser features by default
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=(), usb=()"
        )
        # Old XSS filter (harmless, helps legacy browsers)
        response.headers["X-XSS-Protection"] = "0"
        # Remove any server fingerprint if set upstream
        response.headers.pop("Server", None)

        # HSTS only in production over HTTPS.
        if self.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        return response
