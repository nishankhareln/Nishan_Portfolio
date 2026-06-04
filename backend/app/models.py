"""SQLAlchemy ORM models."""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ContactMessage(Base):
    """Persisted record of a contact form submission."""

    __tablename__ = "contact_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(120), nullable=False, default="(No subject)")
    message: Mapped[str] = mapped_column(Text, nullable=False)

    # Audit / security fields
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)  # supports IPv6
    user_agent: Mapped[str] = mapped_column(String(512), nullable=True)
    recaptcha_score: Mapped[str] = mapped_column(String(16), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ContactMessage id={self.id} email={self.email} at={self.created_at}>"
