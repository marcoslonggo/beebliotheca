from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlmodel import SQLModel

from app.api import api_router
from app.core.config import get_settings
from app.db.session import engine
from app.models import (
    BookClub,
    BookClubBook,
    BookClubComment,
    BookClubMember,
    BookClubProgress,
    BookV2,
    EnrichmentJob,
    Library,
    LibraryBook,
    LibraryInvitation,
    LibraryMember,
    Notification,
    ReadingList,
    ReadingListItem,
    ReadingListMember,
    ReadingListProgress,
    Series,
    User,
    UserBookData,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.include_router(api_router, prefix="/api")

    # Mount static files for cover images
    covers_dir = Path("data/covers")
    covers_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/covers", StaticFiles(directory=str(covers_dir)), name="covers")

    # Optionally serve frontend build assets (single-container deployments)
    if settings.frontend_dist_dir:
        frontend_dir = Path(settings.frontend_dist_dir)
        if frontend_dir.exists():
            app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

    @app.get("/health", tags=["meta"])
    async def health_check() -> dict[str, str]:
        print("[HEALTH] Health check endpoint called!")
        import sys
        sys.stdout.flush()
        return {"status": "ok"}

    return app


app = create_app()
