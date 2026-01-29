# Simplified Multi-User Migration Plan

**Context**: Development environment where app can be stopped/broken during migration. No production users to protect.

**Key Simplifications**:
- No dual-write adapters
- No feature flags
- No schema coexistence
- Direct cutover with data snapshot for rollback
- Phased for risk control and debugging tractability, not uptime

---

## Migration Strategy

### Approach
**4 coarse phases with deliberate cutover points**. Each phase:
1. Lands with working tests
2. App can break between phases (planned downtime)
3. Data snapshot taken before destructive changes
4. Clear completion checklist

### Timeline
**8-12 weeks** (2-3 weeks per phase)

---

## Phase 1: Auth + Multi-Tenancy Foundation
**Duration**: 2-3 weeks
**Goal**: Add users and libraries without touching existing book schema

### Work Items

#### 1.1 Database Models
- [ ] Create `users` table
  - `id` (UUID, PK)
  - `email` (unique, indexed)
  - `password_hash` (bcrypt)
  - `full_name`
  - `created_at`, `updated_at`

- [ ] Create `libraries` table
  - `id` (UUID, PK)
  - `name`
  - `description`
  - `owner_id` (FK to users)
  - `created_at`

- [ ] Create `library_members` table (junction + roles)
  - `id` (UUID, PK)
  - `library_id` (FK to libraries)
  - `user_id` (FK to users)
  - `role` (enum: owner, admin, member, viewer)
  - `joined_at`
  - Unique constraint: (library_id, user_id)

#### 1.2 Backend Auth
- [ ] JWT token service (`backend/app/services/auth.py`)
  - `create_access_token(user_id, email) -> str`
  - `verify_token(token) -> dict`
  - 24h expiry

- [ ] Auth endpoints (`backend/app/api/endpoints/auth.py`)
  - `POST /api/auth/register` - Create user
  - `POST /api/auth/login` - Return JWT
  - `POST /api/auth/logout` - Invalidate (client-side for now)
  - `GET /api/auth/me` - Current user info

- [ ] Auth dependency (`backend/app/api/deps.py`)
  - `get_current_user(token: str = Header(...))` - Extract user from JWT

#### 1.3 Library Management
- [ ] Library endpoints (`backend/app/api/endpoints/libraries.py`)
  - `POST /api/libraries` - Create library (auth required)
  - `GET /api/libraries` - List user's libraries
  - `GET /api/libraries/{id}` - Get single library
  - `PATCH /api/libraries/{id}` - Update (owner/admin only)
  - `DELETE /api/libraries/{id}` - Delete (owner only)

- [ ] Membership endpoints
  - `POST /api/libraries/{id}/members` - Invite user
  - `GET /api/libraries/{id}/members` - List members
  - `PATCH /api/libraries/{id}/members/{user_id}` - Update role
  - `DELETE /api/libraries/{id}/members/{user_id}` - Remove member

#### 1.4 Frontend Auth
- [ ] Auth context (`frontend/src/contexts/AuthContext.tsx`)
  - Store JWT in localStorage
  - `login(email, password)`
  - `logout()`
  - `currentUser` state

- [ ] Login page (`frontend/src/pages/auth/LoginPage.tsx`)
- [ ] Register page (`frontend/src/pages/auth/RegisterPage.tsx`)
- [ ] Protected route wrapper (`frontend/src/components/ProtectedRoute.tsx`)

#### 1.5 Frontend Libraries
- [ ] Library selector (`frontend/src/components/LibrarySelector.tsx`)
  - Dropdown in top nav
  - Switch between user's libraries
  - Store selected library in context

- [ ] Library management page (`frontend/src/pages/libraries/LibrariesPage.tsx`)
  - Create/edit/delete libraries
  - Manage members
  - View membership

### Phase 1 Completion Checklist

**Must Pass Before Phase 2**:
- [ ] User can register with email/password
- [ ] User can login and receive JWT
- [ ] JWT is validated on protected endpoints
- [ ] User can create a library (auto-assigned as owner)
- [ ] User can view their libraries
- [ ] User can invite another user to library
- [ ] Library members can view library details
- [ ] Non-members cannot access library
- [ ] All auth endpoints have tests (pytest)
- [ ] All library endpoints have tests (pytest)
- [ ] Frontend login flow works end-to-end
- [ ] Frontend library selector works
- [ ] **Existing /api/books endpoints still work** (untouched in Phase 1)

**Data State**:
- Existing `books` table unchanged
- New tables: `users`, `libraries`, `library_members`
- No FK between books and libraries yet

---

## Phase 2: Schema Split + Data Migration
**Duration**: 3-4 weeks
**Goal**: Split monolithic Book → (Book, LibraryBook, UserBookData)

### Work Items

#### 2.1 New Schema Design

**New `books` table** (intrinsic metadata only):
```python
class Book(SQLModel, table=True):
    id: UUID (PK)
    title: str (indexed)
    authors: list[str] | None (JSON)  # renamed from creator
    isbn: str | None (indexed)  # renamed from identifier
    publisher: str | None
    description: str | None
    publish_date: str | None
    subjects: list[str] | None (JSON)
    language: list[str] | None (JSON)
    page_count: int | None
    cover_url: str | None  # External URL from metadata

    # Enrichment
    metadata_status: str (default: "pending")
    metadata_candidate: dict | None (JSON)

    created_at: datetime
    updated_at: datetime
```

**New `library_books` table** (physical copies):
```python
class LibraryBook(SQLModel, table=True):
    id: UUID (PK)
    book_id: UUID (FK to books.id, indexed)
    library_id: UUID (FK to libraries.id, indexed)

    # Physical/Library data
    condition: str | None  # "New", "Good", "Fair", "Poor"
    physical_location: str | None  # Shelf location
    series: str | None  # Series name
    acquisition_date: date | None

    # Loan tracking (library-level)
    loan_status: str (default: "available")  # available|checked_out
    checked_out_to: UUID | None (FK to users.id)
    checked_out_at: datetime | None
    due_date: datetime | None

    # Local cover override
    cover_image_path: str | None  # Local uploaded file

    created_at: datetime
    updated_at: datetime

    # Unique: one copy per book per library
    __table_args__ = (UniqueConstraint('book_id', 'library_id'),)
```

**New `user_book_data` table** (personal reading data):
```python
class UserBookData(SQLModel, table=True):
    id: UUID (PK)
    book_id: UUID (FK to books.id, indexed)
    user_id: UUID (FK to users.id, indexed)
    library_id: UUID (FK to libraries.id, indexed)

    # Personal reading tracking
    reading_status: str | None  # "to-read", "reading", "completed", "abandoned"
    progress_pages: int | None
    progress_percent: float | None
    started_at: date | None
    completed_at: date | None

    # Personal metadata
    personal_rating: int | None  # 1-5 stars
    personal_notes: str | None
    is_favorite: bool (default: False)

    created_at: datetime
    updated_at: datetime

    # Unique: one record per user per book per library
    __table_args__ = (UniqueConstraint('book_id', 'user_id', 'library_id'),)
```

#### 2.2 Create New Tables
- [ ] Create migration script `backend/migrations/001_create_new_schema.py`
- [ ] Add new SQLModel classes to `backend/app/models/`
  - `book_v2.py`
  - `library_book.py`
  - `user_book_data.py`
- [ ] Run migration to create tables (alongside old `books` table)

#### 2.3 Data Migration Script
- [ ] Create `backend/migrations/002_migrate_book_data.py`

**Migration Logic**:
```python
# For each book in old books table:
#   1. Create intrinsic Book record (title, authors, isbn, etc.)
#   2. Create LibraryBook record (assign to user's default library)
#      - condition, shelf_location, series, cover_image_path
#   3. If book has reading status, create UserBookData
#   4. Copy cover file if exists
```

**Assumptions**:
- All existing books go into first user's first library
- Or prompt user to select which library during migration
- Preserve all existing cover files

- [ ] Test migration script on copy of database
- [ ] **Take database snapshot before running migration**
- [ ] Run migration script
- [ ] Verify all data migrated correctly

#### 2.4 Update Foreign Keys
- [ ] Update `enrichment_jobs` table
  - Change `book_id` FK from old books table → new books table
  - Add migration script

- [ ] Update `series` table
  - Change `cover_book_id` FK from old books table → new books table
  - Add migration script

#### 2.5 Update Series Logic
- [ ] Move series field from Book → LibraryBook
- [ ] Update series endpoints to query `library_books` instead of `books`
- [ ] `GET /api/series/{id}/books` now returns LibraryBook records

### Phase 2 Completion Checklist

**Must Pass Before Phase 3**:
- [ ] New tables created: `books`, `library_books`, `user_book_data`
- [ ] All old book data migrated to new tables
- [ ] No data loss (verify counts: old books == new books)
- [ ] Cover files copied correctly (verify file paths)
- [ ] Foreign keys updated: `enrichment_jobs.book_id`, `series.cover_book_id`
- [ ] Series endpoints query new tables
- [ ] Database snapshot saved before migration
- [ ] Can restore from snapshot if needed
- [ ] Old `books` table still exists (not dropped yet)

**Data State**:
- Old `books` table: Still exists but not used
- New tables populated with migrated data

---

## Phase 3: API + Frontend Updates
**Duration**: 3-4 weeks
**Goal**: Update all API endpoints and frontend to use new schema

### Work Items

#### 3.1 New API Endpoints

**Books API** (`backend/app/api/endpoints/books.py` - REWRITE):
```python
# Now returns joined data: Book + LibraryBook + UserBookData
GET /api/libraries/{library_id}/books
  - Query params: q (search), skip, limit
  - Returns: list of enriched book objects
  - Response: {
      "book": {...},  # Intrinsic
      "library_book": {...},  # Physical
      "user_data": {...}  # Personal
    }

POST /api/libraries/{library_id}/books
  - Body: { book: {...}, library_book: {...} }
  - Creates Book + LibraryBook
  - Returns: enriched object

GET /api/libraries/{library_id}/books/{book_id}
  - Returns: Book + LibraryBook + UserBookData

PATCH /api/libraries/{library_id}/books/{book_id}
  - Body can update any of: book, library_book, user_data
  - Routes updates to correct table

DELETE /api/libraries/{library_id}/books/{book_id}
  - Deletes LibraryBook (and UserBookData)
  - Keeps Book if used in other libraries
  - Deletes cover file

POST /api/libraries/{library_id}/books/{book_id}/cover
  - Uploads to library_books.cover_image_path
```

**User Book Data API** (NEW):
```python
PATCH /api/libraries/{library_id}/books/{book_id}/reading-status
  - Update reading_status, progress, etc.
  - Creates/updates UserBookData

PATCH /api/libraries/{library_id}/books/{book_id}/rating
  - Update personal_rating

PATCH /api/libraries/{library_id}/books/{book_id}/notes
  - Update personal_notes
```

**Enrichment API** (`backend/app/api/endpoints/enrichment.py` - UPDATE):
- [ ] Update to work with new `books` table (intrinsic only)
- [ ] `POST /api/books/{book_id}/enrich` - No library context needed
- [ ] Enrichment updates intrinsic Book metadata only

#### 3.2 Search & Filtering
- [ ] Update search logic to JOIN across tables:
  ```python
  SELECT books.*, library_books.*, user_book_data.*
  FROM books
  JOIN library_books ON books.id = library_books.book_id
  LEFT JOIN user_book_data ON books.id = user_book_data.book_id
  WHERE library_books.library_id = ?
  AND (
    books.title LIKE ?
    OR books.authors LIKE ?
    OR library_books.series LIKE ?
  )
  ```

#### 3.3 Frontend Type Updates
- [ ] Update `frontend/src/types/book.ts`:
  ```typescript
  export interface Book {
    id: string;  // UUID now
    title: string;
    authors?: string[];
    isbn?: string;
    // ... intrinsic fields
  }

  export interface LibraryBook {
    id: string;
    book_id: string;
    library_id: string;
    condition?: string;
    physical_location?: string;
    series?: string;
    loan_status: string;
    cover_image_path?: string;
  }

  export interface UserBookData {
    id: string;
    book_id: string;
    user_id: string;
    reading_status?: string;
    progress_pages?: number;
    personal_rating?: number;
    personal_notes?: string;
  }

  export interface EnrichedBook {
    book: Book;
    library_book: LibraryBook;
    user_data?: UserBookData;
  }
  ```

#### 3.4 Frontend API Client Updates
- [ ] Update `frontend/src/api/books.ts`:
  ```typescript
  export const listBooks = async (
    libraryId: string,
    params: ListBooksParams
  ): Promise<EnrichedBook[]>

  export const createBook = async (
    libraryId: string,
    payload: CreateBookPayload
  ): Promise<EnrichedBook>
  ```

#### 3.5 Frontend Component Updates
- [ ] Update `BooksPage.tsx`:
  - Pass `libraryId` from context
  - Handle nested EnrichedBook structure
  - Update DataGrid columns to access nested fields

- [ ] Update `BookFormDialog.tsx`:
  - Separate form sections: Intrinsic / Library / Personal
  - Send nested payload to API

- [ ] Add reading status UI:
  - Status selector (to-read, reading, completed, etc.)
  - Progress tracker
  - Personal rating stars
  - Personal notes textarea

- [ ] Update `MetadataSearchPanel.tsx`:
  - Work with new Book structure (intrinsic only)

- [ ] Update `SeriesManagementDialog.tsx`:
  - Query library_books.series instead of books.series

#### 3.6 Remove Old Endpoints
- [ ] Delete old `/api/books` endpoints (no library_id)
- [ ] All endpoints now require library context

### Phase 3 Completion Checklist

**Must Pass Before Phase 4**:
- [ ] All API endpoints updated to new schema
- [ ] Search works across joined tables
- [ ] Frontend types match new API responses
- [ ] BooksPage displays books from new API
- [ ] Can create book (creates Book + LibraryBook)
- [ ] Can edit book (updates correct tables)
- [ ] Can delete book (handles cleanup correctly)
- [ ] Cover upload works (to library_books)
- [ ] Enrichment workflow works (updates intrinsic Book)
- [ ] Series management works (queries library_books)
- [ ] Reading status UI functional
- [ ] Personal rating/notes UI functional
- [ ] All API endpoints have tests
- [ ] All frontend components have tests
- [ ] Manual regression test passed (test every feature)

---

## Phase 4: Cleanup + Polish
**Duration**: 1-2 weeks
**Goal**: Remove old code, optimize, polish UI

### Work Items

#### 4.1 Database Cleanup
- [ ] **Take final snapshot before dropping old table**
- [ ] Drop old `books` table
- [ ] Verify no lingering FKs reference old table
- [ ] Run VACUUM on SQLite database

#### 4.2 Code Cleanup
- [ ] Remove old Book model from `backend/app/models/book.py`
- [ ] Remove any commented-out old code
- [ ] Update all imports

#### 4.3 Performance Optimization
- [ ] Add indexes:
  - `library_books.library_id`
  - `library_books.book_id`
  - `user_book_data.user_id`
  - `user_book_data.book_id`
  - `books.title`
  - `books.isbn`

- [ ] Analyze slow queries with EXPLAIN
- [ ] Optimize JOIN queries if needed

#### 4.4 UI Polish
- [ ] Reading status dashboard
  - Show "Currently Reading" books
  - Show "To Read" list
  - Progress tracking UI

- [ ] Library activity feed
  - Show recent additions
  - Show recent checkouts
  - Member activity

- [ ] Book detail page improvements
  - Tabbed interface: Details / My Reading / Library Info
  - Better metadata display
  - Reviews/notes section

#### 4.5 Documentation
- [ ] Update README with multi-user features
- [ ] Update FEATURES.md
- [ ] Document API endpoints (OpenAPI/Swagger)
- [ ] Write user guide for library management

### Phase 4 Completion Checklist

**Final Acceptance Criteria**:
- [ ] Old books table dropped
- [ ] No old code references remain
- [ ] All indexes created
- [ ] Performance targets met:
  - Book list load < 200ms
  - Search response < 300ms
  - All API responses < 500ms
- [ ] UI polish complete:
  - Reading status dashboard works
  - Library activity feed works
  - Book detail page polished
- [ ] Documentation complete
- [ ] All tests passing (backend + frontend)
- [ ] Manual regression test passed
- [ ] Ready for "production" use

---

## Rollback Strategy

### At Any Phase
1. **Database rollback**: Restore from snapshot taken before phase
2. **Code rollback**: `git revert` or `git reset` to previous commit
3. **Verify**: Run old tests, check old functionality

### Snapshots
Create snapshot before:
- Phase 2: Before data migration
- Phase 3: Before dropping old endpoints
- Phase 4: Before dropping old table

**Snapshot command**:
```bash
cp backend/data/books.db backend/data/books.db.backup-phase-X
```

**Restore command**:
```bash
cp backend/data/books.db.backup-phase-X backend/data/books.db
```

---

## Testing Strategy

### Per-Phase Testing
1. **Unit tests**: All new models, services, endpoints
2. **Integration tests**: Full API flows
3. **Frontend tests**: Component tests for new UI
4. **Manual regression**: Test all existing features

### Critical Test Scenarios
- [ ] User registration and login
- [ ] Library creation and membership
- [ ] Book CRUD in library context
- [ ] Cover upload (local file)
- [ ] Metadata enrichment workflow
- [ ] Series management
- [ ] Search across all fields
- [ ] Loan tracking
- [ ] Reading status tracking
- [ ] Personal notes and ratings

### Test Data
- Create test users: user1@test.com, user2@test.com
- Create test libraries: "Home Library", "Office Library"
- Add test books with variety of metadata
- Test multi-user scenarios: shared library, different reading statuses

---

## Timeline Summary

| Phase | Duration | Key Deliverable | Breakage |
|-------|----------|-----------------|----------|
| Phase 1 | 2-3 weeks | Auth + Libraries working | ✅ Old books endpoints unchanged |
| Phase 2 | 3-4 weeks | Data migrated to new schema | ⚠️ App down during migration |
| Phase 3 | 3-4 weeks | All APIs + UI updated | ⚠️ App down during cutover |
| Phase 4 | 1-2 weeks | Cleanup + polish | ✅ Fully working |

**Total**: 8-12 weeks

---

## Key Differences from v2.0

**Dropped**:
- ❌ Dual-write adapters
- ❌ Feature flags
- ❌ Old/new schema coexistence
- ❌ /v2 API versioning
- ❌ Gradual frontend migration

**Kept**:
- ✅ Phased approach (4 phases vs 6)
- ✅ Tests between phases
- ✅ Data snapshots for rollback
- ✅ Risk-controlled progression

**Added**:
- ✅ Phase completion checklists
- ✅ Clear cutover points
- ✅ Simplified mechanics
- ✅ Explicit "app can break" allowance

---

## Success Metrics

After Phase 4 completion:

1. **Multi-user support**: ✅ Multiple users can register and login
2. **Library multi-tenancy**: ✅ Users can create/join multiple libraries
3. **Data separation**: ✅ Intrinsic vs Library vs Personal data properly separated
4. **Shared libraries**: ✅ Multiple users can access same physical books
5. **Personal tracking**: ✅ Each user has own reading status, notes, ratings
6. **All features preserved**: ✅ Series, enrichment, covers, search, loans all working
7. **Performance**: ✅ Response times under targets
8. **Code quality**: ✅ Tests passing, no dead code

**Definition of Done**: Users can manage books in shared libraries with personal reading tracking, all existing features work, and the system is ready for actual use.
