"""
Application entry point.

Wires up:
- CORS (restricted to trusted origins)
- TrustedHost (blocks Host header attacks)
- SlowAPI rate limiter
- Custom security headers
- Routers (contact, health)
- Global exception handler (never leak internals)
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app import __version__
from app.config import get_settings
from app.database import init_db
from app.middleware import SecurityHeadersMiddleware
from app.routers import contact, health

# ---------- Logging ----------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


# ---------- Lifespan (startup / shutdown) ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Starting %s v%s in %s mode",
        settings.app_name,
        __version__,
        settings.app_env,
    )
    init_db()
    logger.info("Database initialised")

    if not settings.smtp_username or not settings.smtp_password:
        logger.warning(
            "SMTP credentials NOT configured — contact emails will fail. "
            "Set SMTP_USERNAME and SMTP_PASSWORD in .env"
        )
    if settings.recaptcha_enabled:
        logger.info("reCAPTCHA v3 verification is ENABLED")
    else:
        logger.info("reCAPTCHA v3 verification is DISABLED (set RECAPTCHA_SECRET_KEY to enable)")

    yield
    logger.info("Shutting down")


# ---------- App ----------
app = FastAPI(
    title=settings.app_name,
    version=__version__,
    lifespan=lifespan,
    docs_url="/api/docs" if not settings.is_production else None,
    redoc_url="/api/redoc" if not settings.is_production else None,
    openapi_url="/api/openapi.json" if not settings.is_production else None,
)

# ---------- Middleware (order matters, last added = outermost) ----------

# Rate limiter — must be attached to state for slowapi middleware/decorators.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.rate_limit_default],
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Security headers (applied to every response)
app.add_middleware(
    SecurityHeadersMiddleware,
    is_production=settings.is_production,
)

# CORS — explicit whitelist, no wildcards.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Authorization"],
    max_age=600,
)

# Trusted hosts — blocks Host header injection.
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.trusted_hosts_list + ["*.nishankharel.com.np"],
)


# ---------- Global exception handlers ----------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return a sanitized validation error without leaking internals."""
    # Pull the first human-readable message from pydantic errors.
    first_error = "Invalid request body."
    for err in exc.errors():
        loc = ".".join(str(x) for x in err.get("loc", []) if x not in ("body",))
        msg = err.get("msg", "")
        if msg:
            first_error = f"{loc}: {msg}" if loc else msg
            break
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": first_error},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all so stack traces never reach the client."""
    logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error. Please try again later."},
    )


# ---------- Routers ----------
app.include_router(health.router)
app.include_router(contact.router)


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": __version__,
        "docs": "/api/docs" if not settings.is_production else None,
    }
