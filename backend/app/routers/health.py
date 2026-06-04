"""/api/health — liveness probe."""

from fastapi import APIRouter, Depends

from app import __version__
from app.config import Settings, get_settings
from app.schemas import HealthResponse

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=__version__,
        environment=settings.app_env,
    )
