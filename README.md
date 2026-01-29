# Book Inventory App

Local-first web app for cataloging physical books with barcode scanning and metadata enrichment.

## Quick Start (Docker)
1. Copy `.env.docker.example` to `.env.docker` and set a strong `APP_SECRET_KEY`.
2. Run:
   ```bash
   docker compose --env-file .env.docker up --build
   ```
3. Open:
   - App UI: http://localhost:8080
   - API: http://localhost:8080/api

## Docker Deployment Notes
- The Docker setup uses a single container.
- The frontend is built during image build and served by the FastAPI backend.
- `docker-compose.yml` exposes port 8080 and mounts `backend/data/` for persistence.

### Docker Hub (prebuilt image)
```bash
docker run -d \
  -p 8080:8000 \
  -e APP_SECRET_KEY=change-me \
  -e APP_DATABASE_URL=sqlite+aiosqlite:///./data/books.db \
  -e APP_FRONTEND_DIST_DIR=/app/frontend-dist \
  -v $(pwd)/backend/data:/app/backend/data \
  --name beebliotheca \
  marcoslongo/beebliotheca:latest
```

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
