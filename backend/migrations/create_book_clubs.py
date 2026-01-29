"""
Migration: Create book club tables
Date: 2025-01-15
"""

from __future__ import annotations

import shutil
import sqlite3
from datetime import datetime
from pathlib import Path


def backup_database(db_path: Path) -> Path:
    """Create a timestamped backup before running the migration."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.parent / f"{db_path.name}.backup-book-clubs-{timestamp}"
    shutil.copyfile(db_path, backup_path)
    try:
        shutil.copystat(db_path, backup_path)
    except PermissionError:
        pass
    print(f"[OK] Database backed up to: {backup_path}")
    return backup_path


def table_exists(cursor: sqlite3.Cursor, table_name: str) -> bool:
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,)
    )
    return cursor.fetchone() is not None


def index_exists(cursor: sqlite3.Cursor, index_name: str) -> bool:
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND name=?", (index_name,)
    )
    return cursor.fetchone() is not None


def migrate() -> bool:
    db_path = Path(__file__).parent.parent / "data" / "books.db"
    if not db_path.exists():
        print(f"[ERROR] Database not found at {db_path}")
        return False

    print(f"Running migration on: {db_path}")
    backup_path = backup_database(db_path)

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        if not table_exists(cursor, "book_clubs"):
            print("1. Creating book_clubs table...")
            cursor.execute(
                """
                CREATE TABLE book_clubs (
                    id TEXT PRIMARY KEY,
                    owner_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    slug TEXT,
                    current_book_id TEXT,
                    pages_total_override INTEGER,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY(owner_id) REFERENCES users(id),
                    FOREIGN KEY(current_book_id) REFERENCES books_v2(id)
                )
                """
            )
            cursor.execute("CREATE INDEX idx_book_clubs_owner_id ON book_clubs(owner_id)")
            cursor.execute("CREATE INDEX idx_book_clubs_current_book_id ON book_clubs(current_book_id)")
            cursor.execute("CREATE INDEX idx_book_clubs_slug ON book_clubs(slug)")
            print("   [OK] book_clubs created")
        else:
            print("1. [INFO] book_clubs table already exists")

        if not table_exists(cursor, "book_club_members"):
            print("2. Creating book_club_members table...")
            cursor.execute(
                """
                CREATE TABLE book_club_members (
                    id TEXT PRIMARY KEY,
                    club_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'member',
                    joined_at TEXT NOT NULL,
                    last_active_at TEXT,
                    left_at TEXT,
                    removed_by TEXT,
                    FOREIGN KEY(club_id) REFERENCES book_clubs(id),
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(removed_by) REFERENCES users(id),
                    UNIQUE(club_id, user_id)
                )
                """
            )
            cursor.execute("CREATE INDEX idx_book_club_members_club_id ON book_club_members(club_id)")
            cursor.execute("CREATE INDEX idx_book_club_members_user_id ON book_club_members(user_id)")
            print("   [OK] book_club_members created")
        else:
            print("2. [INFO] book_club_members table already exists")

        if not table_exists(cursor, "book_club_progress"):
            print("3. Creating book_club_progress table...")
            cursor.execute(
                """
                CREATE TABLE book_club_progress (
                    id TEXT PRIMARY KEY,
                    club_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    current_page INTEGER NOT NULL DEFAULT 0,
                    pages_total INTEGER,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY(club_id) REFERENCES book_clubs(id),
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    UNIQUE(club_id, user_id)
                )
                """
            )
            cursor.execute("CREATE INDEX idx_book_club_progress_club_id ON book_club_progress(club_id)")
            cursor.execute("CREATE INDEX idx_book_club_progress_user_id ON book_club_progress(user_id)")
            print("   [OK] book_club_progress created")
        else:
            print("3. [INFO] book_club_progress table already exists")

        if not table_exists(cursor, "book_club_comments"):
            print("4. Creating book_club_comments table...")
            cursor.execute(
                """
                CREATE TABLE book_club_comments (
                    id TEXT PRIMARY KEY,
                    club_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    page_number INTEGER NOT NULL,
                    body TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY(club_id) REFERENCES book_clubs(id),
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
                """
            )
            cursor.execute("CREATE INDEX idx_book_club_comments_club_id ON book_club_comments(club_id)")
            cursor.execute("CREATE INDEX idx_book_club_comments_user_id ON book_club_comments(user_id)")
            cursor.execute("CREATE INDEX idx_book_club_comments_page_number ON book_club_comments(page_number)")
            print("   [OK] book_club_comments created")
        else:
            print("4. [INFO] book_club_comments table already exists")

        if not table_exists(cursor, "book_club_books"):
            print("5. Creating book_club_books table...")
            cursor.execute(
                """
                CREATE TABLE book_club_books (
                    id TEXT PRIMARY KEY,
                    club_id TEXT NOT NULL,
                    book_id TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    completed_at TEXT,
                    FOREIGN KEY(club_id) REFERENCES book_clubs(id),
                    FOREIGN KEY(book_id) REFERENCES books_v2(id)
                )
                """
            )
            cursor.execute("CREATE INDEX idx_book_club_books_club_id ON book_club_books(club_id)")
            cursor.execute("CREATE INDEX idx_book_club_books_book_id ON book_club_books(book_id)")
            print("   [OK] book_club_books created")
        else:
            print("5. [INFO] book_club_books table already exists")

        conn.commit()
        conn.close()

        print("\n[SUCCESS] Migration completed successfully!")
        print(f"   Backup: {backup_path}")
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"\n[ERROR] Migration failed: {exc}")
        print(f"   Restoring from backup: {backup_path}")
        shutil.copy2(backup_path, db_path)
        print("   [OK] Database restored from backup")
        return False


if __name__ == "__main__":
    success = migrate()
    exit(0 if success else 1)
