#!/usr/bin/env python3
"""Initialize the database by creating all tables (synchronous version)."""

from sqlmodel import SQLModel, create_engine

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


def init_db():
    """Create all database tables."""
    print("Creating database tables...")

    # Create synchronous engine for SQLite
    database_url = "sqlite:///./data/books.db"
    engine = create_engine(database_url, echo=True)

    # Create all tables (don't clear metadata - we need the table definitions!)
    SQLModel.metadata.create_all(engine)

    print("\nDatabase tables created successfully!")
    print("\nTables created:")
    for table in SQLModel.metadata.sorted_tables:
        print(f"  - {table.name}")


if __name__ == "__main__":
    init_db()
