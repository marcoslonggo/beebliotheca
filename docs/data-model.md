# Data Model Architecture

## Overview

The library application uses a **three-tier data model** to separate intrinsic book metadata, library-specific copy data, and user-specific personal data. This architecture supports multi-user libraries where different users can have different personal relationships with the same book.

## Three-Tier Architecture

### 1. BookV2 - Intrinsic Book Metadata
**Location:** `backend/app/models/book_v2.py`
**Table:** `books_v2`

Contains metadata that is intrinsic to the book itself, regardless of which copy or who owns it.

**Fields:**
- `id` (UUID, primary key)
- `title` (string, required)
- `authors` (JSON array of strings)
- `isbn` (string, nullable)
- `publisher` (string, nullable)
- `description` (text, nullable)
- `publish_date` (string, nullable)
- `subjects` (JSON array of strings)
- `language` (JSON array of strings)
- `page_count` (integer, nullable)
- `cover_url` (string, nullable) - External URL for cover image
- `metadata_status` (string) - Status: `pending`, `enriching`, `complete`, `failed`, `awaiting_review`
- `metadata_candidate` (JSON) - Suggested metadata changes pending review
- `created_at`, `updated_at` (datetime)

**Key Points:**
- One `BookV2` record per unique book (identified by ISBN or title)
- Shared across all libraries and users
- Metadata enrichment targets this level

---

### 2. LibraryBook - Library Copy Metadata
**Location:** `backend/app/models/library_book.py`
**Table:** `library_books`

Contains data specific to a physical or digital copy of a book in a particular library.

**Fields:**
- `id` (UUID, primary key)
- `book_id` (UUID, foreign key → `books_v2.id`)
- `library_id` (UUID, foreign key → `libraries.id`)
- **`ownership_status`** (string, default: "To Check") - Values: `Wanted`, `Owned`, `To Check`
- `condition` (string, nullable) - Values: `New`, `Like New`, `Very Good`, `Good`, `Fair`, `Poor`
- `physical_location` (string, nullable) - Shelf, box, or storage location
- `book_type` (string, nullable) - Values: `paperback`, `hardcover`, `ebook`, `pdf`, `audiobook`
- `series` (string, nullable) - Series name if applicable
- `acquisition_date` (date, nullable)
- **`library_notes`** (text, nullable) - Notes visible to all library members
- `loan_status` (string, default: "available") - Values: `available`, `checked_out`
- `checked_out_to` (UUID, nullable, foreign key → `users.id`)
- `checked_out_at` (datetime, nullable)
- `due_date` (datetime, nullable)
- `cover_image_path` (string, nullable) - Local file path for uploaded cover
- `created_at`, `updated_at` (datetime)

**Key Points:**
- One `LibraryBook` record per book per library
- Unique constraint: `(book_id, library_id)`
- Manages physical/digital copy properties
- Visible to all members of the library

---

### 3. UserBookData - Personal Reading Data
**Location:** `backend/app/models/user_book_data.py`
**Table:** `user_book_data`

Contains personal data about a user's relationship with a book.

**Fields:**
- `id` (UUID, primary key)
- `book_id` (UUID, foreign key → `books_v2.id`)
- `library_id` (UUID, foreign key → `libraries.id`)
- `user_id` (UUID, foreign key → `users.id`)
- `reading_status` (string, nullable) - Values: `To Read`, `Up Next`, `Reading`, `Read`, `Abandoned`
- `progress_pages` (integer, nullable)
- `progress_percent` (float, nullable)
- `started_at` (date, nullable)
- `completed_at` (date, nullable) - Most recent completion date
- **`completion_history`** (JSON array of ISO date strings) - All times user finished reading
- **`grade`** (integer, nullable, 1-10) - User's rating on 1-10 scale
- **`personal_notes`** (text, nullable) - Private notes visible only to this user
- `is_favorite` (boolean, default: false)
- `created_at`, `updated_at` (datetime)

**Key Points:**
- One `UserBookData` record per user per book per library
- Unique constraint: `(book_id, user_id, library_id)`
- Private to the individual user
- Tracks reading progress and personal opinions

---

## Multi-User Library Architecture

### Libraries
**Location:** `backend/app/models/library.py`
**Table:** `libraries`

- Each user has a default library created automatically
- Libraries can be shared with other users via membership
- Library owner has full control

### Library Membership
**Location:** `backend/app/models/library_member.py`
**Table:** `library_members`

**Roles:**
- `owner` - Full access, can delete library, manage all members
- `admin` (Co-owner) - Can add/edit/delete books, manage library metadata, cannot delete library
- `member` - Standard member access
- `viewer` (Read-only) - Read-only access, can request book loans and copy books

**Fields:**
- `id` (UUID, primary key)
- `library_id` (UUID, foreign key → `libraries.id`)
- `user_id` (UUID, foreign key → `users.id`)
- `role` (MemberRole enum)
- `joined_at` (datetime)
- Unique constraint: `(library_id, user_id)`

**Permissions:**
- **Owner:** Full control, can delete library, promote/demote members, remove members
- **Co-owner (admin):** Edit all books and library settings, manage non-owner members
- **Read-only (viewer):** View books, request loans, copy books to own library

### Library Invitations (Phase 3)
**Location:** `backend/app/models/library_invitation.py`
**Table:** `library_invitations`

Manages pending library sharing invitations.

**Fields:**
- `id` (UUID, primary key)
- `library_id` (UUID, foreign key → `libraries.id`)
- `inviter_id` (UUID, foreign key → `users.id`) - Who sent the invitation
- `invitee_username` (string) - Username of person being invited
- `invitee_id` (UUID, foreign key → `users.id`, nullable) - Resolved after lookup
- `role` (MemberRole) - Role being offered (admin or viewer)
- `status` (string) - `pending`, `accepted`, `declined`, `cancelled`
- `created_at` (datetime)
- `expires_at` (datetime) - Invitations expire after 7 days
- `responded_at` (datetime, nullable)

**Workflow:**
1. Owner invites user by username
2. System creates invitation with `pending` status
3. Invitee sees notification
4. Invitee accepts/declines
5. On accept: Create `LibraryMember` record
6. On decline/expire: Mark invitation as declined/expired

### Notifications (Phase 3)
**Location:** `backend/app/models/notification.py`
**Table:** `notifications`

System notifications for sharing-related events.

**Fields:**
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key → `users.id`) - Recipient
- `type` (string) - `library_invitation`, `loan_request`, `loan_approved`, `loan_denied`, `loan_overdue`
- `title` (string) - Notification title
- `message` (string) - Notification message
- `data` (JSON) - Type-specific data (invitation_id, book_id, etc.)
- `read` (boolean, default: false)
- `created_at` (datetime)

**Types:**
- `library_invitation` - User has been invited to a library
- `loan_request` - Someone requested to borrow a book (future)
- `loan_approved` - Loan request approved (future)
- `loan_denied` - Loan request denied (future)
- `loan_overdue` - Borrowed book is overdue (future)

---

## Reading Lists

### ReadingList
**Location:** `backend/app/models/reading_list.py`  
**Table:** `reading_lists`

- Represents a curated list owned by a user.
- `visibility`: `private`, `shared`, or `public` (public discovery coming later).
- `owner_id`: User who can always manage collaborators and visibility.
- Tracks `created_at` and `updated_at` timestamps for ordering and auditing.

### ReadingListItem
**Table:** `reading_list_items`

- Supports two item types via `item_type`: `book` (linked to `books_v2.id`) or `external` (free-form entry).
- Stores display metadata (title, author, ISBN, cover URL, notes).
- `order_index` maintains custom ordering within the list.

### ReadingListMember
**Table:** `reading_list_members`

- Associates users with lists using roles: `owner`, `collaborator`, `viewer`.
- Unique `(list_id, user_id)` constraint enforces single membership record per user per list.
- `invited_by` tracks who granted access; `joined_at` supports audit history.

### ReadingListProgress
**Table:** `reading_list_progress`

- Tracks per-user status for each list item (`not_started`, `in_progress`, `completed`).
- Optional `completed_at` timestamp and `notes` allow journaling.
- Unique constraint across `list_id`, `list_item_id`, and `user_id` prevents duplicate progress rows.
- Updated automatically whenever a member toggles progress in the UI.

---

## Planned: Book Clubs

### Purpose
Enable synchronous reading groups to focus on a single title, track member progress by page, and exchange comments gated by reading progress.

### Proposed Tables

1. **book_clubs**
   - `id`, `name`, `description`, `owner_id`, `current_book_id`
   - `created_at`, `updated_at`
   - Optional `slug` for friendly URLs
   - `current_book_id` is a nullable FK to `books.id`; when a club switches titles we
     append to `book_club_books` before pointing `current_book_id` at the new book to
     avoid dangling history. Owners can only pick catalogued titles unless they clone
     metadata from a past read.
   - `pages_total_override` lets the owner adjust the canonical page count when group
     copies differ from metadata; stored on the club so it propagates to all members.

2. **book_club_members**
   - `id`, `club_id`, `user_id`, `role` (`owner`, `moderator`, `member`)
   - `joined_at`, `last_active_at`
   - Unique `(club_id, user_id)` constraint prevents duplicate memberships; `left_at`
     and optional `removed_by` capture churn while retaining discussion history.

3. **book_club_progress**
   - `id`, `club_id`, `user_id`, `current_page`, `pages_total` (optional override)
   - `updated_at`
   - Unique `(club_id, user_id)` constraint; backend rejects regressions so progress
     remains monotonic. `pages_total` defaults to the book metadata or club-level
     override so everyone tracks against the same target unless the owner changes it.

4. **book_club_comments**
   - `id`, `club_id`, `user_id`, `page_number`, `body`
   - Visibility logic: API filters comments to only those at `page_number <= viewer.current_page`
   - `created_at`, `updated_at`

5. **book_club_books** (optional history)
   - Tracks past reads (`club_id`, `book_id`, `started_at`, `completed_at`)
   - Allows returning to prior titles and retaining discussion archives

### Key Behaviors
- One active book per club; switching books rolls progress/comments into history.
- Members update progress via page input; backend enforces monotonic increases.
- Comment fetch endpoints join against `book_club_progress` to enforce visibility.
- Future enhancements may include reminders, scheduled discussions, and aggregated stats (fastest readers, completion timelines).

---

## Recent Changes

### January 2025
- **Reading Lists Domain** – Added `reading_lists`, `reading_list_items`, `reading_list_members`, `reading_list_progress`. Migration file: `backend/migrations/create_reading_lists.py`.
- **Admin Flag** – Users now carry an `is_admin` boolean surfaced in admin workflows.

### November 2024
- **LibraryBook.ownership_status** – Track whether a book is wanted, owned, or needs verification (`backend/migrations/add_ownership_and_notes.py`).
- **LibraryBook.library_notes** – Shared notes visible to all library members.
- **UserBookData.grade** – Renamed from `personal_rating` and expanded to 1–10 scale.

4. **UserBookData.completion_history** (Previously added)
   - Purpose: Track all dates when user finished reading
   - Enables "times read" counter and re-read tracking

### Bug Fixes

1. **Completion History Increment** (2024-11-04)
   - Issue: Array not updating in database
   - Fix: Added `attributes.flag_modified(personal_record, "completion_history")`
   - Location: `backend/app/api/endpoints/books.py:506`
   - Reason: SQLAlchemy doesn't auto-detect JSON field mutations

2. **BookFormDialog Infinite Loop** (2024-11-04)
   - Issue: useEffect running infinitely
   - Fix: Removed `searchMutation` from dependency array
   - Location: `frontend/src/pages/books/BookFormDialog.tsx:207`
   - Reason: Mutation object recreated on every render

---

## API Structure

### Book Detail Response
**Endpoint:** `GET /api/libraries/{library_id}/books`
**Response Type:** `LibraryBookDetail[]`

```typescript
interface LibraryBookDetail {
  book: BookV2Read;           // Intrinsic metadata
  library_book: LibraryBookRead;  // Copy-specific data
  personal_data?: UserBookDataRead | null;  // User's personal data
}
```

### Frontend Flattening
The frontend API layer (`frontend/src/api/books.ts`) flattens this structure into a single `Book` interface for easier UI consumption, mapping fields to appropriate sources.

---

## Database Migrations

### Migration Process

1. **Create Migration Script:**
   - Place in `backend/migrations/`
   - Use descriptive name: `add_<feature>_<date>.py`

2. **Migration Template:**
```python
import sqlite3
import shutil
from pathlib import Path
from datetime import datetime

def backup_database(db_path: Path) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.parent / f"{db_path.name}.backup-<name>-{timestamp}"
    shutil.copy2(db_path, backup_path)
    return backup_path

def migrate():
    db_path = Path(__file__).parent.parent / "data" / "books.db"
    backup_path = backup_database(db_path)

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Add columns
        cursor.execute("ALTER TABLE <table> ADD COLUMN <name> <type>")

        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Migration failed: {e}")
        shutil.copy2(backup_path, db_path)
        return False
```

3. **Run Migration:**
```bash
cd backend
python migrations/<migration_file>.py
```

4. **Restart Backend:**
```bash
.venv/Scripts/python.exe -m uvicorn app.main:app --reload
```

### Important Notes
- Always backup before migration
- SQLAlchemy needs server restart to load new schema
- Test with a database copy first
- For SQLite RENAME COLUMN, requires SQLite 3.25.0+

---

## Best Practices

### When Adding Fields

1. **Determine Data Tier:**
   - Intrinsic to book? → `BookV2`
   - Library copy specific? → `LibraryBook`
   - User-specific? → `UserBookData`

2. **Update Models:**
   - Add field to Base class
   - Add to Create/Update schemas
   - Update API response models

3. **Create Migration:**
   - Write migration script
   - Test on backup database
   - Document in this file

4. **Update Frontend:**
   - Add to TypeScript interfaces (`types/book.ts`)
   - Update API mapping (`api/books.ts`)
   - Add UI fields to forms (`BookFormDialog.tsx`)
   - Display in views (`BookViewTab.tsx`)

### JSON Fields and SQLAlchemy

When updating JSON/array fields in SQLAlchemy:

```python
from sqlalchemy.orm import attributes

# Create new list (don't mutate in place)
new_list = existing_record.json_field or []
new_list.append(new_value)

# Assign new list
existing_record.json_field = new_list

# IMPORTANT: Flag as modified for SQLAlchemy
attributes.flag_modified(existing_record, "json_field")

await session.commit()
```

---

## Future Considerations

### Potential Enhancements

1. **Book Sharing:**
   - Allow books to exist in multiple libraries (many-to-many)
   - Current: One-to-many (book copied to new library)

2. **Advanced Permissions:**
   - Field-level permissions
   - Custom roles beyond owner/editor/viewer

3. **Audit Trail:**
   - Track who changed what and when
   - Useful for shared libraries

4. **Bulk Operations:**
   - Batch update ownership status
   - Bulk metadata refresh

---

## Library Sharing Feature (Phase 3)

### Overview
Library sharing allows library owners to invite other users to collaborate. The system supports three roles with different permission levels.

### Role Hierarchy
1. **Owner** - Creator of the library, full control
2. **Co-owner (admin)** - Trusted collaborator, full edit access but cannot delete library
3. **Read-only (viewer)** - Can view books, request loans, copy to own library

### User Journey

#### Inviting Users
1. Owner goes to Libraries page
2. Clicks "Share" button on a library
3. Enters username of person to invite
4. Selects role (Co-owner or Read-only)
5. System creates invitation and notification

#### Accepting Invitations
1. Invitee sees notification badge
2. Opens notifications
3. Reviews invitation details (library name, role, inviter)
4. Accepts or declines
5. On accept: Library appears in their Libraries page with role badge

#### Managing Members
1. Owner/Co-owner opens library settings
2. Views list of all members with roles
3. Owner can:
   - Change member roles
   - Remove members (except themselves)
   - Cancel pending invitations
4. Co-owners can view but not modify

### API Endpoints

#### Invitations
- `POST /api/libraries/{id}/invitations` - Create invitation (owner/admin)
- `GET /api/libraries/{id}/invitations` - List invitations (owner/admin)
- `DELETE /api/libraries/{id}/invitations/{invitation_id}` - Cancel invitation (owner)
- `POST /api/invitations/{id}/accept` - Accept invitation (invitee)
- `POST /api/invitations/{id}/decline` - Decline invitation (invitee)
- `GET /api/users/invitations` - List user's pending invitations

#### Member Management
- `GET /api/libraries/{id}/members` - List members (all members)
- `PATCH /api/libraries/{id}/members/{user_id}` - Update role (owner only)
- `DELETE /api/libraries/{id}/members/{user_id}` - Remove member (owner/admin)

#### Notifications
- `GET /api/notifications` - List user notifications
- `PATCH /api/notifications/{id}/read` - Mark as read
- `POST /api/notifications/mark-all-read` - Mark all as read

### Frontend Components

#### Libraries Page
- Role badges next to library names
- Member count display
- "Share" button (owner/admin only)

#### Share Library Dialog
- Username search/input
- Role selector (Co-owner/Read-only)
- Send invitation button

#### Members Dialog
- List of members with avatars
- Role badges
- Role change dropdown (owner only)
- Remove button (owner only)

#### Notifications
- Bell icon with badge count
- Dropdown with recent notifications
- Special handling for invitation notifications

---

## Related Documentation

- [Architecture Overview](./architecture.md)
- [Testing Phase 2 Migration](../TESTING-PHASE-2-MIGRATION.md)
- [Database Migrations](../backend/migrations/)
- [API Schemas](../backend/app/api/schemas/)
