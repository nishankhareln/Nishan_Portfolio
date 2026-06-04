"""
SQLAlchemy database setup.

Uses SQLite by default for development. Switch to PostgreSQL by setting
DATABASE_URL in the environment (see .env.example).
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings

settings = get_settings()

# SQLite needs this connect arg when used across threads (FastAPI workers).
_connect_args = {}
if settings.database_url.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.database_url,
    connect_args=_connect_args,
    pool_pre_ping=True,  # verify connections before using (survives DB restarts)
    echo=False,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """Base class for all ORM models."""

    pass


def get_db():
    """FastAPI dependency — yields a session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables. Called once at app startup."""
    # Import models here so Base.metadata knows about them.
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
