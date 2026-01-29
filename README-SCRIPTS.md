# Library Management Scripts

This directory contains scripts to help you manage the backend and frontend services.

## Quick Start (Batch Files - Simple)

### Start Everything
```bash
.\start-all.bat
```
Double-click or run from command prompt. Opens both backend and frontend in separate windows.

### Start Services Individually
```bash
.\start-backend.bat   # Backend only
.\start-frontend.bat  # Frontend only
```

**To stop:** Simply close the terminal windows.

---

## Advanced Management (PowerShell - Recommended)

### Interactive Menu
```powershell
.\manage.ps1
```

This launches an interactive menu where you can:

**Start Services:**
- `1` - Start Backend
- `2` - Start Frontend
- `3` - Start Both

**Stop Services:**
- `4` - Stop Backend
- `5` - Stop Frontend
- `6` - Stop Both

**Restart Services:**
- `7` - Restart Backend
- `8` - Restart Frontend
- `9` - Restart Both

**Other Options:**
- `s` - Show detailed status (PID, memory usage, URLs)
- `l` - Show log information
- `q` - Quit (optionally stop services)

### Features:
- ✅ Process tracking with PID files
- ✅ Status monitoring (running/stopped)
- ✅ Memory usage display
- ✅ Colored output
- ✅ Graceful shutdown
- ✅ Separate windows for each service

---

## Service URLs

Once started, access the services at:

- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **Frontend:** http://localhost:5173

---

## Troubleshooting

### PowerShell Execution Policy
If you get an error about scripts being disabled:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port Already in Use
If ports 8000 or 5173 are busy:

1. Find and kill the process:
   ```powershell
   # Find process using port 8000
   netstat -ano | findstr :8000

   # Kill the process (replace PID)
   taskkill /PID <PID> /F
   ```

2. Or change the port in the scripts:
   - Backend: Edit port in `manage.ps1` or `start-backend.bat`
   - Frontend: Edit `vite.config.ts` in the frontend folder

### Services Won't Stop
Use the PowerShell script's stop functions, or:

```powershell
# Kill all Python processes (backend)
taskkill /F /IM python.exe

# Kill all Node processes (frontend)
taskkill /F /IM node.exe
```

---

## Development Tips

### Backend Development
- Backend runs with `--reload` flag (auto-restarts on code changes)
- API docs available at `/docs` endpoint
- Check backend logs in its terminal window

### Frontend Development
- Frontend runs Vite dev server with HMR (hot module reload)
- Changes reflect instantly in browser
- Check frontend logs in its terminal window

### Making Changes
Both services support hot-reload, so you typically don't need to restart them during development. Only restart if:
- Installing new dependencies
- Changing configuration files
- Troubleshooting issues

---

## File Locations

- `manage.ps1` - PowerShell management script (recommended)
- `start-all.bat` - Quick start both services
- `start-backend.bat` - Start backend only
- `start-frontend.bat` - Start frontend only
- `.backend.pid` - Backend process ID (auto-generated)
- `.frontend.pid` - Frontend process ID (auto-generated)
