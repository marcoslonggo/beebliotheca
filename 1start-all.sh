#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Store PIDs for cleanup
BACKEND_PID=""
FRONTEND_PID=""

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"

    if [ ! -z "$BACKEND_PID" ]; then
        echo -e "${BLUE}Stopping backend (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID 2>/dev/null
    fi

    if [ ! -z "$FRONTEND_PID" ]; then
        echo -e "${BLUE}Stopping frontend (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID 2>/dev/null
    fi

    # Kill any remaining child processes
    pkill -P $$ 2>/dev/null

    echo -e "${GREEN}Services stopped.${NC}"
    exit 0
}

# Set up trap to catch Ctrl+C
trap cleanup SIGINT SIGTERM

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Library Management System${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# Check if running from correct directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}[ERROR] backend or frontend directory not found!${NC}"
    echo "Make sure you're running this script from the library root directory."
    exit 1
fi

# Check if virtual environment exists (Windows path in WSL)
if [ -f "backend/.venv/Scripts/python.exe" ]; then
    PYTHON_BIN="backend/.venv/Scripts/python.exe"
# Check for Linux/WSL native path
elif [ -f "backend/.venv/bin/python" ]; then
    PYTHON_BIN="backend/.venv/bin/python"
else
    echo -e "${RED}[ERROR] Virtual environment not found!${NC}"
    echo "Please create the virtual environment first:"
    echo "  cd backend"
    echo "  python -m venv .venv"
    echo "  .venv/bin/pip install -r requirements.txt"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${RED}[ERROR] Frontend dependencies not installed!${NC}"
    echo "Please install them first:"
    echo "  cd frontend"
    echo "  npm install"
    exit 1
fi

echo -e "${BLUE}[1/2] Starting Backend...${NC}"
cd backend
if [ -f ".venv/Scripts/python.exe" ]; then
    .venv/Scripts/python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001 2>&1 | sed "s/^/[BACKEND] /" &
else
    .venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001 2>&1 | sed "s/^/[BACKEND] /" &
fi
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
echo -e "${YELLOW}Waiting for backend to initialize...${NC}"
sleep 3

echo -e "${BLUE}[2/2] Starting Frontend...${NC}"
echo -e "${YELLOW}Note: If mkcert certificate errors occur, the frontend will still work${NC}"
echo -e "${YELLOW}      You may need to accept a browser security warning${NC}"
cd frontend
npm run dev 2>&1 | sed "s/^/[FRONTEND] /" &
FRONTEND_PID=$!
cd ..

# Wait a bit for frontend to start
sleep 2

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Services Started Successfully!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "  ${BLUE}Backend:${NC}  http://localhost:8001"
echo -e "  ${BLUE}API Docs:${NC} http://localhost:8001/docs"
echo -e "  ${BLUE}Frontend:${NC} https://localhost:5173"
echo ""
echo -e "${YELLOW}HTTPS Note:${NC} If you see certificate warnings in browser:"
echo -e "  1. Accept the warning to proceed (safe for local dev)"
echo -e "  2. Or to fix permanently, run: ${BLUE}sudo \$HOME/.vite-plugin-mkcert/mkcert -install${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
