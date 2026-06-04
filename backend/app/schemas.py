"""
Pydantic request/response schemas.

These schemas are the ONLY source of truth for incoming data shapes.
Any field not declared here is rejected. This is our first line of
defense against injection and malformed payloads.
"""

import re
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# Control characters we strip from all text input.
_CTRL_CHARS = re.compile(r"[\x00-\x1F\x7F]")


def _clean_text(value: str) -> str:
    """Strip control characters and collapse whitespace."""
    if not isinstance(value, str):
        return ""
    value = _CTRL_CHARS.sub("", value)
    return value.strip()


class ContactRequest(BaseModel):
    """Incoming contact form payload."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",  # reject any unknown keys — critical for security
    )

    name: str = Field(..., min_length=2, max_length=80)
    email: EmailStr = Field(..., max_length=120)
    subject: Optional[str] = Field(default="(No subject)", max_length=120)
    message: str = Field(..., min_length=10, max_length=2000)
    recaptcha_token: Optional[str] = Field(default="", max_length=4096)

    @field_validator("name", "subject", "message", mode="before")
    @classmethod
    def _sanitize(cls, v):
        if v is None:
            return v
        return _clean_text(v)

    @field_validator("name")
    @classmethod
    def _name_allowed_chars(cls, v: str) -> str:
        # Allow letters, spaces, hyphens, apostrophes, dots — reject the rest.
        # Unicode-aware so international names work.
        if not re.match(r"^[\w\s\-\.\'\u00C0-\u024F\u1E00-\u1EFF]+$", v, flags=re.UNICODE):
            raise ValueError("Name contains invalid characters")
        return v

    @field_validator("message")
    @classmethod
    def _message_no_links_spam(cls, v: str) -> str:
        # Soft spam filter: reject obvious link-stuffed bot payloads.
        link_count = len(re.findall(r"https?://", v, flags=re.IGNORECASE))
        if link_count > 5:
            raise ValueError("Message contains too many links")
        return v


class ContactResponse(BaseModel):
    """Response after a successful contact submission."""

    success: bool
    message: str
    id: Optional[int] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
