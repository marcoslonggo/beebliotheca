# Library Management UI - Testing Guide

## What Was Implemented

✅ **Library Context**:
- Manages current library state across the app
- Auto-selects first library on load
- Persists selection in localStorage
- Provides library switching functionality

✅ **Library Selector** (TopBar):
- Dropdown to view and switch between libraries
- Shows current library name with icon
- "Create Library" button when no libraries exist
- "Manage Libraries" option in menu
- Matches existing UI design patterns

✅ **Libraries Management Page**:
- Grid view of all user libraries
- Create/Edit/Delete functionality
- Owner/Member badges
- Deletion confirmation dialog
- Empty state with call-to-action

✅ **Sidebar Navigation**:
- Added "Libraries" menu item with icon

## How to Test

### Prerequisites
Make sure both backend and frontend are running, and you're logged in.

### 1. First Time Experience (No Libraries)

1. **Login** to the app
2. **Check TopBar** (top right area, before search box)
   - ✅ Should see "Create Library" button
3. **Click "Create Library"**
   - ✅ Should navigate to `/libraries` page
   - ✅ Should show empty state alert
4. **Click "Create Library" on empty state**
   - ✅ Dialog opens with form

### 2. Create Your First Library

1. In the Create Library dialog:
   - **Name**: "My Home Library"
   - **Description**: "Books at home"
2. Click "Create"
3. **Expected**:
   - ✅ Dialog closes
   - ✅ Library card appears in grid
   - ✅ Card shows "Owner" badge
   - ✅ TopBar now shows library selector with "My Home Library"

### 3. Create Second Library

1. Click "Create Library" button (top right)
2. Fill in:
   - **Name**: "Office Library"
   - **Description**: "Books at the office"
3. Click "Create"
4. **Expected**:
   - ✅ Second library card appears
   - ✅ Both libraries visible in grid

### 4. Test Library Selector

1. **Click the library selector** in TopBar (shows current library name)
2. **Expected Menu**:
   - ✅ Header: "YOUR LIBRARIES"
   - ✅ List of both libraries
   - ✅ Currently selected library is highlighted
   - ✅ Divider line
   - ✅ "Manage Libraries" option at bottom

3. **Click on "Office Library"**
   - ✅ Menu closes
   - ✅ TopBar updates to show "Office Library"
   - ✅ Selection persists (check by refreshing page)

### 5. Edit a Library

1. On Libraries page, find library card
2. **Click Edit icon** (pencil, top right of card)
3. **Expected**:
   - ✅ Dialog opens with current values pre-filled
4. Change description to something new
5. Click "Update"
6. **Expected**:
   - ✅ Card updates with new description

### 6. Test Permissions

**As Owner:**
- ✅ Can see Edit and Delete buttons
- ✅ Card shows "Owner" badge (blue/primary color)
- ✅ Can edit library details
- ✅ Can delete library

**As Member** (will test later when member management is added):
- Shows "Member" badge (gray/default color)
- No Edit/Delete buttons visible

### 7. Delete a Library

1. **Click Delete icon** (trash, top right of card)
2. **Expected**:
   - ✅ Confirmation dialog appears
   - ✅ Shows library name in warning message
   - ✅ Warning icon displayed
3. **Click "Cancel"**
   - ✅ Dialog closes, nothing deleted
4. **Click Delete icon again**
5. **Click "Delete"**
6. **Expected**:
   - ✅ Library removed from grid
   - ✅ If it was selected, selector switches to another library
   - ✅ If it was the last library, TopBar shows "Create Library" button

### 8. Navigation Test

1. **Click "Libraries"** in sidebar (left menu)
   - ✅ Navigates to `/libraries`
   - ✅ Menu item highlights
2. **Click "Books"** in sidebar
   - ✅ Navigates to `/books`
   - ✅ Library selector still visible in TopBar
3. Navigate back to Libraries
   - ✅ Same libraries still there

### 9. Persistence Test

1. Select a specific library from selector
2. **Refresh the page** (F5)
3. **Expected**:
   - ✅ Same library still selected
   - ✅ Shows in TopBar

4. **Close browser tab**
5. **Reopen** http://localhost:5173
6. **Expected**:
   - ✅ Same library still selected

### 10. Visual Design Check

**Library Cards:**
- ✅ Rounded corners (borderRadius: 3)
- ✅ Hover effect (lifts up slightly)
- ✅ Shadow on hover
- ✅ Clean spacing and typography
- ✅ Owner/Member badges match app theme

**Library Selector:**
- ✅ Matches TopBar design style
- ✅ Icon + text layout
- ✅ Dropdown arrow icon
- ✅ Subtle background color (alpha primary)
- ✅ Smooth hover effect

**Forms:**
- ✅ Clean dialog with rounded corners
- ✅ Proper spacing
- ✅ Validation (try creating without name)
- ✅ Loading states ("Saving..." text)

## Success Criteria

Before committing, verify:

- [ ] ✅ Can create libraries
- [ ] ✅ Can edit libraries (owner only)
- [ ] ✅ Can delete libraries (owner only)
- [ ] ✅ Library selector appears in TopBar
- [ ] ✅ Can switch between libraries
- [ ] ✅ Selected library persists across refreshes
- [ ] ✅ Empty state shows when no libraries
- [ ] ✅ "Libraries" menu item in sidebar
- [ ] ✅ Owner/Member badges display correctly
- [ ] ✅ Delete confirmation works
- [ ] ✅ UI matches existing design patterns
- [ ] ✅ No console errors

## Known Limitations (Phase 1)

- **Books not library-scoped yet** - All users see all books (Phase 2 will fix this)
- **Member count not shown** - Shows "Members" placeholder (will add in member management)
- **Can't invite members yet** - Member management UI coming next
- **No member list** - Will add member management dialog

## Next Steps

After this is tested and committed:
1. Build member management UI (invite users, manage roles)
2. Then proceed to Phase 2: Schema split
3. Update books endpoints to be library-scoped

## Troubleshooting

**Library selector doesn't appear:**
- Make sure you created at least one library
- Check browser console for errors
- Verify LibraryContext is providing data

**Can't delete library:**
- Check you're the owner (blue "Owner" badge)
- Check browser console for API errors
- Verify backend endpoint is working

**Selection not persisting:**
- Check localStorage in DevTools
- Look for `current_library_id` key
- Clear localStorage and try again
