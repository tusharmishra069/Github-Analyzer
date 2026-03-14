# Deployment & Setup Guide

> **Current Stack:** FastAPI 0.135 + Gunicorn 25 + Next.js 16 + React 19 + Neon PostgreSQL + Groq LLM  
> **Architecture:** 6-Phase architect-optimized pipeline (see `docs/system-architecture.md`)  
> **Performance:** <45 seconds analysis, 13-20x faster than previous version  
> **Live:** Backend on Railway | Frontend on Vercel

---

## Table of Contents

1. [Deployment Status](#deployment-status)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Security: Before Going Live](#security-before-going-live)
5. [External Services Setup](#external-services-setup)
6. [Local Development](#local-development)
7. [Deploy: Backend to Railway](#deploy-backend-to-railway)
8. [Deploy: Frontend to Vercel](#deploy-frontend-to-vercel)
9. [Environment Variables Reference](#environment-variables-reference)
10. [Verification & Testing](#verification--testing)
11. [Troubleshooting](#troubleshooting)

---

## Deployment Status

### ✅ Production-Ready Components

| Component | Status | Notes |
|-----------|--------|-------|
| Backend (FastAPI) | ✅ Ready | 6-phase pipeline, pattern analyzer, conditional embedding |
| Frontend (Next.js) | ✅ Ready | Standalone, Server Components, optimized images |
| Database (Neon) | ✅ Ready | Single `jobs` table, auto-scaling pooling |
| API Authentication | ✅ Ready | HMAC-SHA256 API key validation |
| Rate Limiting | ✅ Ready | slowapi with per-endpoint quotas |
| Docker | ✅ Ready | Multi-stage builds, non-root user, security hardened |
| Security Headers | ✅ Ready | HSTS, CSP, X-Frame-Options, etc. |

### ⚠️ Pre-Deployment: Rotate Secrets

Your `.env` credentials may have been exposed. **Do this before going live:**

```bash
# 1. Groq API Key
# Go to: https://console.groq.com → API Keys → Revoke old → Create new

# 2. Neon Database Password
# Go to: https://console.neon.tech → Project Settings → Reset password

# 3. API Secret Key (new random key)
cd backend
python3 -c "import secrets; print('API_SECRET_KEY=' + secrets.token_urlsafe(32))"

# 4. GitHub Token (if used)
# Go to: https://github.com/settings/tokens → Delete old → Create new (if needed)
```

---

## Prerequisites

| Tool | Minimum | Notes |
|---|---|---|
| **Python** | 3.11 | Type hints: `str | None` syntax |
| **Node.js** | 20 LTS | Ships with npm 10 |
| **Git** | Latest | Required at runtime (backend clones repos) |
| **Docker** | 24+ | Only for Docker deployments |
| **Docker Compose** | 2.x | For local full-stack testing |

### Install Locally (macOS)

```bash
brew install python@3.11 node git
```

---

## Project Structure

```
ai-code-analyzer/
├── backend/
│   ├── app/
│   │   ├── api/routes/        analysis.py, profile.py
│   │   ├── services/          pattern_analyzer.py, ai_engine.py, repo_parser.py, worker.py
│   │   ├── models/            job.py
│   │   ├── schemas/           analysis.py, profile.py
│   │   └── core/              config.py, database.py, security.py, limiter.py
│   │
│   ├── main.py                FastAPI app factory
│   ├── gunicorn.conf.py       Production server config
│   ├── Dockerfile             Multi-stage build
│   ├── requirements.txt        30 pinned dependencies
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/               Pages (landing, analysis, profile-review, roast)
│   │   ├── components/        UI components + 3D scene
│   │   └── lib/               Utilities (api.ts, utils.ts)
│   │
│   ├── package.json
│   ├── next.config.ts
│   ├── Dockerfile
│   └── tsconfig.json
│
├── docs/
│   ├── system-architecture.md    Complete architecture + 6-phase flow
│   ├── setup.md                  This file
│   ├── about.md                  Product overview
│   ├── database.md               Schema details
│   ├── testing.md                Local testing commands
│   ├── add_on_features.md        Roadmap
│   └── ARCHITECT_REDESIGN.md     Optimization details
│
└── README.md                   Quick start guide
```

---

## Security: Before Going Live

### 1. Rotate All Credentials

```bash
# Groq API Key
# https://console.groq.com/keys → Revoke old, create new

# Neon Database
# https://console.neon.tech → Project Settings → Reset password

# API Secret
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# Set as API_SECRET_KEY in Railway/Vercel env vars

# GitHub Token (if used for authenticated API calls)
# https://github.com/settings/tokens → Delete + recreate if needed
```

### 2. Update Environment Variables

**Railway (Backend):**
```bash
GROQ_API_KEY=gsk_new_...
DATABASE_URL=postgresql://user:pass@...neon.tech/neondb?sslmode=require
API_SECRET_KEY=<new-secret>
ALLOWED_ORIGINS=https://github-analyzer-tan.vercel.app
```

**Vercel (Frontend):**
```bash
NEXT_PUBLIC_API_URL=https://github-analyzer-production.up.railway.app
NEXT_PUBLIC_API_KEY=<same-as-Railway>
```

### 3. Verify HTTPS Everywhere

- ✅ Vercel: Auto-HTTPS on all deployments
- ✅ Railway: Auto-HTTPS on `*.railway.app` domains
- ✅ Neon: SSL-only connections (required in DATABASE_URL)
- ✅ Groq: All API calls over HTTPS

---

## External Services Setup

### Neon PostgreSQL

1. Go to [https://console.neon.tech](https://console.neon.tech)
2. Create a new project (or reuse existing)
3. Copy the **pooled** connection string
4. Set as `DATABASE_URL` environment variable
5. On first run, the app auto-creates the `jobs` table

### Groq API

1. Go to [https://console.groq.com](https://console.groq.com)
2. Create account (free tier: 30 requests/minute)
3. Navigate to API Keys → Create new key
4. Set as `GROQ_API_KEY` environment variable

---

## Local Development

### 1. Clone & Setup

```bash
git clone https://github.com/tusharmishra069/Github-Analyzer.git
cd Github-Analyzer

cd backend
cp .env.example .env
# Edit .env with credentials:
# GROQ_API_KEY=...
# DATABASE_URL=...
# API_SECRET_KEY=<generate-new>
```

### 2. Start Backend (FastAPI)

```bash
cd backend

python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend: `http://localhost:8000`  
Swagger: `http://localhost:8000/docs` (dev only)

### 3. Start Frontend (Next.js)

```bash
cd frontend

npm install

cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_KEY=dev-key-change-in-production
EOF

npm run dev
```

Frontend: `http://localhost:3000`

### 4. Test the Pipeline

1. Open http://localhost:3000 → `/repo-analysis`
2. Paste repo: `https://github.com/fastapi/fastapi`
3. Click "Analyze"
4. Watch logs for 6-phase progress:
   ```
   Clone (3s) → Parse (3s) → Sampling (2s) → Patterns (3s) → [Embed 0-5s] → LLM (8-15s)
   ```

---

## Deploy: Backend to Railway

### Prerequisites

- Railway account: [https://railway.app](https://railway.app)
- GitHub repository connected

### Steps

1. **Push code to GitHub**
   ```bash
   git push origin main
   ```

2. **Create Railway Project**
   - Go to [https://railway.app/new](https://railway.app/new)
   - "Deploy from GitHub"
   - Select repo (Railway auto-detects Dockerfile)

3. **Set Environment Variables**
   - Railway Dashboard → Settings → Environment
   ```
   GROQ_API_KEY=gsk_...
   DATABASE_URL=postgresql://...
   API_SECRET_KEY=<new>
   EMBEDDING_MODEL_NAME=paraphrase-MiniLM-L3-v2
   ALLOWED_ORIGINS=https://github-analyzer-tan.vercel.app
   ```

4. **Deploy**
   - Auto-deploys on push to `main`
   - First build: ~5 minutes (downloading dependencies)
   - Subsequent: ~2 minutes (cached layers)

5. **Verify**
   ```bash
   curl -H "X-API-Key: <key>" \
     https://github-analyzer-production.up.railway.app/health
   # { "status": "ok" }
   ```

---

## Deploy: Frontend to Vercel

### Prerequisites

- Vercel account: [https://vercel.com](https://vercel.com)
- GitHub repository connected

### Steps

1. **Connect Repository**
   - Vercel Dashboard → Add project
   - Select GitHub repo, import `frontend/` directory
   - Framework: Next.js

2. **Set Environment Variables**
   - Project Settings → Environment Variables
   ```
   NEXT_PUBLIC_API_URL=https://github-analyzer-production.up.railway.app
   NEXT_PUBLIC_API_KEY=<same-as-Railway>
   ```

3. **Deploy**
   - Auto-deploys on push to `main`
   - Live at: `https://github-analyzer-tan.vercel.app`

---

## Environment Variables Reference

### Backend

| Variable | Example | Required | Notes |
|----------|---------|----------|-------|
| `GROQ_API_KEY` | `gsk_...` | ✅ | From https://console.groq.com |
| `DATABASE_URL` | `postgresql://...neon.tech...` | ✅ | Neon pooled endpoint |
| `API_SECRET_KEY` | `<random-32>` | ✅ | HMAC key, rotate periodically |
| `EMBEDDING_MODEL_NAME` | `paraphrase-MiniLM-L3-v2` | ❌ | Faster 30MB model (default) |
| `MAX_EMBED_BYTES` | `1048576` | ❌ | 1MB cap (default) |
| `MAX_FILE_COUNT` | `30` | ❌ | Max files (default: 30) |
| `ALLOWED_ORIGINS` | `https://github-analyzer-tan.vercel.app` | ❌ | CORS origins |

### Frontend

| Variable | Example | Required | Notes |
|----------|---------|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://github-analyzer-production.up.railway.app` | ✅ | Backend URL |
| `NEXT_PUBLIC_API_KEY` | `<same-as-backend>` | ✅ | API key |

---

## Verification & Testing

### 1. Health Checks

```bash
# Backend
curl -H "X-API-Key: <key>" \
  https://github-analyzer-production.up.railway.app/health
# { "status": "ok" }

# Frontend
curl https://github-analyzer-tan.vercel.app | head -20
# HTML response
```

### 2. Full E2E Test

1. Open https://github-analyzer-tan.vercel.app
2. → `/repo-analysis`
3. Paste: `https://github.com/fastapi/fastapi`
4. Click "Analyze"
5. Verify results in <45 seconds

### 3. Backend Logs (Railway)

```bash
railway logs -f
```

Expected output:
```
[worker] Job xyz SUCCESS (ARCHITECT DESIGN)
  Total:     22.0s
  Pattern bugs: 5 | LLM enhancements: +2
```

---

## Troubleshooting

### Frontend Returns 404

**Symptom:** "Unexpected token '<'" in console

**Fix:** Check `NEXT_PUBLIC_API_URL` in Vercel env:
```
NEXT_PUBLIC_API_URL=https://github-analyzer-production.up.railway.app
```
(No trailing slash, HTTPS required)

### Backend Returns 401

**Symptom:** `{"detail": "Invalid or missing X-API-Key"}`

**Fix:** Verify API key matches in both:
- Railway: `API_SECRET_KEY`
- Vercel: `NEXT_PUBLIC_API_KEY`

### Analysis Takes >60s

**Cause:** Large repo, conditional embedding triggered

**Fix:** Check logs (`railway logs`) for phase timings. If embed >30s, repo too large for free tier.

### FAISS Out of Memory

**Symptom:** `RuntimeError: malloc: out of memory`

**Fix:** 
- Pattern analyzer should catch bugs → skip embedding
- If not, reduce `MAX_FILE_COUNT`
- Or upgrade Railway tier

### Neon Connection Refused

**Symptom:** `psycopg2.OperationalError: could not connect to server`

**Fix:**
- Verify DATABASE_URL is **pooled** endpoint
- Ensure `?sslmode=require` in URL
- Test locally: `psql "<DATABASE_URL>"`

---

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Deploy frontend to Vercel
3. ✅ Test E2E with real repo
4. ✅ Monitor logs for errors
5. �� Optional: Custom domain + SSL
6. 🔄 Optional: Enable caching layer

See `docs/ARCHITECT_REDESIGN.md` for optimization roadmap.
