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

## Deploy on TrueNAS SCALE (Apps)
Use a Custom App with the Docker image:
- Image: `marcoslongo/beebliotheca:latest`
- Container port: `8000`
- Host port: `8080` (or any free port)
- Environment:
  - `APP_SECRET_KEY` (set a strong random value)
  - `APP_DATABASE_URL=sqlite+aiosqlite:///./data/books.db`
  - `APP_FRONTEND_DIST_DIR=/app/frontend-dist`
- Storage (host path -> container path):
  - `/mnt/<pool>/apps/beebliotheca/data` -> `/app/backend/data`

After deploy, open: `http://<truenas-ip>:8080`

## Deploy on Unraid
Use the Docker tab and add a container:
- Repository: `marcoslongo/beebliotheca:latest`
- WebUI port: map `8080` (host) -> `8000` (container)
- Env:
  - `APP_SECRET_KEY` (set a strong random value)
  - `APP_DATABASE_URL=sqlite+aiosqlite:///./data/books.db`
  - `APP_FRONTEND_DIST_DIR=/app/frontend-dist`
- Volume:
  - `/mnt/user/appdata/beebliotheca/data` -> `/app/backend/data`

Open: `http://<unraid-ip>:8080`

## Updates
- Pull the latest image and restart the container.
- Your data lives in the mounted `backend/data/` volume.

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
