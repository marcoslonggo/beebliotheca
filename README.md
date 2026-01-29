# Book Inventory App

Local-first web app for cataloging physical books with barcode scanning and metadata enrichment.

## Quick Start (Docker)
1. Copy `.env.docker.example` to `.env.docker` and set a strong `APP_SECRET_KEY`.
2. Run:
   ```bash
   docker compose --env-file .env.docker up --build
   ```
3. Open:
   - Frontend: http://localhost:8080
   - Backend: http://localhost:8000

## Local Dev (no Docker)
Backend:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -e .
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Data Persistence
SQLite DB and uploaded covers are stored in `backend/data/` (ignored by git). The DB is created automatically on first run.
