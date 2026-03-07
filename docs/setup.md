# Setup Guide — AI Code Analyzer

Complete instructions for running the project in **development** and **production**.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Structure](#2-repository-structure)
3. [External Services & API Keys](#3-external-services--api-keys)
4. [Backend Setup](#4-backend-setup)
   - [Development](#41-development)
   - [Production (manual)](#42-production-manual)
   - [Production (Docker)](#43-production-docker)
5. [Frontend Setup](#5-frontend-setup)
   - [Development](#51-development)
   - [Production (manual)](#52-production-manual)
   - [Production (Docker)](#53-production-docker)
6. [Full-Stack with Docker Compose](#6-full-stack-with-docker-compose)
7. [Environment Variable Reference](#7-environment-variable-reference)
8. [Generating an API Key](#8-generating-an-api-key)
9. [Verifying the Stack](#9-verifying-the-stack)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Python | **3.12** | 3.14 works; 3.11+ required for `str \| None` syntax |
| Node.js | **20** | LTS recommended |
| npm | **10** | Ships with Node 20 |
| Git | any | Required at runtime (backend clones repos) |
| Docker + Compose | 24 / 2.x | Production deployments only |

> **macOS (Homebrew)**
> ```bash
> brew install python@3.12 node git
> ```

---

## 2. Repository Structure

```
ai-code-analyzer/
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── api/routes/       # analysis.py  profile.py
│   │   ├── core/             # config.py  database.py  security.py  limiter.py
│   │   ├── models/           # job.py (SQLAlchemy ORM)
│   │   ├── schemas/          # analysis.py  profile.py (Pydantic)
│   │   └── services/         # ai_engine  worker  github_service  roast  review
│   ├── main.py               # FastAPI app factory
│   ├── gunicorn.conf.py      # Production Gunicorn config
│   ├── requirements.txt      # Pinned Python dependencies
│   ├── Dockerfile
│   └── .env.example
├── frontend/                 # Next.js 16 application
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   ├── components/       # UI components
│   │   └── lib/              # api.ts utility
│   ├── next.config.ts
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml        # Full-stack orchestration
└── env.example               # Root-level combined env template
```

---

## 3. External Services & API Keys

You need accounts / keys for three services before running anything.

### 3.1 Groq (LLM — required)

1. Sign up at <https://console.groq.com>
2. Create an API key under **API Keys**
3. Copy the value — this is your `GROQ_API_KEY`
4. Default model used: `llama-3.3-70b-versatile` (free tier available)

### 3.2 PostgreSQL database (required)

Any Postgres 14+ instance works:

| Option | Connection string format |
|---|---|
| **Neon** (recommended, free tier) | `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require` |
| **Supabase** | `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres` |
| **Railway** | `postgresql://postgres:pass@xxx.railway.app:5432/railway` |
| **Local Docker** | `postgresql://postgres:postgres@localhost:5432/codeanalyzer` |
| **Local Postgres** | `postgresql://postgres:postgres@localhost:5432/codeanalyzer` |

> The app runs `CREATE TABLE IF NOT EXISTS` on startup — no manual migration needed.

### 3.3 GitHub Personal Access Token (optional but recommended)

Without a token, GitHub API rate-limits you to **60 requests/hour** per IP.  
With a token: **5 000 requests/hour**.

1. Go to <https://github.com/settings/tokens>
2. Generate a **classic** token with scope `public_repo` (read-only)
3. Copy the value — this is your `GITHUB_TOKEN`

---

## 4. Backend Setup

### 4.1 Development

```bash
# 1. Enter the backend directory
cd backend

# 2. Create and activate a virtual environment
python3.12 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create your local .env file
cp .env.example .env
```

Edit `backend/.env` — minimum required values:

```dotenv
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
DATABASE_URL=postgresql://user:pass@host:5432/dbname
API_SECRET_KEY=              # leave blank for dev — auth bypass is active
APP_ENV=development
```

```bash
# 5. Generate an API key (optional in dev, required in prod)
python -m app.core.security

# 6. Start the dev server (auto-reload)
uvicorn main:app --reload --port 8000
```

The API is now available at:
- `http://localhost:8000/docs` — Swagger UI
- `http://localhost:8000/health` — health check
- `http://localhost:8000/redoc` — ReDoc

> **Auth in development:** When `APP_ENV=development`, requests without `X-API-Key` are
> allowed through with a log warning. Set `API_SECRET_KEY` and add the header
> to replicate production behaviour locally.

---

### 4.2 Production (manual / VPS)

```bash
cd backend
source venv/bin/activate

cp .env.example .env
# Fill in ALL required values (see §7)
nano .env
```

Required values in `backend/.env` for production:

```dotenv
APP_ENV=production
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
DATABASE_URL=postgresql://user:pass@host:5432/dbname
API_SECRET_KEY=<64-char hex from: python -m app.core.security>
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

```bash
# Start with Gunicorn (uses gunicorn.conf.py automatically)
gunicorn main:app -c gunicorn.conf.py
```

Gunicorn defaults: **2 workers**, `UvicornWorker`, port **8000**, 300s timeout.  
Override workers: `WEB_CONCURRENCY=4 gunicorn main:app -c gunicorn.conf.py`

> **Systemd service** — create `/etc/systemd/system/codeanalyzer-backend.service`:
> ```ini
> [Unit]
> Description=AI Code Analyzer Backend
> After=network.target
>
> [Service]
> User=www-data
> WorkingDirectory=/opt/codeanalyzer/backend
> EnvironmentFile=/opt/codeanalyzer/backend/.env
> ExecStart=/opt/codeanalyzer/backend/venv/bin/gunicorn main:app -c gunicorn.conf.py
> Restart=always
>
> [Install]
> WantedBy=multi-user.target
> ```
> ```bash
> sudo systemctl enable --now codeanalyzer-backend
> ```

---

### 4.3 Production (Docker)

```bash
cd backend

# Build
docker build -t codeanalyzer-backend .

# Run (pass env vars directly or via --env-file)
docker run -d \
  --name codeanalyzer-backend \
  -p 8000:8000 \
  --env-file .env \
  codeanalyzer-backend
```

The Dockerfile uses a **2-stage build** (builder installs wheels, runtime copies them).  
Final image is based on `python:3.12-slim` with a non-root `appuser`.

---

## 5. Frontend Setup

### 5.1 Development

```bash
# 1. Enter the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Create your local .env file
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_KEY=               # leave blank in dev — backend allows it
```

```bash
# 4. Start the dev server
npm run dev
```

The app is now available at `http://localhost:3000`.

> **Hot-reload** is enabled by default. Changes to any file under `src/` are reflected immediately.

---

### 5.2 Production (manual / VPS)

```bash
cd frontend

cp .env.example .env.production.local
nano .env.production.local
```

```dotenv
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_API_KEY=<same raw token as API_SECRET_KEY on the backend>
```

```bash
# Build
npm run build

# Start
npm start -- -p 3000
```

> `npm run build` produces a **standalone** output in `.next/standalone/`.  
> For minimal deployments you can run it without `node_modules`:
> ```bash
> node .next/standalone/server.js
> ```

---

### 5.3 Production (Docker)

The `NEXT_PUBLIC_*` variables must be baked in at **build time** (they're inlined by the Next.js compiler):

```bash
cd frontend

docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  --build-arg NEXT_PUBLIC_API_KEY=your_raw_token \
  -t codeanalyzer-frontend .

docker run -d \
  --name codeanalyzer-frontend \
  -p 3000:3000 \
  codeanalyzer-frontend
```

---

## 6. Full-Stack with Docker Compose

The easiest way to run the entire stack locally or on a server.

```bash
# 1. Copy the root env template
cp env.example .env

# 2. Fill in all values
nano .env
```

Minimum `.env` for local Docker Compose:

```dotenv
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
DATABASE_URL=postgresql://user:pass@host:5432/dbname
API_SECRET_KEY=<generate with: cd backend && python -m app.core.security>
ALLOWED_ORIGINS=http://localhost:3000
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_KEY=<same value as API_SECRET_KEY>
```

```bash
# 3. Build and start (detached)
docker compose up -d --build

# 4. View logs
docker compose logs -f

# 5. Stop
docker compose down
```

Services:
| Service | Port | Health check |
|---|---|---|
| `backend` | `8000` | `GET /health` |
| `frontend` | `3000` | `GET /` |

> The frontend container waits for the backend to pass its health check before starting (`depends_on: condition: service_healthy`).

---

## 7. Environment Variable Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `GROQ_API_KEY` | ✅ | — | Groq API key for LLM calls |
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `API_SECRET_KEY` | ✅ prod | — | Auth token (see §8). Blank = dev bypass active |
| `APP_ENV` | — | `development` | Set to `production` to enable all guards |
| `ALLOWED_ORIGINS` | ✅ prod | `http://localhost:3000` | Comma-separated list of trusted frontend origins |
| `GITHUB_TOKEN` | — | — | GitHub PAT for higher rate limits |
| `GROQ_MODEL` | — | `llama-3.3-70b-versatile` | Override the Groq model |
| `MAX_FILE_COUNT` | — | `120` | Max files parsed per repo |
| `MAX_FILE_SIZE_BYTES` | — | `524288` | Max single file size (bytes) |
| `RATE_LIMIT_DEFAULT` | — | `60/minute` | Default rate limit (all routes) |
| `RATE_LIMIT_AI` | — | `10/minute` | AI endpoint rate limit |
| `RATE_LIMIT_STATUS` | — | `120/minute` | Job status polling rate limit |

### Frontend (`frontend/.env.local` or `.env.production.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | — | `http://localhost:8000` | Backend base URL (no trailing slash) |
| `NEXT_PUBLIC_API_KEY` | ✅ prod | — | Must match `API_SECRET_KEY` on the backend |

> **`NEXT_PUBLIC_*` variables are public** — they are inlined into the browser JS bundle. Never put secrets here other than the API key intended for clients.

---

## 8. Generating an API Key

The backend uses a single shared secret (`API_SECRET_KEY`) for authentication.  
The same value is used in the frontend as `NEXT_PUBLIC_API_KEY`.

```bash
cd backend
source venv/bin/activate

# Generates a cryptographically strong 256-bit (64 hex char) token
python -m app.core.security
```

Output:
```
New API key generated:
  a3f9e2d1c8b74f560e9a1d23b56c78ef...

Set in backend:   API_SECRET_KEY=a3f9e2d1c8b74f560e9a1d23b56c78ef...
Set in frontend:  NEXT_PUBLIC_API_KEY=a3f9e2d1c8b74f560e9a1d23b56c78ef...
```

Copy the **same value** into both:
- `backend/.env` → `API_SECRET_KEY=...`
- `frontend/.env.production.local` → `NEXT_PUBLIC_API_KEY=...`

---

## 9. Verifying the Stack

### Backend

```bash
# Health check
curl http://localhost:8000/health
# → {"status":"ok","service":"AI Code Analyzer API","version":"2.0.0","env":"development"}

# Auth check (should 401 in production, 200 in dev with no key)
curl -X POST http://localhost:8000/api/roast \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{"username": "torvalds"}'

# Rate limit check — run 11 times rapidly to trigger 429
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:8000/api/roast \
    -H "Content-Type: application/json" \
    -H "X-API-Key: YOUR_KEY" \
    -d '{"username": "torvalds"}'
done
```

### Frontend

```bash
# Confirm the dev server is running
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# → 200

# Confirm production build works
cd frontend && npm run build && node .next/standalone/server.js
```

### Docker Compose

```bash
docker compose ps          # all services should be "healthy"
docker compose logs backend --tail 20
docker compose logs frontend --tail 20
```

---

## 10. Troubleshooting

### `Missing required environment variables: GROQ_API_KEY is required`
The backend validates required env vars at startup. Ensure `backend/.env` exists and contains valid values. In Docker, pass `--env-file .env`.

### `ALLOWED_ORIGINS must not contain '*' in production`
Set `ALLOWED_ORIGINS` to the actual frontend URL in `backend/.env`, e.g. `https://yourdomain.com`.

### `psycopg2.OperationalError: could not connect to server`
- Check `DATABASE_URL` is correct
- Neon/Supabase URLs need `?sslmode=require` appended
- Old Heroku-style `postgres://` prefixes are auto-corrected to `postgresql://`

### `401 Unauthorized` on API calls
- In **development**: leave `API_SECRET_KEY` blank — auth bypass is active
- In **production**: ensure `API_SECRET_KEY` (backend) matches `NEXT_PUBLIC_API_KEY` (frontend)

### `429 Too Many Requests`
Rate limit hit. Default AI endpoint limit is `10/minute`. Override via `RATE_LIMIT_AI=30/minute` in `backend/.env`.

### Frontend `fetch` fails with CORS error
Add the frontend origin to `ALLOWED_ORIGINS` in `backend/.env`:
```dotenv
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Docker build fails on `torch` (ARM Mac / Linux ARM)
PyTorch for ARM is large. Either:
```bash
# Use CPU-only wheel explicitly
pip install torch==2.10.0 --index-url https://download.pytorch.org/whl/cpu
```
or build with `--platform linux/amd64` on ARM hosts.

### Next.js `NEXT_PUBLIC_API_KEY` is undefined in browser
These variables must be present at **build time**. Pass them as `--build-arg` in Docker (see §5.3) or ensure the `.env.production.local` file exists before running `npm run build`.
