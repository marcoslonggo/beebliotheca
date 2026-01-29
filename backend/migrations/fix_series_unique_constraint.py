"""
Migration: Fix series unique constraint from name-only to (name, library_id)
Date: 2025-11-04
"""
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path


def backup_database(db_path: Path) -> Path:
    """Create a backup of the database before migration."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.parent / f"{db_path.name}.backup-series-fix-{timestamp}"
    shutil.copy2(db_path, backup_path)
    print(f"[OK] Database backed up to: {backup_path}")
    return backup_path


def migrate():
    """Run the migration."""
    db_path = Path(__file__).parent.parent / "data" / "books.db"

    if not db_path.exists():
        print(f"[ERROR] Database not found at {db_path}")
        return False

    print(f"Running migration on: {db_path}")

    # Create backup
    backup_path = backup_database(db_path)

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print("\n1. Creating new series table with correct constraints...")

        # Create new table with correct schema
        cursor.execute("""
            CREATE TABLE series_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR NOT NULL,
                library_id TEXT NOT NULL,
                description TEXT,
                publication_status TEXT DEFAULT 'in_progress',
                cover_book_id CHAR(32),
                custom_cover_path TEXT,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                UNIQUE(name, library_id)
            )
        """)
        print("   [OK] New series table created")

        # Copy data from old table
        print("\n2. Copying data from old table...")
        cursor.execute("""
            INSERT INTO series_new (id, name, library_id, description, publication_status,
                                   cover_book_id, custom_cover_path, created_at, updated_at)
            SELECT id, name, library_id, description, publication_status,
                   cover_book_id, custom_cover_path, created_at, updated_at
            FROM series
        """)
        rows_copied = cursor.rowcount
        print(f"   [OK] Copied {rows_copied} rows")

        # Drop old table
        print("\n3. Dropping old series table...")
        cursor.execute("DROP TABLE series")
        print("   [OK] Old table dropped")

        # Rename new table
        print("\n4. Renaming new table to series...")
        cursor.execute("ALTER TABLE series_new RENAME TO series")
        print("   [OK] Table renamed")

        conn.commit()

        # Verify
        print("\n5. Verifying migration...")
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='series'")
        table_def = cursor.fetchone()[0]

        if "UNIQUE(name, library_id)" in table_def:
            print("   [OK] Composite unique constraint verified")
        else:
            raise AssertionError("Composite unique constraint not found in table definition")

        cursor.execute("SELECT COUNT(*) FROM series")
        count = cursor.fetchone()[0]
        print(f"   [OK] Series table has {count} rows")

        conn.close()

        print("\n[SUCCESS] Migration completed successfully!")
        print(f"   Backup: {backup_path}")
        return True

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        print(f"   Restoring from backup: {backup_path}")
        shutil.copy2(backup_path, db_path)
        print("   [OK] Database restored from backup")
        return False


if __name__ == "__main__":
    success = migrate()
    exit(0 if success else 1)
