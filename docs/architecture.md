# Architecture Overview

## Frontend

- React 18 with Vite, TypeScript, and Material UI (Material Dashboard 2 React inspired layout).
- React Router powers page-level routing, while React Query manages API caching, retries, and offline awareness.
- Global theming via MUI, with dark/light toggle exposed through `ColorModeContext`.
- Books workspace uses MUI DataGrid, Formik, and Yup for inventory CRUD, enrichment review, and loan/condition workflows.
- Reading Lists area combines shareable list builder, collaborator progress tracking, and contextual dialogs powered by TanStack Query mutations.
- Admin console provides a cross-tenant view of users, library memberships, and privileged actions (role changes, password resets).
- Barcode scanning implemented with html5-qrcode for robust ISBN/barcode capture.
- Series management with collapsible grouping in the books table for better organization.
- Local cover image upload with file storage in `backend/data/covers/`.
- Code splitting with React.lazy() for optimized bundle sizes and route-level loading states.
- Comprehensive test coverage with Vitest + React Testing Library (expanding alongside new features).

## Backend

- FastAPI app with async SQLModel models persisted to SQLite (`backend/data/books.db`).
- **Three-tier data model** (see [data-model.md](./data-model.md)):
  - `BookV2`: Intrinsic book metadata (title, author, ISBN, etc.)
  - `LibraryBook`: Library copy-specific data (ownership status, condition, location, library notes)
  - `UserBookData`: Personal reading data (reading status, grade, completion history, personal notes)
- **Multi-user architecture** with libraries, membership roles (owner/editor/viewer), and per-user data isolation.
- **Reading list domain** exposing models for lists, list items, membership roles, and per-user progress tracking.
- **Administrator APIs** providing global user directory, role elevation, password resets, and membership adjustments guarded by `require_admin`.
- Authentication with JWT tokens and password hashing (bcrypt).
- Dublin Core fields stored as structured JSON columns (lists) where applicable.
- Enrichment jobs queue metadata fetches and persist job history for retriable background processing.
- Metadata adapters target Open Library and Google Books via `httpx`, merging results without overwriting manual edits and emitting review candidates when conflicts appear.
- Series field added to books model with dedicated series management endpoints.
- Cover image upload endpoint with file storage and validation (JPEG/PNG, 5MB max).
- Full type safety with mypy compliance (zero type errors).
- Comprehensive test coverage for critical endpoints and services.

## Offline & Resilience

- Manual creates/edits persist locally even without internet; metadata jobs are queued and retried when connectivity returns.
- React Query keeps last-known data available for UX continuity; future work can add IndexedDB caching or service workers.

## Performance & Quality

- Bundle optimization with Vite code splitting and manual chunks (50% size reduction).
- Production-ready error handling with proper logging (console.log statements removed).
- Clean git workflow with comprehensive .gitignore patterns.
- Type-safe throughout with TypeScript strict mode and mypy.
- Test-driven quality assurance with automated test suites.

## Recent Improvements (2024-2025)

### Phase 4: Lists & Administration (January 2025)
- ✅ Reading lists domain (lists, items, memberships, per-user progress).
- ✅ Frontend list builder with collaborator visibility controls and progress toggles.
- ✅ Admin dashboard surfacing global user directory, library memberships, and password resets.
- ✅ Migration scripts with automated pre-backup of existing SQLite database.

### Phase 3: Library Sharing & Collaboration (November 2024)
- ✅ Multi-library architecture with invitations, roles (owner/admin/member/viewer), and library switching.
- ✅ Library membership management UI with role badges and quick actions.
- ✅ Authentication hardening: JWT refresh handling, admin guardrails.
- 🚧 Notifications: system groundwork exists; richer activity feeds remain TBD.
- 📋 Upcoming: Book loan request/approval workflow, copy-to-library shortcut, overdue reminders.

### Phase 2: Data Model Expansion (September–October 2024)
- ✅ Three-tier separation (BookV2, LibraryBook, UserBookData).
- ✅ Reading status tracking, completion history, and personal grading.
- ✅ Shared notes at the library level versus private notes per user.
- ✅ Metadata enrichment pipeline upgrades (dual-source merge, review drawer support).

### Phase 1: Core Catalog (Early 2024)
- ✅ Initial CRUD, enrichment, barcode scanning, and series grouping.
- ✅ Performance foundations (bundle optimization, lazy routes, typed APIs).
- ✅ Testing harnesses for backend (pytest) and frontend (Vitest + RTL).

### Next Steps

1. Extend notification system to cover reading list changes and upcoming book club events.
2. Add conditional UI for physical vs. digital holdings (hide irrelevant fields automatically).
3. Expand backend test coverage around admin actions and collaborative workflows.
4. Evaluate Alembic or SQLModel-native migrations for automated schema evolution.
5. Build import/export pipelines (CSV/JSON) for bulk catalog management.
6. Deliver book clubs: synchronized reading progress, page-gated discussions, and dashboard analytics.
