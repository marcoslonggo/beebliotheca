# Library Management System - Features & Architecture

A modern, full-stack library catalog application with automated metadata enrichment capabilities.

## Features

### 📚 Book Management
- **CRUD Operations**: Create, read, update, and delete books
- **Advanced Search**: Full-text search across title, identifier, publisher, and more
- **Barcode Scanning**: Built-in html5-qrcode scanner for quick ISBN entry
- **Series Management**: Organize books by series with collapsible grouping in table view
- **Cover Images**:
  - Local cover upload (JPEG/PNG, up to 5MB)
  - Cover image URLs from metadata enrichment
  - Fallback placeholder with book initial
- **Detailed Metadata**: Support for Dublin Core metadata fields including:
  - Title, Creator(s), Publisher, Publication Date
  - Description, Subject(s), Language(s)
  - ISBN/Identifier, Format, Type
  - Series name and number
  - Auxiliary fields for custom metadata

### 🔍 Metadata Enrichment

#### Automated Enrichment
- **One-Click Enrichment**: Enrich books directly from the table view
- **Dual-Source Fetching**: Combines metadata from:
  - OpenLibrary API
  - Google Books API
- **Smart Merging**: Intelligently merges data from multiple sources
- **Status Tracking**: Visual indicators (pending, complete, failed, awaiting review)

#### Interactive Metadata Search (Edit Dialog)
- **Side-by-Side Comparison**: View fetched vs. current metadata
- **Selective Application**: Accept individual fields with arrow buttons (→)
- **Bulk Accept**: Apply all fetched metadata with one click
- **Visual Indicators**: Highlights changed fields with color coding
- **Real-Time Updates**: Changes reflect immediately in the form

### 📖 Metadata Review
- **Quick Review Dialog**: Fast approval/rejection workflow
- **Detailed Review Drawer**: Full comparison of current vs. suggested values
- **Field-Level Control**: Accept or reject individual field changes
- **Conflict Resolution**: Clear visualization of metadata conflicts

### 📊 Library Operations
- **Loan Management**:
  - Track loan status (available/loaned)
  - Record borrower information
  - Set and monitor due dates
- **Physical Management**:
  - Condition tracking (New, Like New, Very Good, Good, Fair, Poor)
  - Shelf location assignment
  - Custom auxiliary fields

### 📈 Dashboard & Statistics
- **Real-Time Metrics**:
  - Total books count
  - Pending enrichment count
  - Enriched books count
  - Currently loaned books
- **Filtered Views**: Statistics update based on search filters

### 👥 Library Collaboration & Administration
- **Multi-Library Support**: Users can create multiple libraries, invite collaborators, and switch between them without reloading.
- **Role-Based Access**: Owner, admin, member, and viewer roles determine access to editing, sharing, and loan workflows.
- **Admin Console**:
  - Global user directory with membership overview
  - Grant or revoke site-wide admin privileges
  - Reset user passwords securely
  - Adjust member roles inside any library (owner-protected)
  - Remove users from libraries while keeping audit history

### 📝 Reading Lists
- **Flexible List Builder**: Combine items from the catalog or add external ISBN-based entries with custom metadata.
- **Rich Item Metadata**: Track author, notes, cover thumbnails, and source type (library vs. external reference).
- **Sharing Controls**: Permission model with owners, collaborators, and viewers. Collaborators can help maintain lists; viewers keep read-only access.
- **Visibility Levels**: Private, shared (invited members), or public (future global discovery).
- **Progress Tracking**: Members log status per list item (`not_started`, `in_progress`, `completed`) with optional completion notes.
- **Activity History**: Item ordering and collaborator updates persist in the list timeline for consistent views.

### 🔒 Authentication & Access Control
- **FastAPI Auth**: JWT-based login with hashed passwords stored server-side.
- **Admin Flag**: Elevated users gain administrative API scope and corresponding UI entry points.
- **Context-Aware UI**: Frontend hides privileged actions unless the session token grants access.

## Architecture

### Technology Stack

#### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with code splitting and lazy loading
- **UI Framework**: Material-UI (MUI)
- **Data Grid**: MUI DataGrid for table views
- **Forms**: Formik with Yup validation
- **State Management**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Barcode Scanning**: html5-qrcode
- **Testing**: Vitest + React Testing Library + jsdom

#### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite with SQLModel ORM
- **Async Support**: AsyncIO with async/await
- **HTTP Client**: httpx for external API calls
- **Data Validation**: Pydantic v2
- **Type Safety**: mypy for static type checking
- **File Storage**: Local file system for cover images
- **Testing**: pytest with async support

### Project Structure

```
library/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints/
│   │   │   │   ├── books.py          # Book CRUD endpoints
│   │   │   │   └── enrichment.py     # Enrichment endpoints
│   │   │   └── router.py             # API router
│   │   ├── core/
│   │   │   └── config.py             # Settings & configuration
│   │   ├── db/
│   │   │   └── session.py            # Database session
│   │   ├── models/
│   │   │   ├── book.py               # Book model
│   │   │   └── enrichment.py         # Enrichment job model
│   │   ├── services/
│   │   │   ├── enrichment.py         # Enrichment business logic
│   │   │   └── metadata.py           # Metadata fetching
│   │   └── main.py                   # FastAPI app entry point
│   └── data/
│       └── books.db                  # SQLite database
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts             # Axios instance
│   │   │   ├── books.ts              # API functions
│   │   │   └── books.test.ts         # API tests
│   │   ├── pages/
│   │   │   └── books/
│   │   │       ├── BooksPage.tsx                   # Main books page
│   │   │       ├── BookFormDialog.tsx              # Edit/Create dialog
│   │   │       ├── BookScannerDialog.tsx           # Barcode scanner
│   │   │       ├── MetadataSearchPanel.tsx         # Search & compare
│   │   │       ├── MetadataQuickReviewDialog.tsx   # Quick review
│   │   │       ├── MetadataReviewDrawer.tsx        # Detailed review
│   │   │       └── SeriesManagementDialog.tsx      # Series management
│   │   ├── components/
│   │   │   ├── BookCoverPlaceholder.tsx            # Cover placeholder
│   │   │   ├── BookCoverPlaceholder.test.tsx       # Component tests
│   │   │   ├── ConfirmDialog.tsx                   # Confirmation dialog
│   │   │   └── ConfirmDialog.test.tsx              # Component tests
│   │   ├── test/
│   │   │   ├── setup.ts              # Test configuration
│   │   │   └── test-utils.tsx        # Test helpers with providers
│   │   ├── types/
│   │   │   └── book.ts               # TypeScript types
│   │   ├── main.tsx                  # React entry point
│   │   └── vitest.config.ts          # Vitest configuration
│   └── package.json
└── scripts/
    └── dev.ps1                       # PowerShell dev script
```

### Data Models

#### Book
```python
- id: int (primary key)
- title: str
- creator: list[str]
- subject: list[str]
- description: str
- publisher: str
- contributor: list[str]
- date: str
- type: str
- format: str
- identifier: str (ISBN/barcode)
- source: str
- language: list[str]
- relation: list[str]
- coverage: str
- rights: str
- series: str (series name)
- auxiliary_fields: dict
- condition: str
- shelf_location: str
- loan_status: str (available|loaned)
- loaned_to: str
- loan_due_date: datetime
- cover_image_url: str
- cover_image_path: str (local file path)
- metadata_status: str (pending|awaiting_review|complete|failed)
- metadata_candidate: dict
- created_at: datetime
- updated_at: datetime
```

#### EnrichmentJob
```python
- id: int (primary key)
- book_id: int (foreign key)
- identifier: str
- status: str (pending|in_progress|complete|failed)
- attempts: int
- last_error: str
- updated_at: datetime
```

### API Endpoints

#### Books
- `GET /api/books` - List books with search/filter
- `POST /api/books` - Create new book
- `GET /api/books/{id}` - Get book by ID
- `PATCH /api/books/{id}` - Update book
- `DELETE /api/books/{id}` - Delete book
- `POST /api/books/{id}/cover` - Upload cover image

#### Series
- `GET /api/series` - List all series names
- `PATCH /api/series/rename` - Rename a series across all books

#### Enrichment
- `POST /api/enrichment/books/{id}` - Enrich book (create job & process)
- `POST /api/enrichment/jobs/{id}` - Process specific job
- `GET /api/enrichment/books/{id}/candidate` - Get metadata candidate
- `POST /api/enrichment/books/{id}/candidate/apply` - Apply candidate
- `POST /api/enrichment/books/{id}/candidate/reject` - Reject candidate
- `GET /api/enrichment/preview/{identifier}` - Preview metadata (no job creation)

### Enrichment Workflow

#### Table View Enrichment
1. User clicks "Enrich" button in table
2. Backend creates EnrichmentJob with status=PENDING
3. If job already IN_PROGRESS, returns current book state
4. Otherwise, processes job:
   - Fetches metadata from OpenLibrary + Google Books
   - Merges results
   - Compares with current book data
   - If differences found: sets status=AWAITING_REVIEW + stores candidate
   - If no differences: sets status=COMPLETE
5. Frontend shows "Review" button if status=AWAITING_REVIEW

#### Edit Dialog Enrichment
1. User opens Edit dialog for a book
2. Switches to "Search Metadata" tab
3. Clicks "Search Metadata" button
4. Backend fetches metadata (no job creation)
5. Frontend displays side-by-side comparison:
   - Fetched (left, green) → Current (right)
   - Blue arrows for changed fields
   - Gray arrows for unchanged fields
6. User clicks individual arrows or "Accept All"
7. Form updates with selected values
8. User saves normally

### Metadata Sources

#### OpenLibrary
- **Endpoint**: `https://openlibrary.org/isbn/{isbn}.json`
- **Fields**: title, authors, publishers, publish_date, languages, description
- **Redirect Handling**: Follows 302 redirects to book detail pages
- **Format**: Returns dict objects for authors/languages (filtered out)

#### Google Books
- **Endpoint**: `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`
- **Fields**: title, authors, publisher, publishedDate, description, categories, language, imageLinks
- **Coverage**: Broader coverage than OpenLibrary
- **Format**: Clean string values

### Error Handling & Logging

- **Comprehensive Logging**: All enrichment operations logged at INFO/ERROR levels
- **User Feedback**: Error alerts displayed in UI for failed operations
- **Graceful Degradation**: If one source fails, tries the other
- **Exception Handling**: Try-catch blocks at all layers (endpoint, service, fetching)
- **Network Resilience**: 10-second timeouts, redirect following, error recovery

### Development

#### Running the Application

**Using Dev Script (PowerShell):**
```powershell
.\scripts\dev.ps1
```

**Manual (Recommended for debugging):**

Terminal 1 - Backend:
```powershell
cd backend
.\.venv\Scripts\python.exe -u -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2 - Frontend:
```powershell
cd frontend
npm run dev
```

#### Environment Configuration

Backend configuration in `backend/app/core/config.py`:
```python
database_url: sqlite+aiosqlite:///./data/books.db
openlibrary_base_url: https://openlibrary.org
google_books_base_url: https://www.googleapis.com/books/v1/volumes
metadata_retry_interval_seconds: 3600
```

Frontend proxy in `frontend/vite.config.ts`:
```typescript
proxy: {
  "/api": {
    target: "http://localhost:8000",
    changeOrigin: true
  }
}
```

### Key Features Implementation Details

#### Metadata Normalization
- Filters out OpenLibrary dict objects (e.g., `{'key': '/authors/...'}`)
- Normalizes lists to clean string arrays
- Handles missing/null values gracefully

#### Smart Merging
- Merges data from multiple sources
- Deduplicates list values
- Prioritizes non-empty values
- Preserves user-entered data

#### Status Management
- **pending**: Initial state, no enrichment attempted
- **in_progress**: Job currently running (prevents duplicates)
- **complete**: Successfully enriched, no conflicts
- **awaiting_review**: Metadata found but has conflicts with current data
- **failed**: Enrichment failed (no metadata found or error)

#### Caching & Performance
- Settings cache removed to ensure config reloads
- React Query caching for API responses
- Optimistic UI updates
- Invalidation on mutations

### Quality Assurance

- **Frontend Testing**: Vitest + React Testing Library
  - 21+ tests covering API functions and critical components
  - Custom test utilities with provider setup (React Query, Router, Theme)
  - Coverage for BookCoverPlaceholder, ConfirmDialog, and books API
- **Backend Testing**: pytest with async support
  - Critical endpoint and service tests
- **Type Safety**: 100% type-safe codebase
  - TypeScript strict mode in frontend
  - mypy compliance in backend (0 type errors)
- **Performance**: Optimized bundle size with code splitting
  - Initial load: 542KB (50% reduction from 1,065KB)
  - Lazy-loaded routes for faster initial render
  - Manual vendor chunks for better caching

### Recent Improvements (2025)

#### ✅ Completed Highlights
- [x] **Multi-library collaboration** – Libraries, invitations, and role-based permissions for shared ownership.
- [x] **Administrator tools** – Dedicated admin panel to view every user, manage memberships, and reset credentials.
- [x] **Reading lists** – Shareable lists with collaborator roles, progress tracking, and mixed catalog/external entries.
- [x] **Cover image upload/management** – Local file upload with JPEG/PNG support.
- [x] **Series and collection support** – Series field with collapsible grouping in table.
- [x] **Performance & testing** – Bundle optimization (50% reduction), Vitest + React Testing Library setup, and strict typing across stack.

#### 🚧 Active Initiatives
- [ ] Notifications and activity feed polish for collaboration events.
- [ ] Broader analytics widgets for admin dashboard and reading lists.
- [ ] Bulk operations (enrichment, multi-edit) to speed librarian workflows.

#### 🔮 Planned Enhancements
- [ ] **Book clubs** – Synchronized reading circles with progress metrics and page-gated discussions.
- [ ] **Public discovery** – Optional public visibility for lists and clubs.
- [ ] **Import/export** – CSV/JSON pipelines for migrating catalogs.
- [ ] **Offline resilience** – IndexedDB caching and background sync exploration.
- [ ] **Automated migrations** – Evaluate Alembic for structured migrations.

---

**Built with ❤️ using FastAPI, React, and Material-UI**
