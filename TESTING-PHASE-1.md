# Phase 1 Backend Testing Guide

## What Was Implemented

✅ **Database Models**:
- `User` - User accounts with email, password hash, full name
- `Library` - Libraries owned by users
- `LibraryMember` - Junction table for library membership with roles (owner, admin, member, viewer)

✅ **Auth Services**:
- JWT token creation and verification (24h expiry)
- Password hashing with bcrypt
- Bearer token authentication dependency

✅ **Auth Endpoints** (`/api/auth`):
- `POST /auth/register` - Create new user
- `POST /auth/login` - Login and receive JWT token
- `GET /auth/me` - Get current authenticated user info

✅ **Library Endpoints** (`/api/libraries`):
- `POST /libraries` - Create library (user becomes owner)
- `GET /libraries` - List user's libraries
- `GET /libraries/{id}` - Get single library
- `PATCH /libraries/{id}` - Update library (owner/admin only)
- `DELETE /libraries/{id}` - Delete library (owner only)
- `GET /libraries/{id}/members` - List library members
- `POST /libraries/{id}/members` - Add member (owner/admin only)
- `PATCH /libraries/{id}/members/{user_id}` - Update member role (owner only)
- `DELETE /libraries/{id}/members/{user_id}` - Remove member (owner/admin only)

## Pre-Commit Testing

### 1. Start the Backend Server

```bash
cd backend
../.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir .
```

**Expected**: Server starts without errors. You should see:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 2. Test Auth Endpoints

#### Register a User
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","full_name":"Test User","password":"testpass123"}'
```

**Expected**: Returns user object with UUID, email, full_name, created_at, updated_at
```json
{
  "id": "uuid-here",
  "email": "test@example.com",
  "full_name": "Test User",
  "created_at": "2025-11-03T...",
  "updated_at": "2025-11-03T..."
}
```

#### Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

**Expected**: Returns JWT token
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Save the token for next tests!**

#### Get Current User
```bash
TOKEN="your-token-here"
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: Returns current user info (same as registration response)

### 3. Test Library Endpoints

#### Create a Library
```bash
TOKEN="your-token-here"
curl -X POST http://localhost:8000/api/libraries \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Home Library","description":"Books at home"}'
```

**Expected**: Returns library object with UUID, name, description, owner_id
```json
{
  "id": "library-uuid",
  "name": "My Home Library",
  "description": "Books at home",
  "owner_id": "user-uuid",
  "created_at": "2025-11-03T...",
  "updated_at": "2025-11-03T..."
}
```

#### List Libraries
```bash
TOKEN="your-token-here"
curl -X GET http://localhost:8000/api/libraries \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: Returns array with the library you just created

#### Get Single Library
```bash
TOKEN="your-token-here"
LIBRARY_ID="library-uuid-from-above"
curl -X GET http://localhost:8000/api/libraries/$LIBRARY_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: Returns the library details

#### List Library Members
```bash
TOKEN="your-token-here"
LIBRARY_ID="library-uuid-from-above"
curl -X GET http://localhost:8000/api/libraries/$LIBRARY_ID/members \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: Returns array with one member (you as owner)
```json
[
  {
    "id": "member-uuid",
    "library_id": "library-uuid",
    "user_id": "user-uuid",
    "role": "owner",
    "joined_at": "2025-11-03T..."
  }
]
```

### 4. Test Error Cases

#### Register Duplicate Email
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","full_name":"Another User","password":"pass123"}'
```

**Expected**: 400 Bad Request with message "Email already registered"

#### Login with Wrong Password
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpass"}'
```

**Expected**: 401 Unauthorized with message "Incorrect email or password"

#### Access Protected Endpoint Without Token
```bash
curl -X GET http://localhost:8000/api/auth/me
```

**Expected**: 401 Unauthorized (requires Authorization header)

#### Access Library Without Membership
```bash
# Register second user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user2@example.com","full_name":"User Two","password":"pass123"}'

# Login as second user
TOKEN2=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user2@example.com","password":"pass123"}' | jq -r '.access_token')

# Try to access first user's library
LIBRARY_ID="library-uuid-from-first-user"
curl -X GET http://localhost:8000/api/libraries/$LIBRARY_ID \
  -H "Authorization: Bearer $TOKEN2"
```

**Expected**: 403 Forbidden with message "You are not a member of this library"

### 5. Verify Database

Check that the database was created and has the new tables:

```bash
cd backend/data
# Use SQLite browser or command line to inspect books.db
# You should see new tables: users, libraries, library_members
```

**Expected tables**:
- `users` - Has your test user
- `libraries` - Has your test library
- `library_members` - Has membership record linking user to library with role="owner"
- `books`, `series`, `enrichment_jobs` - Still exist (unchanged)

### 6. Verify Existing /api/books Still Works

```bash
curl -X GET http://localhost:8000/api/books
```

**Expected**: Returns existing books (if any). Endpoint should still work unchanged.

## Automated Tests

Run the existing backend tests:

```bash
cd backend
../.venv/Scripts/python.exe -m pytest
```

**Expected**: All existing tests pass (no regression)

## Success Criteria

Before committing, verify:

- [ ] ✅ Server starts without errors
- [ ] ✅ User can register with email/password
- [ ] ✅ User can login and receive JWT token
- [ ] ✅ `/api/auth/me` returns authenticated user info
- [ ] ✅ User can create a library
- [ ] ✅ User can list their libraries
- [ ] ✅ User can view library details
- [ ] ✅ Library creator is automatically added as owner member
- [ ] ✅ Error handling works (duplicate email, wrong password, unauthorized access)
- [ ] ✅ Existing `/api/books` endpoints still work (no regression)
- [ ] ✅ Database has new tables with correct data
- [ ] ✅ All automated tests pass

## Known Issues / Notes

- **SECRET_KEY**: Currently hardcoded in `backend/app/services/auth.py`. Should be moved to environment variable in production.
- **bcrypt version**: Pinned to <5.0 due to passlib compatibility. This is intentional.
- **Existing books endpoints**: Unchanged in Phase 1. Will be updated in Phase 3.

## Next Steps

After this commit:
- Phase 1 backend is complete ✅
- Next: Frontend auth context and login UI
- Then: Library selector and management UI
- Finally: Update documentation with Phase 1 completion
