# Database & Caching Architecture

## Table of Contents
1. [Database Architecture](#database-architecture)
2. [Caching Strategy](#caching-strategy)
3. [Data Access Patterns](#data-access-patterns)
4. [Performance Optimization](#performance-optimization)
5. [Scaling Considerations](#scaling-considerations)

---

## 1. Database Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
│                    (FastAPI + React)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ SQL Queries
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ORM Layer (SQLModel)                         │
│           - Type-safe models                                     │
│           - Relationship management                              │
│           - Query building                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Async Sessions
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Database Driver (aiosqlite)                         │
│           - Connection pooling                                   │
│           - Async query execution                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SQLite Database                              │
│           File: backend/data/books.db                            │
│           - Single file database                                 │
│           - ACID transactions                                    │
│           - Foreign key constraints                              │
└─────────────────────────────────────────────────────────────────┘
```

### Why SQLite?

**Current Choice: SQLite**

**Advantages:**
- ✅ Zero configuration (no server to manage)
- ✅ Single file database (easy backup)
- ✅ Perfect for local-first apps
- ✅ ACID compliant
- ✅ Fast for read-heavy workloads
- ✅ Great for development and small-to-medium deployments

**Limitations:**
- ⚠️ Write concurrency (one writer at a time)
- ⚠️ No network access (must be on same machine)
- ⚠️ Not ideal for distributed systems

**When to Migrate:**
- If you need multiple backend servers (horizontal scaling)
- If you expect high concurrent writes (>100 writes/second)
- If you need replication/high availability

**Migration Path (Future):**
- PostgreSQL for production (via SQLModel - same ORM)
- Minimal code changes needed
- Add connection pooling (pgbouncer)
- Add read replicas for scaling

---

## 2. Database Schema Deep Dive

### Data Flow Architecture

```
                    ┌─────────────────────┐
                    │   External APIs     │
                    │  (OpenLibrary, etc) │
                    └─────────────────────┘
                              │
                              │ Enrichment
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BOOKS TABLE                               │
│                    (Intrinsic Metadata)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ - ISBN, Title, Authors, Publisher                        │  │
│  │ - Publication Date, Description                          │  │
│  │ - Cover URL, Subjects, Language                          │  │
│  │ - Shared across ALL users and libraries                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         ▲                           │                    ▲
         │                           │                    │
         │ References                │ References         │ References
         │                           │                    │
         │                           ▼                    │
┌─────────────────────┐   ┌─────────────────────┐   ┌──────────────────┐
│  LIBRARY_BOOKS      │   │  USER_BOOK_DATA     │   │ ENRICHMENT_JOBS  │
│  (Physical Copies)  │   │  (Personal Data)    │   │ (Metadata Tasks) │
├─────────────────────┤   ├─────────────────────┤   ├──────────────────┤
│ - Location          │   │ - Reading Status    │   │ - Book ID        │
│ - Condition         │   │ - Progress Pages    │   │ - Status         │
│ - Loan Status       │   │ - Private Notes     │   │ - Attempts       │
│ - Checked Out To    │   │ - Personal Rating   │   │ - Last Error     │
│ - Library Notes     │   │ - Started/Finished  │   └──────────────────┘
│ - Edition           │   │ - Favorite Flag     │
└─────────────────────┘   │ - Personal Tags     │
         ▲                └─────────────────────┘
         │                          ▲
         │ Belongs To               │ Belongs To
         │                          │
         ▼                          │
┌─────────────────────┐            │
│     LIBRARIES       │            │
│  (Shared Context)   │            │
├─────────────────────┤            │
│ - Name              │            │
│ - Description       │            │
│ - Type              │            │
│ - Settings          │            │
└─────────────────────┘            │
         ▲                          │
         │                          │
         │ N:N via                  │ Owned By
         │ LibraryMember            │
         │                          │
         └──────────┬───────────────┘
                    │
                    ▼
            ┌───────────────┐
            │    USERS      │
            │ (Auth + Info) │
            ├───────────────┤
            │ - Email       │
            │ - Password    │
            │ - Username    │
            │ - Avatar      │
            │ - Preferences │
            └───────────────┘
```

### Table Relationships Explained

#### 1. **USERS** (Central Entity)
- **Purpose**: Represents individual people
- **Key**: UUID primary key
- **Relationships**:
  - Many-to-Many with `libraries` via `library_members`
  - One-to-Many with `user_book_data`

#### 2. **LIBRARIES** (Tenant Isolation)
- **Purpose**: Represents shared collections
- **Key**: UUID primary key
- **Isolation**: Each library is a separate "tenant"
- **Relationships**:
  - Many-to-Many with `users` via `library_members`
  - One-to-Many with `library_books`

#### 3. **LIBRARY_MEMBERS** (Junction Table)
- **Purpose**: Links users to libraries with roles
- **Key**: Composite unique constraint on (user_id, library_id)
- **Role**: Determines permissions (owner, admin, member, viewer)
- **Critical for**: Authorization checks

#### 4. **BOOKS** (Global Shared Data)
- **Purpose**: Immutable book metadata
- **Key**: UUID primary key, unique ISBN
- **Shared**: One book record serves all users/libraries
- **Updated**: Only by enrichment system
- **Never deleted**: Soft delete if needed

#### 5. **LIBRARY_BOOKS** (Physical Instances)
- **Purpose**: Represents physical copies in libraries
- **Key**: UUID primary key, unique constraint on (library_id, book_id)
- **Important**: Same book can exist in multiple libraries as separate records
- **Contains**: Location, condition, loan tracking

#### 6. **USER_BOOK_DATA** (Personal Tracking)
- **Purpose**: User's personal reading information
- **Key**: UUID primary key, unique constraint on (user_id, book_id)
- **Privacy**: Private by default, optionally shareable
- **Nullable library_book_id**: Users can track books not in their libraries (wishlists)

---

## 3. Caching Strategy

### Why Cache?

**Without Caching:**
```
User Request → API → Database Query → Response
   (50-100ms per request)

Problem: Repeated queries for same data
- User profile loaded on every page
- Library list fetched multiple times
- Book metadata re-fetched unnecessarily
```

**With Caching:**
```
User Request → API → Check Cache → Return Cached Data
                          ↓ (cache miss)
                     Database Query → Cache + Response
   (1-5ms from cache, 50-100ms on cache miss)
```

### Caching Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND CACHING                             │
│                  (React Query / TanStack Query)                  │
├─────────────────────────────────────────────────────────────────┤
│  Purpose: Client-side caching of API responses                  │
│  Duration: 5 minutes (configurable)                             │
│  Benefits: Reduces network requests, instant UI updates         │
│                                                                  │
│  Example:                                                        │
│    useQuery(['books', libraryId], fetchBooks, {                 │
│      staleTime: 5 * 60 * 1000,  // 5 minutes                    │
│      cacheTime: 10 * 60 * 1000  // 10 minutes                   │
│    })                                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND CACHING                              │
│                    (Redis - Optional)                            │
├─────────────────────────────────────────────────────────────────┤
│  Purpose: Server-side caching for expensive operations          │
│  Duration: Varies by data type (see below)                      │
│  Benefits: Reduces database load, faster response times         │
│                                                                  │
│  What to Cache:                                                  │
│  ✅ User sessions (JWT validation)                              │
│  ✅ Library book lists (5 min TTL)                              │
│  ✅ Book metadata (30 min TTL, rarely changes)                  │
│  ✅ User permissions (10 min TTL)                               │
│  ✅ Enrichment results (until book updated)                     │
│                                                                  │
│  What NOT to Cache:                                              │
│  ❌ User book data (frequently updated)                         │
│  ❌ Loan status (real-time critical)                            │
│  ❌ Activity feeds (recent activity matters)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER                               │
│                        (SQLite)                                  │
├─────────────────────────────────────────────────────────────────┤
│  Source of truth for all data                                   │
│  Always consistent                                               │
│  Cache invalidated when data changes                            │
└─────────────────────────────────────────────────────────────────┘
```

### Cache Invalidation Strategy

**Pattern: Write-Through with Invalidation**

```python
# Example: Update book in library
async def update_library_book(library_id, book_id, updates):
    # 1. Update database
    await db.execute(
        update(LibraryBook)
        .where(LibraryBook.id == book_id)
        .values(**updates)
    )
    await db.commit()

    # 2. Invalidate related caches
    await cache.delete(f"library:{library_id}:books")
    await cache.delete(f"library_book:{book_id}")

    # 3. Optionally: Update cache immediately (write-through)
    updated_book = await db.get(LibraryBook, book_id)
    await cache.set(f"library_book:{book_id}", updated_book, ttl=600)

    return updated_book
```

### Cache Keys Pattern

```
Format: {entity_type}:{entity_id}:{optional_context}

Examples:
- user:{user_id}                     → User profile
- user:{user_id}:libraries           → User's library list
- library:{library_id}:books         → All books in library
- library:{library_id}:members       → Library members
- book:{book_id}                     → Book intrinsic metadata
- library_book:{library_book_id}     → Physical copy data
- permissions:{user_id}:{library_id} → User's role in library
```

### React Query Caching (Frontend)

```typescript
// Query keys strategy
const queryKeys = {
  libraries: ['libraries'] as const,
  library: (id: string) => ['libraries', id] as const,
  libraryBooks: (id: string) => ['libraries', id, 'books'] as const,
  book: (id: string) => ['books', id] as const,
  userBooks: ['user', 'books'] as const,
  userBookData: (bookId: string) => ['user', 'books', bookId] as const,
}

// Cache invalidation on mutations
const checkoutBookMutation = useMutation({
  mutationFn: checkoutBook,
  onSuccess: (data, variables) => {
    // Invalidate library books list
    queryClient.invalidateQueries(queryKeys.libraryBooks(variables.libraryId))

    // Invalidate specific book
    queryClient.invalidateQueries(queryKeys.book(variables.bookId))

    // Optionally: Update cache directly (optimistic update)
    queryClient.setQueryData(queryKeys.book(variables.bookId), data)
  }
})
```

---

## 4. Data Access Patterns

### Pattern 1: Reading Book Data (Most Common)

**Scenario**: User views a book in their library

```
Request Flow:

1. Frontend: GET /api/v2/libraries/{library_id}/books/{book_id}
   ↓
2. Backend: Check permissions (via LibraryMember)
   ↓
3. Backend: Check cache for combined data
   ↓ (cache miss)
4. Backend: Execute JOIN query:

   SELECT
     lb.*,           -- LibraryBook (location, condition, loan status)
     b.*,            -- Book (title, author, ISBN, cover)
     ubd.*           -- UserBookData (reading status, notes, rating)
   FROM library_books lb
   JOIN books b ON lb.book_id = b.id
   LEFT JOIN user_book_data ubd ON ubd.book_id = b.id AND ubd.user_id = ?
   WHERE lb.library_id = ? AND lb.id = ?

   ↓
5. Backend: Cache the result (5 min TTL)
   ↓
6. Backend: Return combined JSON
   ↓
7. Frontend: Cache in React Query (5 min)
   ↓
8. Frontend: Display book with all context
```

**Performance**:
- First request: ~50ms (database query)
- Subsequent requests: ~1ms (cache hit)

### Pattern 2: Listing Books in Library

**Scenario**: User browses their library

```
Request Flow:

1. Frontend: GET /api/v2/libraries/{library_id}/books?skip=0&limit=50
   ↓
2. Backend: Check permissions
   ↓
3. Backend: Check cache
   ↓ (cache miss)
4. Backend: Execute paginated query with JOIN:

   SELECT lb.*, b.*, ubd.*
   FROM library_books lb
   JOIN books b ON lb.book_id = b.id
   LEFT JOIN user_book_data ubd ON ubd.book_id = b.id AND ubd.user_id = ?
   WHERE lb.library_id = ?
   ORDER BY b.title
   LIMIT 50 OFFSET 0

   -- Also get total count
   SELECT COUNT(*) FROM library_books WHERE library_id = ?

   ↓
5. Backend: Cache the result page (5 min TTL)
   ↓
6. Backend: Return paginated response
   ↓
7. Frontend: Cache in React Query
   ↓
8. Frontend: Display DataGrid with pagination
```

**Optimization**:
- Pagination reduces query size
- Indexes on `library_id` make this fast
- Cache entire page to avoid repeated queries

### Pattern 3: User's Reading List (Cross-Library)

**Scenario**: User wants to see all books they're currently reading

```
Request Flow:

1. Frontend: GET /api/v2/user-books?status=currently_reading
   ↓
2. Backend: Query UserBookData with joins:

   SELECT
     ubd.*,
     b.*,
     lb.physical_location,
     l.name as library_name
   FROM user_book_data ubd
   JOIN books b ON ubd.book_id = b.id
   LEFT JOIN library_books lb ON ubd.library_book_id = lb.id
   LEFT JOIN libraries l ON lb.library_id = l.id
   WHERE ubd.user_id = ?
     AND ubd.reading_status = 'currently_reading'
   ORDER BY ubd.started_reading DESC

   ↓
3. Backend: Cache per user (short TTL, 2 min)
   ↓
4. Backend: Return list
   ↓
5. Frontend: Display "Currently Reading" page
```

**Why Short Cache?**:
- Reading progress updates frequently
- Status changes (mark as finished)
- User expectations of "fresh" data

### Pattern 4: Permission Check (Authorization)

**Scenario**: Every protected endpoint

```
Request Flow:

1. Request arrives with JWT token
   ↓
2. Middleware: Validate JWT
   ↓
3. Middleware: Extract user_id
   ↓
4. Endpoint: Check cache for permissions:

   Key: permissions:{user_id}:{library_id}

   ↓ (cache miss)
5. Endpoint: Query LibraryMember:

   SELECT role, permissions
   FROM library_members
   WHERE user_id = ? AND library_id = ?

   ↓
6. Endpoint: Cache role (10 min TTL)
   ↓
7. Endpoint: Check role against required permission
   ↓
8. Endpoint: Allow or deny request
```

**Critical Path**:
- Must be fast (every request)
- Cache hit rate should be >95%
- Permission cache TTL: 10 minutes (balance security vs performance)

---

## 5. Performance Optimization

### Database Indexes

**Purpose**: Speed up queries by creating B-tree indexes

```sql
-- User lookups
CREATE UNIQUE INDEX idx_user_email ON users(email);
CREATE UNIQUE INDEX idx_user_username ON users(username);

-- Book lookups
CREATE UNIQUE INDEX idx_book_isbn ON books(isbn);
CREATE INDEX idx_book_title ON books(title);  -- For search

-- LibraryMember lookups (permission checks)
CREATE INDEX idx_library_member_user ON library_members(user_id);
CREATE INDEX idx_library_member_library ON library_members(library_id);
CREATE UNIQUE INDEX idx_library_member_unique
  ON library_members(user_id, library_id);

-- LibraryBook lookups (most common queries)
CREATE INDEX idx_library_book_library ON library_books(library_id);
CREATE INDEX idx_library_book_book ON library_books(book_id);
CREATE INDEX idx_library_book_checked_out ON library_books(checked_out_to);
CREATE UNIQUE INDEX idx_library_book_unique
  ON library_books(library_id, book_id);

-- UserBookData lookups
CREATE INDEX idx_user_book_data_user ON user_book_data(user_id);
CREATE INDEX idx_user_book_data_book ON user_book_data(book_id);
CREATE INDEX idx_user_book_data_status
  ON user_book_data(user_id, reading_status);
CREATE UNIQUE INDEX idx_user_book_data_unique
  ON user_book_data(user_id, book_id);

-- Activity log queries
CREATE INDEX idx_library_activity_library ON library_activity(library_id);
CREATE INDEX idx_library_activity_timestamp
  ON library_activity(timestamp DESC);
```

**Index Strategy**:
- ✅ Index foreign keys (JOIN optimization)
- ✅ Index columns used in WHERE clauses
- ✅ Index columns used in ORDER BY
- ✅ Unique indexes for business constraints
- ⚠️ Don't over-index (slows down writes)

### Query Optimization Techniques

#### 1. **Select Only What You Need**

```python
# ❌ Bad: Select everything
books = await session.execute(
    select(Book).where(Book.id == book_id)
)

# ✅ Good: Select specific columns
books = await session.execute(
    select(Book.id, Book.title, Book.authors, Book.cover_url)
    .where(Book.id == book_id)
)
```

#### 2. **Use JOIN Instead of N+1 Queries**

```python
# ❌ Bad: N+1 query problem
library_books = await session.execute(
    select(LibraryBook).where(LibraryBook.library_id == library_id)
)
for lb in library_books:
    book = await session.get(Book, lb.book_id)  # N additional queries!

# ✅ Good: Single query with JOIN
results = await session.execute(
    select(LibraryBook, Book)
    .join(Book, LibraryBook.book_id == Book.id)
    .where(LibraryBook.library_id == library_id)
)
```

#### 3. **Pagination for Large Result Sets**

```python
# Always paginate lists
def list_books(library_id, skip=0, limit=50):
    query = (
        select(LibraryBook, Book)
        .join(Book)
        .where(LibraryBook.library_id == library_id)
        .order_by(Book.title)
        .offset(skip)
        .limit(limit)
    )
    return await session.execute(query)
```

#### 4. **Eager Loading Relationships**

```python
# Load related data in one query
library = await session.execute(
    select(Library)
    .options(selectinload(Library.members))  # Eager load members
    .where(Library.id == library_id)
)
```

### Connection Pooling

**SQLite**: Limited concurrency, but can still benefit from pooling

```python
# backend/app/db/session.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine(
    "sqlite+aiosqlite:///./data/books.db",
    echo=False,  # Set True for query debugging
    pool_size=20,  # Number of connections to maintain
    max_overflow=10,  # Additional connections if pool exhausted
    pool_pre_ping=True,  # Check connection health before using
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Don't expire objects after commit
)
```

---

## 6. Scaling Considerations

### Current Architecture (Single Server)

```
┌──────────────────────────────────────────────┐
│             Single Server                    │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │     FastAPI Application                │ │
│  └────────────────────────────────────────┘ │
│                    │                         │
│                    ▼                         │
│  ┌────────────────────────────────────────┐ │
│  │     SQLite Database                    │ │
│  │     (books.db file)                    │ │
│  └────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘

Capacity: ~1000 users, 50 concurrent requests
```

### Scaling Path 1: Add Redis Cache (Medium Scale)

```
┌──────────────────────────────────────────────┐
│             Single Server                    │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │     FastAPI Application                │ │
│  └────────────────────────────────────────┘ │
│           │              │                   │
│           ▼              ▼                   │
│  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Redis     │  │  SQLite Database    │  │
│  │   Cache     │  │  (books.db)         │  │
│  └─────────────┘  └─────────────────────┘  │
└──────────────────────────────────────────────┘

Capacity: ~5000 users, 200 concurrent requests
Benefits: Much faster reads, reduced DB load
```

### Scaling Path 2: Move to PostgreSQL (Large Scale)

```
┌──────────────────┐         ┌──────────────────┐
│  Load Balancer   │         │  Load Balancer   │
└──────────────────┘         └──────────────────┘
         │                            │
    ┌────┴─────┐                 ┌───┴────┐
    ▼          ▼                 ▼        ▼
┌────────┐ ┌────────┐      ┌────────┐ ┌────────┐
│FastAPI │ │FastAPI │      │FastAPI │ │FastAPI │
│Server 1│ │Server 2│      │Server 3│ │Server 4│
└────────┘ └────────┘      └────────┘ └────────┘
    │          │                │        │
    └──────────┴────────┬───────┴────────┘
                        │
                        ▼
              ┌───────────────────┐
              │   Redis Cluster   │
              │   (Shared Cache)  │
              └───────────────────┘
                        │
                        ▼
              ┌───────────────────┐
              │   PostgreSQL      │
              │   Primary         │
              └───────────────────┘
                        │
                 ┌──────┴──────┐
                 ▼             ▼
         ┌──────────┐   ┌──────────┐
         │PostgreSQL│   │PostgreSQL│
         │Replica 1 │   │Replica 2 │
         └──────────┘   └──────────┘

Capacity: 100,000+ users, 10,000+ concurrent requests
```

### When to Scale?

**Stay with SQLite when:**
- ✅ < 1000 active users
- ✅ < 50 concurrent requests
- ✅ Single server deployment
- ✅ Read-heavy workload
- ✅ Development/testing

**Add Redis when:**
- ⚠️ Response times > 200ms
- ⚠️ Database CPU usage > 70%
- ⚠️ Same queries running repeatedly
- ⚠️ 100-500 concurrent requests

**Migrate to PostgreSQL when:**
- 🔴 Need horizontal scaling (multiple servers)
- 🔴 Write concurrency issues (lock contention)
- 🔴 Need replication for high availability
- 🔴 Database file size > 10GB
- 🔴 1000+ concurrent requests

---

## 7. Backup & Recovery Strategy

### SQLite Backup (Simple)

```bash
# Automated daily backup script
#!/bin/bash
BACKUP_DIR="/backups"
DB_FILE="./data/books.db"
DATE=$(date +%Y%m%d_%H%M%S)

# Copy database file (SQLite VACUUM INTO for consistency)
sqlite3 $DB_FILE "VACUUM INTO '$BACKUP_DIR/books_$DATE.db'"

# Keep last 30 days of backups
find $BACKUP_DIR -name "books_*.db" -mtime +30 -delete

# Upload to cloud storage (optional)
aws s3 cp $BACKUP_DIR/books_$DATE.db s3://mybucket/backups/
```

**Schedule**: Daily at 2 AM (cron job)

### Recovery Testing

```bash
# Test restore procedure monthly
cp /backups/books_LATEST.db ./data/books_test.db
python -m backend.app.main --db=./data/books_test.db --test-restore
```

---

## 8. Monitoring & Observability

### Key Metrics to Track

```python
# Example: Add metrics collection
from prometheus_client import Counter, Histogram

# Request metrics
http_requests_total = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
http_request_duration = Histogram('http_request_duration_seconds', 'HTTP request duration')

# Database metrics
db_query_duration = Histogram('db_query_duration_seconds', 'Database query duration', ['query_type'])
db_query_total = Counter('db_queries_total', 'Total database queries', ['query_type'])

# Cache metrics
cache_hits = Counter('cache_hits_total', 'Total cache hits', ['cache_key'])
cache_misses = Counter('cache_misses_total', 'Total cache misses', ['cache_key'])

# Business metrics
books_added = Counter('books_added_total', 'Total books added', ['library_id'])
books_checked_out = Counter('books_checked_out_total', 'Total book checkouts')
```

### Health Check Endpoint

```python
@app.get("/health")
async def health_check():
    # Check database connection
    db_healthy = await check_db_connection()

    # Check cache connection (if using Redis)
    cache_healthy = await check_cache_connection()

    return {
        "status": "healthy" if all([db_healthy, cache_healthy]) else "degraded",
        "database": "up" if db_healthy else "down",
        "cache": "up" if cache_healthy else "down",
        "timestamp": datetime.utcnow().isoformat()
    }
```

---

## Summary

### Architecture Overview

**Data Flow:**
1. User request → FastAPI → Check permissions
2. Check cache (React Query + optional Redis)
3. Query database with JOINs (minimize round trips)
4. Cache result (appropriate TTL)
5. Return to user

**Key Principles:**
- ✅ **Separation of Concerns**: Intrinsic | Library | User data
- ✅ **Cache Aggressively**: Both frontend and backend
- ✅ **Index Strategically**: Foreign keys + query patterns
- ✅ **Paginate Everything**: Never load all data
- ✅ **Monitor Performance**: Track query times and cache hit rates

**Scaling Path:**
1. Start: SQLite (sufficient for most use cases)
2. Add: Redis caching (when needed)
3. Migrate: PostgreSQL (for large scale)

**Current Target:**
- 1000+ users
- 100+ libraries
- 10,000+ books
- <100ms average response time
- >95% cache hit rate
