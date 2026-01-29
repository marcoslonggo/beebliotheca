"""Phase 2 follow-up migration: align enrichment_jobs and series tables with books_v2 IDs.

- creates a fresh database snapshot
- rebuilds enrichment_jobs with CHAR(32) book_id referencing books_v2
- rebuilds series table so cover_book_id points at books_v2
- drops orphaned enrichment jobs that referenced deleted legacy books
"""
from __future__ import annotations

import shutil
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Dict

DB_PATH = Path("backend/data/books.db")


def create_snapshot(db_path: Path) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.with_name(f"{db_path.name}.backup-phase2-fk-{timestamp}")
    shutil.copy2(db_path, backup_path)
    print(f"[OK] Snapshot created at {backup_path}")
    return backup_path


def fetch_book_mapping(cursor: sqlite3.Cursor) -> Dict[int, str]:
    mapping: Dict[int, str] = {}
    cursor.execute(
        """
        SELECT b.id, b.identifier, bv.id
        FROM books AS b
        JOIN books_v2 AS bv
          ON b.identifier = bv.isbn
        """
    )
    rows = cursor.fetchall()
    for legacy_id, identifier, new_id in rows:
        mapping[legacy_id] = new_id
    print(f"[OK] Loaded {len(mapping)} legacy->BookV2 mappings")
    return mapping


def drop_orphan_enrichment_jobs(cursor: sqlite3.Cursor, valid_ids: set[int]) -> int:
    cursor.execute("SELECT id, book_id FROM enrichment_jobs")
    rows = cursor.fetchall()
    orphan_ids = [row_id for row_id, book_id in rows if book_id not in valid_ids]
    if orphan_ids:
        cursor.executemany(
            "DELETE FROM enrichment_jobs WHERE id = ?",
            [(row_id,) for row_id in orphan_ids],
        )
        print(f"[WARN] Deleted {len(orphan_ids)} orphan enrichment jobs referencing removed books")
    else:
        print("[OK] No orphan enrichment jobs detected")
    return len(orphan_ids)


def rebuild_enrichment_jobs(cursor: sqlite3.Cursor) -> None:
    print("[STEP] Rebuilding enrichment_jobs with BookV2 identifiers")
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS enrichment_jobs_new (
            id INTEGER PRIMARY KEY,
            book_id CHAR(32) NOT NULL,
            identifier VARCHAR NOT NULL,
            provider VARCHAR NOT NULL DEFAULT 'openlibrary',
            status VARCHAR NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error VARCHAR,
            scheduled_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )
        """
    )

    cursor.execute(
        """
        INSERT INTO enrichment_jobs_new (
            id, book_id, identifier, provider, status, attempts, last_error,
            scheduled_at, updated_at
        )
        SELECT
            ej.id,
            (
                SELECT bv.id
                FROM books AS b
                JOIN books_v2 AS bv ON b.identifier = bv.isbn
                WHERE b.id = ej.book_id
            ) AS new_book_id,
            ej.identifier,
            ej.provider,
            ej.status,
            ej.attempts,
            ej.last_error,
            ej.scheduled_at,
            ej.updated_at
        FROM enrichment_jobs AS ej
        WHERE EXISTS (
            SELECT 1 FROM books WHERE books.id = ej.book_id
        )
        """
    )

    cursor.execute("SELECT COUNT(*) FROM enrichment_jobs_new WHERE book_id IS NULL")
    missing = cursor.fetchone()[0]
    if missing:
        raise RuntimeError(f"{missing} enrichment jobs failed to map to books_v2 IDs")

    cursor.execute("DROP TABLE enrichment_jobs")
    cursor.execute("ALTER TABLE enrichment_jobs_new RENAME TO enrichment_jobs")
    print("[OK] enrichment_jobs rebuilt")


def rebuild_series(cursor: sqlite3.Cursor) -> None:
    print("[STEP] Rebuilding series table with BookV2 cover reference")
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS series_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR NOT NULL UNIQUE,
            cover_book_id CHAR(32),
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )
        """
    )

    cursor.execute(
        """
        INSERT INTO series_new (
            id, name, cover_book_id, created_at, updated_at
        )
        SELECT
            s.id,
            s.name,
            (
                SELECT bv.id
                FROM books AS b
                JOIN books_v2 AS bv ON b.identifier = bv.isbn
                WHERE b.id = s.cover_book_id
            ) AS new_cover_book_id,
            s.created_at,
            s.updated_at
        FROM series AS s
        """
    )

    cursor.execute("DROP TABLE series")
    cursor.execute("ALTER TABLE series_new RENAME TO series")
    print("[OK] series rebuilt")


def main() -> None:
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found: {DB_PATH}")

    backup_path = create_snapshot(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        mapping = fetch_book_mapping(cursor)
        valid_ids = set(mapping.keys())
        drop_orphan_enrichment_jobs(cursor, valid_ids)
        conn.commit()

        cursor.execute("PRAGMA foreign_keys = OFF")
        conn.execute("BEGIN IMMEDIATE")
        rebuild_enrichment_jobs(cursor)
        rebuild_series(cursor)
        conn.commit()
        cursor.execute("PRAGMA foreign_keys = ON")
        print("[DONE] Foreign key alignment complete")
    except Exception:
        conn.rollback()
        print("[FAIL] Rolling back to snapshot")
        shutil.copy2(backup_path, DB_PATH)
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
