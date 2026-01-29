FROM python:3.11-slim

WORKDIR /app/backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY backend/pyproject.toml backend/ .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir .

COPY backend/app ./app
COPY backend/migrations ./migrations
COPY backend/init_db.py backend/init_db_sync.py ./

RUN mkdir -p data/covers

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
