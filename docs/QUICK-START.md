# Quick Start Guide for AI Assistants

This guide helps AI assistants quickly understand and work with this codebase.

## Architecture Overview

This is a **multi-user library management system** built with:
- **Frontend:** React 18 + TypeScript + Material-UI + Vite
- **Backend:** FastAPI + SQLModel + SQLite + async/await
- **Database:** SQLite with three-tier data model

## Key Concepts

### Three-Tier Data Model
Read [data-model.md](./data-model.md) for full details.

1. **BookV2** (`books_v2` table) - Intrinsic book metadata (ISBN, title, author, etc.)
2. **LibraryBook** (`library_books` table) - Physical copy data per library (ownership, condition, location)
3. **UserBookData** (`user_book_data` table) - Personal reading data per user (status, grade, notes)

### User Flow
1. User logs in → selects a library
2. Books are displayed with data from all three tiers merged
3. Each user sees their personal data only
4. Library-level data is shared among all library members

## Project Structure

```
library/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints/  # API route handlers
│   │   │   ├── schemas/    # Pydantic response models
│   │   │   └── utils/      # Auth, permissions, helpers
│   │   ├── models/         # SQLModel database models
│   │   ├── services/       # Business logic (enrichment, metadata)
│   │   └── main.py        # FastAPI application
│   ├── data/
│   │   ├── books.db       # SQLite database
│   │   └── covers/        # Uploaded cover images
│   └── migrations/        # Database migration scripts
├── frontend/
│   └── src/
│       ├── api/           # API client functions
│       ├── components/    # Reusable React components
│       ├── contexts/      # React context providers
│       ├── pages/         # Page components
│       └── types/         # TypeScript interfaces
└── docs/                  # Documentation (you are here)
```

## Common Tasks

### Adding a New Field

**Decision Tree:**
1. Is it intrinsic to the book? → Add to `BookV2`
2. Is it library-specific? → Add to `LibraryBook`
3. Is it user-specific? → Add to `UserBookData`

**Steps:**
1. Update backend model in `backend/app/models/<model_name>.py`
2. Create migration script in `backend/migrations/`
3. Run migration: `cd backend && python migrations/<script>.py`
4. Restart backend to reload schema
5. Update TypeScript types in `frontend/src/types/book.ts`
6. Update API mapping in `frontend/src/api/books.ts`
7. Add UI fields in `frontend/src/pages/books/BookFormDialog.tsx`
8. Display in `frontend/src/pages/books/BookViewTab.tsx`

### Running the Application

**Backend:**
```bash
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Access at: `http://localhost:5173`

### Database Migrations

See [data-model.md](./data-model.md#database-migrations) for template and process.

**Important:**
- Always backup database first
- Test on a copy
- Restart backend after migration
- Use `attributes.flag_modified()` for JSON field updates

### Testing

**Backend:**
```bash
cd backend
pytest
```

**Frontend:**
```bash
cd frontend
npm test
```

## Important Notes

### SQLAlchemy JSON Fields

When updating JSON/array fields, you MUST use `flag_modified`:

```python
from sqlalchemy.orm import attributes

# DON'T do this (won't save):
record.json_field.append(value)  # ❌

# DO this instead:
new_list = record.json_field or []
new_list.append(value)
record.json_field = new_list
attributes.flag_modified(record, "json_field")  # ✅
await session.commit()
```

### React useEffect Dependencies

Avoid putting mutation objects in dependency arrays:

```typescript
// ❌ This causes infinite loop
useEffect(() => {
  mutation.mutate();
}, [mutation]);

// ✅ Use this instead
useEffect(() => {
  mutation.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [otherDependencies]);
```

### Authentication

- JWT tokens stored in localStorage
- Backend validates on every request
- Login endpoint: `POST /api/auth/login`
- Protected routes: All `/api/libraries/*` endpoints

### Permissions

- **Owner:** Full control of library
- **Editor:** Can add/edit/delete books
- **Viewer:** Read-only access

Check: `backend/app/api/utils/library_access.py`

## Recent Changes (November 2024)

**New Fields:**
- `LibraryBook.ownership_status` - "Wanted", "Owned", "To Check"
- `LibraryBook.library_notes` - Shared notes for all library members
- `UserBookData.grade` - 1-10 rating (renamed from personal_rating)
- `UserBookData.completion_history` - Array of completion dates

**Bug Fixes:**
- Completion history increment (needed flag_modified)
- BookFormDialog infinite loop (removed mutation from deps)

## API Endpoints

### Books
- `GET /api/libraries/{library_id}/books` - List books
- `POST /api/libraries/{library_id}/books` - Create book
- `GET /api/libraries/{library_id}/books/{book_id}` - Get book details
- `PUT /api/libraries/{library_id}/books/{book_id}` - Update book
- `DELETE /api/libraries/{library_id}/books/{book_id}` - Delete book
- `POST /api/libraries/{library_id}/books/{book_id}/finish` - Mark as finished reading

### Libraries
- `GET /api/libraries` - List user's libraries
- `POST /api/libraries` - Create library
- `PUT /api/libraries/{library_id}` - Update library
- `DELETE /api/libraries/{library_id}` - Delete library

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

## Debugging Tips

### Backend Errors

1. Check backend logs in terminal
2. Look for SQLAlchemy errors (often schema mismatches)
3. Verify database has expected columns:
   ```bash
   cd backend
   python -c "import sqlite3; conn = sqlite3.connect('data/books.db'); cursor = conn.cursor(); cursor.execute('PRAGMA table_info(table_name)'); print(cursor.fetchall())"
   ```

### Frontend Errors

1. Check browser console
2. Look for 500 errors (backend issue)
3. Check Network tab for API responses
4. Verify token is valid (check localStorage)

### Common Issues

**500 Error on Books List:**
- Backend schema doesn't match database
- Restart backend server
- Check migration was run

**Infinite Loop:**
- Check useEffect dependencies
- Remove mutation/function objects from deps

**Field Not Saving:**
- For JSON fields, use `flag_modified()`
- Check migration added the column
- Restart backend to reload schema

## Useful Commands

```bash
# Check database schema
cd backend
python -c "import sqlite3; conn = sqlite3.connect('data/books.db'); cursor = conn.cursor(); cursor.execute('.schema user_book_data'); print(cursor.fetchall())"

# List all migrations
ls backend/migrations/

# Check git status
git status

# Run backend tests
cd backend && pytest

# Run frontend tests
cd frontend && npm test

# Build for production
cd frontend && npm run build
```

## Documentation

- [Architecture Overview](./architecture.md) - System architecture
- [Data Model](./data-model.md) - Database schema and migrations
- [Testing Guides](../TESTING-*.md) - Feature testing documentation

## Need Help?

1. Check existing documentation in `/docs`
2. Look at recent commits for similar changes
3. Check test files for usage examples
4. Review similar models/components
