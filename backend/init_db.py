#!/usr/bin/env python3
"""Initialize the database by creating all tables."""

import asyncio
from sqlmodel import SQLModel

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


async def init_db():
    """Create all database tables."""
    print("Creating database tables...")

    # Clear metadata cache to ensure fresh schema
    SQLModel.metadata.clear()

    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(SQLModel.metadata.create_all)

    print("Database tables created successfully!")
    print("\nTables created:")
    for table in SQLModel.metadata.sorted_tables:
        print(f"  - {table.name}")


if __name__ == "__main__":
    asyncio.run(init_db())
