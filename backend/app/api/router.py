from fastapi import APIRouter

from app.api.endpoints import (
    admin,
    auth,
    book_clubs,
    books,
    enrichment,
    invitations,
    libraries,
    lists,
    notifications,
    series,
)


api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(libraries.router)
api_router.include_router(books.router)
api_router.include_router(enrichment.router)
api_router.include_router(series.router)
api_router.include_router(invitations.router)
api_router.include_router(notifications.router)
api_router.include_router(admin.router)
api_router.include_router(lists.router)
api_router.include_router(book_clubs.router)
