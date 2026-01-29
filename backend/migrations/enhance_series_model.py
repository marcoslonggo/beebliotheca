"""
Migration: Enhance series model with library_id, description, publication_status, custom_cover_path
Date: 2025-11-04
"""
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path


def backup_database(db_path: Path) -> Path:
    """Create a backup of the database before migration."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.parent / f"{db_path.name}.backup-series-{timestamp}"
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

        # Check if series table exists
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='series'"
        )
        if not cursor.fetchone():
            print("[INFO] Series table doesn't exist, skipping migration")
            return True

        # Get existing columns
        cursor.execute("PRAGMA table_info(series)")
        existing_columns = {col[1] for col in cursor.fetchall()}

        # Add library_id column
        if "library_id" not in existing_columns:
            print("\n1. Adding library_id column to series...")
            cursor.execute("""
                ALTER TABLE series
                ADD COLUMN library_id TEXT
            """)
            print("   [OK] library_id column added")
        else:
            print("\n1. [INFO] library_id column already exists")

        # Add description column
        if "description" not in existing_columns:
            print("\n2. Adding description column to series...")
            cursor.execute("""
                ALTER TABLE series
                ADD COLUMN description TEXT
            """)
            print("   [OK] description column added")
        else:
            print("\n2. [INFO] description column already exists")

        # Add publication_status column
        if "publication_status" not in existing_columns:
            print("\n3. Adding publication_status column to series...")
            cursor.execute("""
                ALTER TABLE series
                ADD COLUMN publication_status TEXT DEFAULT 'in_progress'
            """)
            print("   [OK] publication_status column added")
        else:
            print("\n3. [INFO] publication_status column already exists")

        # Add custom_cover_path column
        if "custom_cover_path" not in existing_columns:
            print("\n4. Adding custom_cover_path column to series...")
            cursor.execute("""
                ALTER TABLE series
                ADD COLUMN custom_cover_path TEXT
            """)
            print("   [OK] custom_cover_path column added")
        else:
            print("\n4. [INFO] custom_cover_path column already exists")

        conn.commit()

        # Verify changes
        print("\n5. Verifying migration...")
        cursor.execute("PRAGMA table_info(series)")
        columns = {col[1] for col in cursor.fetchall()}

        required = {"library_id", "description", "publication_status", "custom_cover_path"}
        missing = required - columns
        if missing:
            raise AssertionError(f"Missing columns: {missing}")

        print("   [OK] All columns verified")

        conn.close()

        print("\n[SUCCESS] Migration completed successfully!")
        print(f"   Backup: {backup_path}")
        print("\n[WARNING] Series table now requires library_id.")
        print("          Existing series records will need library_id populated manually")
        print("          or you can delete the series table and let it be recreated.")
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
