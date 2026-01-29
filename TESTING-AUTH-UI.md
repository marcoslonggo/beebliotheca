# Auth UI Testing Guide

## What Was Implemented

✅ **Frontend Authentication System**:
- Login page with email/password form
- Register page with validation
- AuthContext for managing authentication state
- JWT token storage in localStorage
- Automatic token attachment to API requests
- Protected routes (redirect to login if not authenticated)

✅ **UI Updates**:
- User avatar with initials in TopBar
- User menu with email display and logout
- Welcome message with user's full name
- Loading spinner while checking authentication

## How to Test

### 1. Start Both Backend and Frontend

**Terminal 1 - Backend:**
```bash
backend/.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Frontend should be at http://localhost:5173

### 2. Test Registration Flow

1. Visit http://localhost:5173
2. **Expected**: Automatically redirected to `/login` (not authenticated)
3. Click "Sign Up" link
4. Fill in registration form:
   - Full Name: "Test User"
   - Email: "test@example.com"
   - Password: "testpass123"
   - Confirm Password: "testpass123"
5. Click "Sign Up"
6. **Expected**:
   - Auto-logged in after registration
   - Redirected to `/books` page
   - TopBar shows your name "Test User"
   - Avatar shows initials "TU"

### 3. Test Logout

1. Click on your avatar (top right)
2. **Expected**: Menu opens showing:
   - Email: "test@example.com" (disabled)
   - Logout option
3. Click "Logout"
4. **Expected**:
   - Redirected to `/login`
   - Token removed from localStorage

### 4. Test Login Flow

1. On login page, enter:
   - Email: "test@example.com"
   - Password: "testpass123"
2. Click "Sign In"
3. **Expected**:
   - Redirected to `/books`
   - Welcome message: "Welcome back, Test User"
   - Avatar shows "TU"

### 5. Test Protected Routes

1. While logged in, note the URL: `/books`
2. Logout
3. Try to visit `/books` directly
4. **Expected**: Automatically redirected to `/login`

### 6. Test Error Handling

**Wrong Password:**
1. On login page, enter wrong password
2. **Expected**: Error message "Incorrect email or password"

**Duplicate Registration:**
1. Try to register with "test@example.com" again
2. **Expected**: Error message "Email already registered"

**Password Mismatch:**
1. On register page, enter different passwords
2. **Expected**: Error message "Passwords do not match"

**Short Password:**
1. Try password with less than 8 characters
2. **Expected**: Error message "Password must be at least 8 characters"

### 7. Test Token Persistence

1. Login successfully
2. **Refresh the page** (F5)
3. **Expected**: Still logged in (token persists in localStorage)
4. Close browser tab
5. Reopen http://localhost:5173
6. **Expected**: Still logged in

### 8. Check Browser DevTools

**localStorage:**
1. Open DevTools (F12)
2. Go to Application > Local Storage > http://localhost:5173
3. **Expected**: See `auth_token` with JWT value

**Network Requests:**
1. Open DevTools Network tab
2. Make any API request (e.g., view books)
3. Check request headers
4. **Expected**: `Authorization: Bearer eyJhbGc...` header automatically added

## Success Criteria

- [ ] ✅ Can register new account
- [ ] ✅ Auto-logged in after registration
- [ ] ✅ Can login with email/password
- [ ] ✅ User name displays in TopBar
- [ ] ✅ Avatar shows correct initials
- [ ] ✅ User menu shows email
- [ ] ✅ Can logout successfully
- [ ] ✅ Protected routes redirect to login when not authenticated
- [ ] ✅ Token persists across page refreshes
- [ ] ✅ Error messages display for invalid inputs
- [ ] ✅ JWT token automatically added to API requests

## Known Limitations (Phase 1)

- **No library selector yet** - Will be added next
- **No library management UI** - Will be added next
- **Books page not yet library-scoped** - Still using old `/api/books` endpoint
- All users can see all books (no library filtering yet)

## Next Steps

After testing authentication:
1. Add library selector component to TopBar
2. Add library management page (create/edit/delete libraries)
3. Add member management (invite users to libraries)
4. Then proceed to Phase 2: Schema split

## Troubleshooting

**"401 Unauthorized" errors:**
- Token expired (24h expiry) - logout and login again
- Backend restarted (database cleared) - register again

**Can't register:**
- Email already exists - use different email or check backend database
- Backend not running - start backend server

**Redirected to login immediately:**
- Check browser console for errors
- Clear localStorage and try again
- Check if backend is returning 401 responses
