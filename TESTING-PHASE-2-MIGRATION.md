# Phase 2 Migration - Testing Guide

## What Was Completed

✅ **Database Schema Migration**:
- Created 3 new tables: `books_v2`, `library_books`, `user_book_data`
- Migrated 8 books from old monolithic schema to new split schema
- Created database backup: `backend/data/books.db.backup-phase2-20251103_182022`

⚠️ **What's NOT Done Yet**:
- API endpoints still use old schema (will break after we update them)
- Frontend still uses old schema
- Foreign keys in `enrichment_jobs` and `series` tables not updated yet

## Testing Checklist

### 1. Verify Database Backup Exists

**Check the backup file was created:**

```bash
# Windows
dir backend\data\books.db.backup-*

# Should show a file like:
# books.db.backup-phase2-20251103_182022
```

✅ **Expected**: Backup file exists in `backend/data/` directory

---

### 2. Verify New Tables Were Created

**Run the table verification script:**

```bash
backend/.venv/Scripts/python.exe backend/check_new_tables.py
```

✅ **Expected Output**:
```
EXISTING TABLES IN DATABASE
================================================================================

books         (old table - still exists)
books_v2      (NEW - intrinsic metadata)
library_books (NEW - physical copies)
user_book_data (NEW - personal reading data)
enrichment_jobs
libraries
library_members
series
users

CHECKING FOR NEW PHASE 2 TABLES
================================================================================
books_v2 - CREATED
library_books - CREATED
user_book_data - CREATED
```

---

### 3. Verify Data Migration

**Run the migration verification script:**

```bash
backend/.venv/Scripts/python.exe backend/verify_migration.py
```

✅ **Expected Output**:
```
MIGRATION DATA VERIFICATION
================================================================================

1. Sample from books_v2 (intrinsic metadata):
  Title: Sapiens
  Authors: ["Yuval Noah Harari"]
  ISBN: 9780062316110
  Publisher: Harper Perennial
  ID: [UUID]

2. Sample from library_books (physical copy):
  Book ID: [UUID - matches above]
  Library ID: [Your library UUID]
  Condition: None
  Physical Location: None
  Series: None
  Loan Status: available
  Cover Path: None

3. Original old book (for comparison):
  Title: Sapiens
  Creator (now authors): ["Yuval Noah Harari"]
  Identifier (now isbn): 9780062316110

RECORD COUNTS
================================================================================
Old books table:      8 records
New books_v2 table:   8 records
library_books table:  8 records
user_book_data table: 0 records

[OK] Verification complete - data looks correct!
```

✅ **Verify**:
- Record counts match (8 books in old table = 8 in new tables)
- Authors field was mapped correctly (creator → authors)
- ISBN field was mapped correctly (identifier → isbn)
- All books assigned to your library

---

### 4. Manual Database Inspection

**Option A: Using DB Browser for SQLite (Recommended)**

1. Download [DB Browser for SQLite](https://sqlitebrowser.org/) if you don't have it
2. Open `backend/data/books.db`
3. Go to "Browse Data" tab

**Check `books_v2` table:**
- Should have 8 records
- Each record has: id (UUID), title, authors (JSON), isbn, publisher, etc.
- Click on an authors field → should see JSON array like `["Author Name"]`

**Check `library_books` table:**
- Should have 8 records
- Each record links a book_id to your library_id
- Has fields: condition, physical_location, series, loan_status, cover_image_path

**Check `user_book_data` table:**
- Should have 0 records (we haven't added personal reading data yet)
- This is correct - users will add reading status later

**Option B: Using Python Script**

```bash
# View all books in new schema
backend/.venv/Scripts/python.exe -c "import sqlite3; conn = sqlite3.connect('backend/data/books.db'); cursor = conn.cursor(); cursor.execute('SELECT title, authors, isbn FROM books_v2'); [print(f'{row[0]} by {row[1]}') for row in cursor.fetchall()]; conn.close()"
```

---

### 5. Verify Old Data Is Still Intact

**Important**: The old `books` table should still exist and be unchanged (for rollback).

```bash
backend/.venv/Scripts/python.exe -c "import sqlite3; conn = sqlite3.connect('backend/data/books.db'); cursor = conn.cursor(); cursor.execute('SELECT COUNT(*) FROM books'); print(f'Old books table still has {cursor.fetchone()[0]} records'); conn.close()"
```

✅ **Expected**: `Old books table still has 8 records`

---

### 6. Test Current UI Still Works

**IMPORTANT**: Since we haven't updated the API endpoints yet, the current UI should still work normally.

1. **Start the backend** (if not already running):
   ```bash
   backend/.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend
   ```

2. **Start the frontend** (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open the app**: http://localhost:5173

4. **Test these features** (they should all still work):
   - ✅ Login to the app
   - ✅ Navigate to Books page
   - ✅ See all 8 books listed
   - ✅ Search for a book
   - ✅ View book details
   - ✅ Edit a book (change title or description)
   - ✅ The old API endpoints are still working with the old schema

⚠️ **Why It Still Works**: The API endpoints haven't been updated yet - they're still reading from the old `books` table. This is intentional so you can test the migration before breaking things.

---

### 7. Check Schema Differences

**Compare old vs new schema structure:**

**Old Schema (Monolithic)**:
```
books table:
  - id (INTEGER)
  - title, creator, subject, description (metadata)
  - condition, shelf_location, series (physical)
  - loan_status, loaned_to (loan tracking)
  - cover_image_path (local cover)
  - metadata_status, metadata_candidate (enrichment)
```

**New Schema (Split)**:
```
books_v2 table (intrinsic):
  - id (UUID)
  - title, authors, isbn, publisher (metadata)
  - metadata_status, metadata_candidate (enrichment)

library_books table (physical):
  - id (UUID), book_id (FK), library_id (FK)
  - condition, physical_location, series
  - loan_status, checked_out_to, due_date
  - cover_image_path (local cover)

user_book_data table (personal):
  - id (UUID), book_id (FK), user_id (FK), library_id (FK)
  - reading_status, progress_pages, progress_percent
  - personal_rating, personal_notes, is_favorite
```

✅ **Verify**: Data has been correctly split into appropriate tables

---

### 8. Test Rollback (Optional - Only If Needed)

**If something is wrong, you can rollback:**

⚠️ **WARNING**: This will delete the migrated data and restore from backup.

```bash
# Stop the backend server first (Ctrl+C)

# Restore from backup
copy backend\data\books.db.backup-phase2-20251103_182022 backend\data\books.db

# Restart server
backend/.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend
```

**Only do this if you find issues!**

---

## Success Criteria

Before proceeding to API endpoint updates, verify:

- [ ] ✅ Database backup exists
- [ ] ✅ All 3 new tables created (books_v2, library_books, user_book_data)
- [ ] ✅ 8 books migrated to books_v2
- [ ] ✅ 8 library_books records created
- [ ] ✅ Data looks correct (authors, ISBN, etc.)
- [ ] ✅ Old books table still intact (8 records)
- [ ] ✅ Current UI still works with old API endpoints
- [ ] ✅ Book IDs are UUIDs in new tables (not integers)
- [ ] ✅ All books assigned to your library ("Casa")

---

## Known Issues / Expected Behavior

✅ **These are NORMAL and expected:**

1. **user_book_data table is empty** - This is correct. Users haven't added reading status yet.

2. **enrichment_jobs still references old book IDs** - We'll fix this in the next step.

3. **series table still references old book IDs** - We'll fix this in the next step.

4. **UI still shows old data** - Because API endpoints haven't been updated yet.

5. **Loan status reset to "available"** - The old `loaned_to` field was a string, new schema uses UUID foreign key to users table. We couldn't migrate loan data automatically.

---

## Next Steps After Testing

Once you confirm everything above looks good:

1. ✅ Mark this phase as tested
2. 🔄 Update API endpoints to use new schema
3. 🔄 Update frontend to use new book structure
4. 🔄 Fix foreign keys in enrichment_jobs and series tables
5. 🔄 Test end-to-end with new schema

---

## Troubleshooting

**Problem**: Migration verification shows wrong counts

**Solution**: Check the migration script output for errors. If there were errors, restore from backup and investigate.

---

**Problem**: New tables don't exist

**Solution**: The server needs to be restarted after adding new models. Run:
```bash
backend/.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend
```

---

**Problem**: Current UI doesn't work

**Solution**: Make sure backend is running and check for console errors. The old API endpoints should still work since we haven't changed them yet.

---

## Files Created During This Phase

- `backend/app/models/book_v2.py` - New Book model (intrinsic metadata)
- `backend/app/models/library_book.py` - LibraryBook model (physical copies)
- `backend/app/models/user_book_data.py` - UserBookData model (personal reading data)
- `backend/migrations/migrate_to_phase2.py` - Migration script
- `backend/data/books.db.backup-phase2-20251103_182022` - Database backup
- `backend/check_new_tables.py` - Table verification script
- `backend/check_migration_context.py` - Migration context checker
- `backend/verify_migration.py` - Data verification script
- `TESTING-PHASE-2-MIGRATION.md` - This testing guide

---

## Quick Test Commands

```bash
# 1. Verify tables exist
backend/.venv/Scripts/python.exe backend/check_new_tables.py

# 2. Verify data migrated correctly
backend/.venv/Scripts/python.exe backend/verify_migration.py

# 3. Count records
backend/.venv/Scripts/python.exe -c "import sqlite3; conn = sqlite3.connect('backend/data/books.db'); cursor = conn.cursor(); cursor.execute('SELECT COUNT(*) FROM books'); print(f'Old: {cursor.fetchone()[0]}'); cursor.execute('SELECT COUNT(*) FROM books_v2'); print(f'New: {cursor.fetchone()[0]}'); conn.close()"

# 4. Check backup exists
dir backend\data\books.db.backup-*
```

**All commands should run without errors and show matching counts (8 books).**
