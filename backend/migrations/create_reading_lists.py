"""
Migration: Create reading list tables
Date: 2025-11-05
"""

from __future__ import annotations

import shutil
import sqlite3
from datetime import datetime
from pathlib import Path


def backup_database(db_path: Path) -> Path:
    """Create a timestamped backup before running the migration."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.parent / f"{db_path.name}.backup-reading-lists-{timestamp}"
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

        if not table_exists(cursor, "reading_lists"):
            print("1. Creating reading_lists table...")
            cursor.execute(
                """
                CREATE TABLE reading_lists (
                    id TEXT PRIMARY KEY,
                    owner_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    visibility TEXT NOT NULL DEFAULT 'private',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY(owner_id) REFERENCES users(id)
                )
                """
            )
            cursor.execute("CREATE INDEX idx_reading_lists_owner_id ON reading_lists(owner_id)")
            print("   [OK] reading_lists created")
        else:
            print("1. [INFO] reading_lists table already exists")

        if not table_exists(cursor, "reading_list_items"):
            print("2. Creating reading_list_items table...")
            cursor.execute(
                """
                CREATE TABLE reading_list_items (
                    id TEXT PRIMARY KEY,
                    list_id TEXT NOT NULL,
                    order_index INTEGER NOT NULL DEFAULT 0,
                    book_id TEXT,
                    title TEXT NOT NULL,
                    author TEXT,
                    isbn TEXT,
                    notes TEXT,
                    cover_image_url TEXT,
                    item_type TEXT NOT NULL DEFAULT 'book',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY(list_id) REFERENCES reading_lists(id),
                    FOREIGN KEY(book_id) REFERENCES books_v2(id)
                )
                """
            )
            cursor.execute(
                "CREATE INDEX idx_reading_list_items_list_id ON reading_list_items(list_id)"
            )
            print("   [OK] reading_list_items created")
        else:
            print("2. [INFO] reading_list_items table already exists")

        if not table_exists(cursor, "reading_list_members"):
            print("3. Creating reading_list_members table...")
            cursor.execute(
                """
                CREATE TABLE reading_list_members (
                    id TEXT PRIMARY KEY,
                    list_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'viewer',
                    invited_by TEXT,
                    joined_at TEXT NOT NULL,
                    FOREIGN KEY(list_id) REFERENCES reading_lists(id),
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(invited_by) REFERENCES users(id),
                    UNIQUE(list_id, user_id)
                )
                """
            )
            cursor.execute(
                "CREATE INDEX idx_reading_list_members_list_id ON reading_list_members(list_id)"
            )
            cursor.execute(
                "CREATE INDEX idx_reading_list_members_user_id ON reading_list_members(user_id)"
            )
            print("   [OK] reading_list_members created")
        else:
            print("3. [INFO] reading_list_members table already exists")

        if not table_exists(cursor, "reading_list_progress"):
            print("4. Creating reading_list_progress table...")
            cursor.execute(
                """
                CREATE TABLE reading_list_progress (
                    id TEXT PRIMARY KEY,
                    list_id TEXT NOT NULL,
                    list_item_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'not_started',
                    completed_at TEXT,
                    notes TEXT,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY(list_id) REFERENCES reading_lists(id),
                    FOREIGN KEY(list_item_id) REFERENCES reading_list_items(id),
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    UNIQUE(list_id, list_item_id, user_id)
                )
                """
            )
            cursor.execute(
                "CREATE INDEX idx_reading_list_progress_list_id ON reading_list_progress(list_id)"
            )
            cursor.execute(
                "CREATE INDEX idx_reading_list_progress_user_id ON reading_list_progress(user_id)"
            )
            print("   [OK] reading_list_progress created")
        else:
            print("4. [INFO] reading_list_progress table already exists")

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
