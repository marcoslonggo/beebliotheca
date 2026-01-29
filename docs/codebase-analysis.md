# Existing Codebase Analysis

## Executive Summary

This document analyzes the existing library management system codebase to inform the multi-user architecture migration. **Key finding**: The system has a working single-user implementation with several features that must be preserved and migrated, not rebuilt from scratch.

---

## Current Database Schema

### Books Table (Monolithic Design)

**File**: `backend/app/models/book.py`

```python
class Book(SQLModel, table=True):
    # Primary Key
    id: int (primary key)
    created_at: datetime
    updated_at: datetime

    # INTRINSIC METADATA (should move to new Book table)
    title: str (indexed)
    creator: list[str] | None (JSON)
    subject: list[str] | None (JSON)
    description: str | None
    publisher: str | None
    contributor: list[str] | None (JSON)
    date: str | None
    type: str | None
    format: str | None
    identifier: str (indexed, ISBN)
    source: str | None
    language: list[str] | None (JSON)
    relation: list[str] | None (JSON)
    coverage: str | None
    rights: str | None
    auxiliary_fields: dict | None (JSON)

    # LIBRARY/PHYSICAL DATA (should move to LibraryBook)
    condition: str | None          # "New, Good, Fair"
    shelf_location: str | None     # Physical location
    loan_status: str               # "available|loaned"
    loaned_to: str | None          # Borrower name
    loan_due_date: datetime | None
    series: str | None             # Series name

    # COVER IMAGES (should move to LibraryBook)
    cover_image_url: str | None    # External URL from metadata
    cover_image_path: str | None   # Local uploaded file path

    # ENRICHMENT DATA (stays with Book or separate)
    metadata_status: str           # "pending|awaiting_review|complete|failed"
    metadata_candidate: dict | None (JSON)
```

**Current Design Issues**:
- ❌ Mixes intrinsic and library-specific data
- ❌ No multi-user support
- ❌ No concept of libraries/tenants
- ❌ One physical copy per book (can't have same book in multiple libraries)

---

### Series Table (Already Exists!)

**File**: `backend/app/models/series.py`

```python
class Series(SQLModel, table=True):
    id: int (primary key)
    name: str (unique, indexed)      # Series name
    cover_book_id: int | None        # FK to books.id
    created_at: datetime
    updated_at: datetime
```

**Key Feature**: Series management is already implemented with:
- Separate Series table
- Books have `series` field (string name)
- API endpoints for CRUD operations
- Frontend UI for series grouping

**Migration Impact**:
- ✅ Series table can stay mostly unchanged
- ⚠️ `cover_book_id` FK needs to be updated when Book split happens
- ⚠️ `Book.series` field moves to `LibraryBook.series`

---

### EnrichmentJob Table

**File**: `backend/app/models/enrichment.py`

```python
class EnrichmentJob(SQLModel, table=True):
    id: int (primary key)
    book_id: int              # FK to books.id
    identifier: str           # ISBN for lookup
    provider: str             # "openlibrary"
    status: str               # "pending|in_progress|complete|failed|awaiting_review"
    attempts: int
    last_error: str | None
    scheduled_at: datetime
    updated_at: datetime
```

**Migration Impact**:
- ⚠️ `book_id` FK needs to be updated to new Book table
- ✅ Enrichment logic can stay mostly unchanged
- ✅ Still enriches intrinsic book metadata only

---

## Current API Endpoints

### Books Endpoints (`/api/books`)

| Method | Endpoint | Current Behavior | Migration Impact |
|--------|----------|------------------|------------------|
| POST | `/books` | Create new book | ⚠️ Needs to create Book + LibraryBook |
| GET | `/books` | List all books | 🔴 Breaking: needs library context |
| GET | `/books?q=search` | Search books | 🔴 Breaking: needs library filtering |
| GET | `/books/{id}` | Get single book | 🔴 Breaking: needs Book + LibraryBook + UserBookData |
| PATCH | `/books/{id}` | Update book | 🔴 Breaking: update different tables based on field |
| DELETE | `/books/{id}` | Delete book + cover file | 🔴 Breaking: delete LibraryBook, maybe not Book |
| POST | `/books/{id}/cover` | Upload cover image | ⚠️ Update LibraryBook.cover_image_path |

**Frontend Dependencies**:
- BooksPage.tsx calls all these endpoints
- Expects flat Book structure with all fields
- DataGrid renders directly from API response
- Edit dialog expects all fields in one object

---

### Series Endpoints (`/api/series`)

| Method | Endpoint | Current Behavior | Migration Impact |
|--------|----------|------------------|------------------|
| GET | `/series` | List all series | ⚠️ Minor: query LibraryBook.series instead |
| GET | `/series/{id}` | Get series | ✅ No change |
| GET | `/series/{id}/books` | Get books in series | ⚠️ Query LibraryBook instead of Book |
| POST | `/series` | Create series | ✅ No change |
| PATCH | `/series/{id}` | Update series | ✅ Mostly unchanged |
| DELETE | `/series/{id}` | Delete series | ⚠️ Update LibraryBook.series field |

---

### Enrichment Endpoints (`/api/enrichment`)

| Method | Endpoint | Current Behavior | Migration Impact |
|--------|----------|------------------|------------------|
| POST | `/enrichment/books/{id}` | Enrich book metadata | ⚠️ Minor: update Book (intrinsic) only |
| POST | `/enrichment/jobs/{id}` | Process specific job | ✅ Minimal change |
| GET | `/enrichment/books/{id}/candidate` | Get metadata candidate | ⚠️ Query Book, not LibraryBook |
| POST | `/enrichment/books/{id}/candidate/apply` | Apply metadata | ⚠️ Update Book (intrinsic) |
| POST | `/enrichment/books/{id}/candidate/reject` | Reject metadata | ⚠️ Update Book.metadata_status |

---

## Current Features Analysis

### ✅ Working Features (Must Preserve)

#### 1. Book CRUD
- **Location**: `backend/app/api/endpoints/books.py`
- **Complexity**: High - touches all fields
- **Dependencies**:
  - Frontend DataGrid
  - BookFormDialog
  - All pages
- **Migration Strategy**: Adapter pattern to translate between old/new schemas

#### 2. Cover Image Upload
- **Location**: `backend/app/api/endpoints/books.py:152`
- **Storage**: `backend/data/covers/` directory
- **Process**:
  1. Validate image file
  2. Delete old cover if exists
  3. Save with UUID filename
  4. Update `Book.cover_image_path`
- **Migration Strategy**: Move to `LibraryBook.cover_image_path`

#### 3. Series Management
- **Location**: `backend/app/api/endpoints/series.py`
- **Features**:
  - Auto-discover series from books
  - Series CRUD operations
  - Assign cover book to series
  - Frontend collapsible grouping
- **Migration Strategy**:
  - Keep Series table
  - Move `Book.series` → `LibraryBook.series`
  - Update FK `cover_book_id` to reference correctly

#### 4. Metadata Enrichment
- **Location**:
  - `backend/app/api/endpoints/enrichment.py`
  - `backend/app/services/enrichment.py`
  - `backend/app/services/metadata.py`
- **Process**:
  1. Create EnrichmentJob
  2. Fetch from OpenLibrary/Google Books
  3. Merge metadata
  4. Compare with current data
  5. If differences → `metadata_status = 'awaiting_review'`
  6. Store in `metadata_candidate`
  7. User reviews and applies selectively
- **Migration Strategy**:
  - Keep working with Book (intrinsic)
  - Update FK to new Book table
  - No major logic changes

#### 5. Search & Filtering
- **Location**: `backend/app/api/endpoints/books.py:56`
- **Searches**:
  - title, identifier, publisher
  - description, series, shelf_location
  - creator (JSON array), subject (JSON array)
- **Migration Strategy**:
  - Search needs to JOIN Book + LibraryBook
  - Filter by library_id
  - Update search fields

#### 6. Loan Tracking
- **Current Fields**:
  - `loan_status`: "available" | "loaned"
  - `loaned_to`: borrower name
  - `loan_due_date`: when due
- **Migration Strategy**:
  - Move entirely to LibraryBook
  - Add `checked_out_to` FK to User table (instead of string)

---

## Current Frontend Structure

### Type Definitions
**File**: `frontend/src/types/book.ts`

```typescript
export interface Book {
  id: number;
  title: string;
  creator?: string[] | null;
  // ... 30+ more fields (intrinsic + library + enrichment)
  condition?: string | null;
  shelf_location?: string | null;
  loan_status: string;
  cover_image_path?: string | null;
  metadata_status: string;
  series?: string | null;
  created_at: string;
  updated_at: string;
}
```

**Frontend Expectations**:
- Flat structure with all fields
- Single API call returns complete book
- No concept of libraries/users
- Direct property access (book.shelf_location, book.loan_status)

### API Calls
**File**: `frontend/src/api/books.ts`

```typescript
export const listBooks = async (params: ListBooksParams): Promise<ListBooksResponse>
export const createBook = async (payload: BookPayload): Promise<Book>
export const updateBook = async (id: number, payload: Partial<BookPayload>): Promise<Book>
export const deleteBook = async (id: number): Promise<void>
export const enrichBook = async (id: number): Promise<Book>
export const uploadBookCover = async (id: number, file: File): Promise<Book>
```

### Pages Using Books
1. **BooksPage.tsx** - Main list with DataGrid
2. **BookFormDialog.tsx** - Create/edit form
3. **BookScannerDialog.tsx** - Barcode scanning
4. **MetadataSearchPanel.tsx** - Enrichment UI
5. **SeriesManagementDialog.tsx** - Series operations

---

## Feature Mapping Matrix

| Current Location | Data Type | New Entity | Migration Action |
|-----------------|-----------|------------|------------------|
| `Book.id` | PK | `Book.id` (new) | Keep as intrinsic ID |
| `Book.title` | Intrinsic | `Book.title` | Move to new Book |
| `Book.creator` | Intrinsic | `Book.authors` | Move to new Book (rename) |
| `Book.identifier` | Intrinsic | `Book.isbn` | Move to new Book (rename) |
| `Book.publisher` | Intrinsic | `Book.publisher` | Move to new Book |
| `Book.description` | Intrinsic | `Book.description` | Move to new Book |
| `Book.cover_image_url` | Intrinsic | `Book.cover_url` | Move to new Book |
| `Book.condition` | Library | `LibraryBook.condition` | Move to LibraryBook |
| `Book.shelf_location` | Library | `LibraryBook.physical_location` | Move to LibraryBook |
| `Book.loan_status` | Library | `LibraryBook.loan_status` | Move to LibraryBook |
| `Book.loaned_to` | Library | `LibraryBook.checked_out_to` | Move to LibraryBook (FK to User) |
| `Book.loan_due_date` | Library | `LibraryBook.due_date` | Move to LibraryBook |
| `Book.cover_image_path` | Library | `LibraryBook.cover_image_path` | Move to LibraryBook |
| `Book.series` | Library | `LibraryBook.series` | Move to LibraryBook |
| `Book.metadata_status` | Enrichment | `Book.metadata_status` | Keep in new Book |
| `Book.metadata_candidate` | Enrichment | `Book.metadata_candidate` | Keep in new Book |
| (NEW) | User | `UserBookData.reading_status` | Create new table |
| (NEW) | User | `UserBookData.progress_pages` | Create new table |
| (NEW) | User | `UserBookData.personal_notes` | Create new table |
| (NEW) | User | `UserBookData.personal_rating` | Create new table |

---

## Critical Dependencies

### Database Level
1. **EnrichmentJob.book_id** → `books.id` (FK constraint)
2. **Series.cover_book_id** → `books.id` (FK constraint)
3. No cascading deletes defined

### API Level
1. All endpoints expect single table queries
2. No JOIN queries currently
3. Direct field access throughout

### Frontend Level
1. React Query keys: `['books']`, `['books', bookId]`
2. DataGrid expects flat array of books
3. Forms expect all fields in single object
4. No concept of library context in state

---

## Migration Challenges

### 🔴 Critical Challenges

1. **API Contract Breaking**
   - Current: `GET /books` returns flat Book[]
   - Future: `GET /libraries/{id}/books` returns Book + LibraryBook + UserBookData
   - **Impact**: All frontend code breaks

2. **Foreign Key Updates**
   - EnrichmentJob.book_id points to old books table
   - Series.cover_book_id points to old books table
   - **Impact**: Must be updated atomically

3. **Search Complexity**
   - Current: Single table search
   - Future: JOIN across Book + LibraryBook with library filtering
   - **Impact**: Query performance and complexity

### ⚠️ Medium Challenges

1. **Cover File Management**
   - Files stored at `data/covers/{uuid}`
   - Currently tied to Book record
   - **Impact**: Need migration script to maintain file paths

2. **Series References**
   - Books reference series by name (string)
   - Series table exists separately
   - **Impact**: Maintain consistency during migration

3. **Enrichment Workflow**
   - Complex multi-step process
   - Updates Book fields directly
   - **Impact**: Must work with new Book structure

### ✅ Low Challenges

1. **Timestamps**
   - created_at/updated_at on all tables
   - **Impact**: Can be preserved or regenerated

2. **Auxiliary Fields**
   - JSON column for custom data
   - **Impact**: Can move to any table

---

## Recommendations

### 1. **Do NOT Drop Existing Tables**
- Keep `books` table working during entire migration
- Create new tables alongside (`books_v2`, `library_books`, `user_book_data`)
- Dual-write to both during transition
- Drop old table only after full migration

### 2. **Incremental Migration Path**
```
Phase 1: Auth + Libraries (old books table still works)
  ↓
Phase 2: Create new tables alongside old (feature flag)
  ↓
Phase 3: Dual-write adapters (write to both old + new)
  ↓
Phase 4: New API endpoints (/v2/) alongside old
  ↓
Phase 5: Frontend migration page-by-page
  ↓
Phase 6: Remove old table + old endpoints
```

### 3. **Feature Flags**
```python
class FeatureFlags:
    NEW_SCHEMA = os.getenv("NEW_SCHEMA", "false") == "true"
    NEW_AUTH = os.getenv("NEW_AUTH", "false") == "true"
```

### 4. **Adapter Pattern**
```python
class BookAdapter:
    @staticmethod
    async def get_book(book_id: int, library_id: int, user_id: int):
        if FeatureFlags.NEW_SCHEMA:
            return await get_book_v2(book_id, library_id, user_id)
        else:
            return await get_book_v1(book_id)
```

---

## Conclusion

**The existing codebase is more substantial than initially assessed.** A "drop and rebuild" approach would:
- ❌ Break all existing functionality
- ❌ Require rewriting 15+ API endpoints
- ❌ Require rewriting 10+ frontend pages
- ❌ Risk data loss if not carefully migrated
- ❌ Have no rollback capability

**The incremental migration approach:**
- ✅ Keeps existing system working
- ✅ Allows gradual migration and testing
- ✅ Provides rollback at each checkpoint
- ✅ Enables parallel development
- ✅ Reduces risk significantly

**Estimated Effort**:
- Big-bang rewrite: 12 weeks, high risk
- Incremental migration: 16-20 weeks, low risk

**Recommendation**: Follow incremental migration path with adapters and feature flags.
