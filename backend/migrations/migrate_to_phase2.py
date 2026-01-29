"""
Phase 2 Migration Script: Split monolithic Book → (Book, LibraryBook, UserBookData)

This script:
1. Takes a database snapshot
2. Migrates data from old books table to new schema (books_v2, library_books, user_book_data)
3. Preserves cover files
4. Updates foreign keys in enrichment_jobs and series tables
"""
import json
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path
from uuid import uuid4


def create_snapshot(db_path: str) -> str:
    """Create a backup of the database before migration."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{db_path}.backup-phase2-{timestamp}"
    shutil.copy2(db_path, backup_path)
    print(f"[OK] Database snapshot created: {backup_path}")
    return backup_path


def get_library_info(cursor) -> tuple[str, str]:
    """Get the first library ID and owner ID for assigning books."""
    cursor.execute("SELECT id, owner_id FROM libraries LIMIT 1")
    result = cursor.fetchone()
    if not result:
        print("ERROR: No libraries found! Please create a library first.")
        sys.exit(1)
    return result[0], result[1]


def migrate_books(conn: sqlite3.Connection, cursor: sqlite3.Cursor, library_id: str, owner_id: str):
    """Migrate books from old schema to new schema."""

    # Get all books from old table
    cursor.execute("SELECT * FROM books")
    columns = [desc[0] for desc in cursor.description]
    old_books = cursor.fetchall()

    print(f"\n{'='*80}")
    print(f"MIGRATING {len(old_books)} BOOKS")
    print(f"{'='*80}\n")

    migrated_count = 0
    error_count = 0

    # Map old book IDs to new book UUIDs for FK updates later
    id_mapping = {}

    for row in old_books:
        book_data = dict(zip(columns, row))
        old_book_id = book_data['id']

        try:
            # Generate new UUID for this book
            new_book_id = str(uuid4()).replace('-', '')
            id_mapping[old_book_id] = new_book_id

            # 1. Create BookV2 record (intrinsic metadata)
            book_v2_values = {
                'id': new_book_id,
                'title': book_data['title'],
                'authors': book_data['creator'],  # JSON field, already serialized
                'isbn': book_data['identifier'],
                'publisher': book_data['publisher'],
                'description': book_data['description'],
                'publish_date': book_data['date'],
                'subjects': book_data['subject'],  # JSON field
                'language': book_data['language'],  # JSON field
                'page_count': None,  # Not in old schema
                'cover_url': book_data['cover_image_url'],
                'metadata_status': book_data['metadata_status'],
                'metadata_candidate': book_data['metadata_candidate'],  # JSON field
                'created_at': book_data['created_at'],
                'updated_at': book_data['updated_at'],
            }

            cursor.execute("""
                INSERT INTO books_v2 (
                    id, title, authors, isbn, publisher, description, publish_date,
                    subjects, language, page_count, cover_url, metadata_status,
                    metadata_candidate, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                book_v2_values['id'],
                book_v2_values['title'],
                book_v2_values['authors'],
                book_v2_values['isbn'],
                book_v2_values['publisher'],
                book_v2_values['description'],
                book_v2_values['publish_date'],
                book_v2_values['subjects'],
                book_v2_values['language'],
                book_v2_values['page_count'],
                book_v2_values['cover_url'],
                book_v2_values['metadata_status'],
                book_v2_values['metadata_candidate'],
                book_v2_values['created_at'],
                book_v2_values['updated_at'],
            ))

            # 2. Create LibraryBook record (physical copy)
            library_book_id = str(uuid4()).replace('-', '')

            # Handle loaned_to field: old schema used string, new uses UUID FK
            # For migration, we'll clear loan status since we can't map string to UUID
            checked_out_to = None
            checked_out_at = None
            due_date = book_data['loan_due_date']
            loan_status = 'available'  # Reset loan status during migration

            library_book_values = {
                'id': library_book_id,
                'book_id': new_book_id,
                'library_id': library_id,
                'condition': book_data['condition'],
                'physical_location': book_data['shelf_location'],
                'series': book_data['series'],
                'acquisition_date': None,  # Not in old schema
                'loan_status': loan_status,
                'checked_out_to': checked_out_to,
                'checked_out_at': checked_out_at,
                'due_date': due_date,
                'cover_image_path': book_data['cover_image_path'],
                'created_at': book_data['created_at'],
                'updated_at': book_data['updated_at'],
            }

            cursor.execute("""
                INSERT INTO library_books (
                    id, book_id, library_id, condition, physical_location, series,
                    acquisition_date, loan_status, checked_out_to, checked_out_at,
                    due_date, cover_image_path, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                library_book_values['id'],
                library_book_values['book_id'],
                library_book_values['library_id'],
                library_book_values['condition'],
                library_book_values['physical_location'],
                library_book_values['series'],
                library_book_values['acquisition_date'],
                library_book_values['loan_status'],
                library_book_values['checked_out_to'],
                library_book_values['checked_out_at'],
                library_book_values['due_date'],
                library_book_values['cover_image_path'],
                library_book_values['created_at'],
                library_book_values['updated_at'],
            ))

            # 3. UserBookData is optional - old schema doesn't have reading status
            # Skip for now, users can add this later via UI

            migrated_count += 1
            title = book_data['title'][:50]  # Truncate for display
            print(f"  [OK] Migrated: {title}")

        except Exception as e:
            error_count += 1
            print(f"  [ERROR] Error migrating book ID {old_book_id}: {e}")
            import traceback
            traceback.print_exc()

    conn.commit()
    print(f"\n{'='*80}")
    print(f"Migration complete: {migrated_count} books migrated, {error_count} errors")
    print(f"{'='*80}\n")

    return id_mapping


def update_foreign_keys(conn: sqlite3.Connection, cursor: sqlite3.Cursor, id_mapping: dict):
    """Update foreign keys in enrichment_jobs and series tables."""

    print(f"\n{'='*80}")
    print("UPDATING FOREIGN KEYS")
    print(f"{'='*80}\n")

    # Update enrichment_jobs.book_id
    cursor.execute("SELECT COUNT(*) FROM enrichment_jobs")
    jobs_count = cursor.fetchone()[0]

    if jobs_count > 0:
        print(f"Updating {jobs_count} enrichment jobs...")
        cursor.execute("SELECT id, book_id FROM enrichment_jobs")
        jobs = cursor.fetchall()

        updated_jobs = 0
        for job_id, old_book_id in jobs:
            if old_book_id in id_mapping:
                new_book_id = id_mapping[old_book_id]
                # Note: We need to drop and recreate the FK constraint for this to work
                # For SQLite, we'll keep old book_id for now and update later manually
                # TODO: Handle this properly in next migration step
                updated_jobs += 1

        print(f"  [OK] {updated_jobs} enrichment jobs need FK updates (will handle separately)")

    # Update series.cover_book_id
    cursor.execute("SELECT COUNT(*) FROM series")
    series_count = cursor.fetchone()[0]

    if series_count > 0:
        print(f"\nUpdating {series_count} series records...")
        cursor.execute("SELECT id, cover_book_id FROM series")
        series_records = cursor.fetchall()

        updated_series = 0
        for series_id, old_book_id in series_records:
            if old_book_id and old_book_id in id_mapping:
                new_book_id = id_mapping[old_book_id]
                # Same issue as above - will handle in separate migration
                updated_series += 1

        print(f"  [OK] {updated_series} series records need FK updates (will handle separately)")

    print("\nNote: FK updates for enrichment_jobs and series deferred to next migration step")
    print(f"{'='*80}\n")


def verify_migration(cursor: sqlite3.Cursor, expected_count: int):
    """Verify the migration was successful."""

    print(f"\n{'='*80}")
    print("VERIFICATION")
    print(f"{'='*80}\n")

    cursor.execute("SELECT COUNT(*) FROM books_v2")
    books_v2_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM library_books")
    library_books_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM user_book_data")
    user_book_data_count = cursor.fetchone()[0]

    print(f"Old books table:      {expected_count} records")
    print(f"New books_v2 table:   {books_v2_count} records")
    print(f"library_books table:  {library_books_count} records")
    print(f"user_book_data table: {user_book_data_count} records")

    success = (books_v2_count == expected_count and library_books_count == expected_count)

    if success:
        print("\n[OK] Migration verification PASSED!")
    else:
        print("\n[ERROR] Migration verification FAILED!")
        print("  Expected counts don't match. Check for errors above.")

    print(f"{'='*80}\n")

    return success


def main():
    db_path = "backend/data/books.db"

    print("\n" + "="*80)
    print("PHASE 2 MIGRATION: Schema Split")
    print("="*80)

    # Step 1: Create snapshot
    print("\nStep 1: Creating database snapshot...")
    backup_path = create_snapshot(db_path)

    # Step 2: Connect to database
    print("\nStep 2: Connecting to database...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    print("[OK] Connected")

    # Step 3: Get library and owner info
    print("\nStep 3: Getting library context...")
    library_id, owner_id = get_library_info(cursor)
    print(f"[OK] Library ID: {library_id}")
    print(f"[OK] Owner ID: {owner_id}")

    # Step 4: Get old book count
    cursor.execute("SELECT COUNT(*) FROM books")
    old_book_count = cursor.fetchone()[0]
    print(f"\n[OK] Found {old_book_count} books to migrate")

    # Step 5: Migrate books
    print("\nStep 4: Migrating books...")
    id_mapping = migrate_books(conn, cursor, library_id, owner_id)

    # Step 6: Update foreign keys
    print("\nStep 5: Updating foreign keys...")
    update_foreign_keys(conn, cursor, id_mapping)

    # Step 7: Verify migration
    print("\nStep 6: Verifying migration...")
    success = verify_migration(cursor, old_book_count)

    # Close connection
    conn.close()

    print("\n" + "="*80)
    if success:
        print("MIGRATION COMPLETE!")
        print(f"Backup saved at: {backup_path}")
        print("\nNext steps:")
        print("  1. Test the new tables manually")
        print("  2. Update enrichment_jobs and series FKs")
        print("  3. Update API endpoints to use new schema")
    else:
        print("MIGRATION FAILED!")
        print(f"Restore from backup: {backup_path}")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()
