"""
Application settings loaded from environment variables.

All secrets MUST be set via environment variables (or a .env file during
local development). Never commit real credentials to the repository.
"""

from functools import lru_cache
from typing import List

from pydantic import EmailStr, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Immutable settings container."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---------- Application ----------
    app_name: str = "Nishan Kharel Portfolio API"
    app_env: str = Field(default="development", description="development | production")
    debug: bool = False
    api_prefix: str = "/api"

    # ---------- Security ----------
    # Comma-separated list of allowed origins (no trailing slash).
    # Example: "https://nishankharel.com.np,https://www.nishankharel.com.np"
    cors_origins: str = "http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500"
    trusted_hosts: str = "localhost,127.0.0.1"

    # Rate limit: e.g. "5/minute", "20/hour"
    rate_limit_contact: str = "5/minute"
    rate_limit_default: str = "60/minute"

    # ---------- reCAPTCHA v3 ----------
    recaptcha_secret_key: str = ""  # server-side secret key
    recaptcha_min_score: float = 0.5  # 0.0 (bot) to 1.0 (human)
    recaptcha_enabled: bool = False

    # ---------- Database ----------
    # SQLite default for local dev; swap to PostgreSQL in production.
    # Example prod: postgresql+psycopg://user:pass@host:5432/dbname
    database_url: str = "sqlite:///./contact_messages.db"

    # ---------- Email (SMTP) ----------
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""  # your Gmail address
    smtp_password: str = ""  # Gmail APP PASSWORD (not your login password!)
    smtp_use_tls: bool = True
    smtp_timeout: int = 15

    # Email routing
    mail_from: EmailStr = "noreply@nishankharel.com.np"
    mail_from_name: str = "Portfolio Contact Form"
    mail_to: EmailStr = "nkharel57@gmail.com"

    # ---------- Helpers ----------
    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def trusted_hosts_list(self) -> List[str]:
        return [h.strip() for h in self.trusted_hosts.split(",") if h.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @field_validator("recaptcha_enabled", mode="before")
    @classmethod
    def _enable_recaptcha_if_key(cls, v, info):
        # Auto-enable if secret key is present and no explicit override.
        if isinstance(v, str):
            return v.lower() in ("1", "true", "yes", "on")
        return bool(v)


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
