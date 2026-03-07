# System Architecture

## Overview

CodeBase Analyzer is a full-stack web application split into two independently deployable services — a **Next.js 16** frontend and a **FastAPI** backend. The backend exposes a REST API consumed by the frontend over HTTP.

```
┌────────────────────────────────────────────────────────────────┐
│                        Browser / Client                        │
│                    Next.js 16  (port 3000)                     │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Repo        │  │ Profile Review   │  │ Profile Roast    │  │
│  │ Analysis    │  │ /profile-review  │  │ /profile-roast   │  │
│  │ /repo-      │  │                  │  │                  │  │
│  │ analysis    │  └──────────────────┘  └──────────────────┘  │
│  └─────────────┘                                               │
└────────────────────────┬───────────────────────────────────────┘
                         │ HTTP / REST (JSON)
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                  FastAPI Backend  (port 8000)                   │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │  /api/       │  │  /api/       │  │  /api/              │  │
│  │  analyze     │  │  profile-    │  │  roast              │  │
│  │  (async job) │  │  review      │  │                     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬──────────┘  │
│         │                 │                      │             │
│  ┌──────▼───────┐  ┌──────▼───────────────────┐  │             │
│  │  Background  │  │  github_service.py        │  │             │
│  │  Worker      │  │  (GitHub REST API v3)     │  │             │
│  │  (worker.py) │  └──────┬────────────────────┘  │             │
│  └──────┬───────┘         │                       │             │
│         │          ┌──────▼──────────────────────┐│             │
│  ┌──────▼───────┐  │  profile_review_generator   ││             │
│  │  repo_parser │  │  roast_generator            ││             │
│  │  (git clone) │  │  (Groq LLM)                 ││             │
│  └──────┬───────┘  └─────────────────────────────┘│             │
│         │                                          │             │
│  ┌──────▼───────┐                                  │             │
│  │  ai_engine   │◄─────────────────────────────────┘             │
│  │  (FAISS RAG) │                                                │
│  └──────┬───────┘                                                │
│         │                                                        │
│  ┌──────▼───────┐  ┌───────────────────────────────┐            │
│  │  Groq API    │  │  Neon Postgres (jobs table)   │            │
│  │  llama-3.3-  │  │  SQLAlchemy ORM               │            │
│  │  70b         │  └───────────────────────────────┘            │
│  └──────────────┘                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Frontend

| Property | Value |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (Radix primitives) |
| Animation | Framer Motion v12 |
| 3D | Three.js + @react-three/fiber + @react-three/drei |
| Charts | Recharts v3 |
| Icons | Lucide React |

### Pages & Routes

```
/                    → Landing page (InteractiveDashboard + 3D scene + Features bento)
/repo-analysis       → Repository analysis tool (async job polling)
/profile-review      → GitHub profile reviewer (language pie, radar, AI suggestions)
/profile-roast       → Comedy roast generator
```

### State Flow — Repo Analysis

```
User pastes URL
      │
      ▼
POST /api/analyze  ──► Returns { job_id }
      │
      ▼
Poll GET /api/jobs/{job_id}/status  (every 3 seconds)
      │
      ├── status: PROCESSING  →  show progress bar + step tracker
      │
      └── status: COMPLETED   →  render bento grid results dashboard
```

### State Flow — Profile Review / Roast

```
User enters GitHub username
      │
      ▼
POST /api/profile-review  or  POST /api/roast
      │
      └── Synchronous response (no polling)  →  render dashboard
```

---

## Backend

| Property | Value |
|---|---|
| Framework | FastAPI 0.135 |
| Language | Python 3.14 |
| ASGI Server | Uvicorn 0.41 |
| ORM | SQLAlchemy 2.x (sync) |
| Validation | Pydantic v2 |
| LLM | Groq — `llama-3.3-70b-versatile` |
| Embeddings | HuggingFace `all-MiniLM-L6-v2` (sentence-transformers) |
| Vector Store | FAISS (in-memory, per job) |
| Database | Neon Postgres (serverless) |

### Module Breakdown

```
backend/
├── main.py                        App factory — mounts routers, CORS middleware
├── requirements.txt
└── app/
    ├── core/
    │   ├── config.py              Settings singleton (env vars, limits)
    │   └── database.py            SQLAlchemy engine + session + get_db()
    ├── models/
    │   └── job.py                 Job ORM model (SQLAlchemy)
    ├── schemas/
    │   ├── analysis.py            AnalyzeRequest / AnalyzeResponse / JobStatusResponse
    │   └── profile.py             Roast / ProfileReview / AiSuggestions Pydantic schemas
    ├── api/
    │   └── routes/
    │       ├── analysis.py        POST /api/analyze · GET /api/jobs/{id}/status
    │       └── profile.py         POST /api/roast · /profile-review · /profile-suggestions
    └── services/
        ├── worker.py              Background task — clone → parse → embed → analyze
        ├── repo_parser.py         Git clone, file filtering, entry-point prioritization
        ├── ai_engine.py           Multi-query RAG pipeline (FAISS + Groq)
        ├── github_service.py      GitHub REST API v3 wrapper
        ├── profile_review_generator.py  LLM profile review + AI suggestions
        └── roast_generator.py     LLM comedy roast
```

---

## Repo Analysis Pipeline (Detailed)

```
1. POST /api/analyze
   └── Creates Job row (status=PENDING) in Neon Postgres
   └── Queues background task → returns job_id immediately

2. services/worker.py — analyze_github_repo(job_id, url)
   ├── [10%]  Initialise, set status=PROCESSING
   ├── [25%]  services/repo_parser.py — shallow clone to /tmp/
   │           └── Prioritise entry points (main.py, index.ts, app.py…)
   │           └── Cap: 120 files, 512 KB per file (from core/config.py)
   ├── [40%]  Chunk files → HuggingFace embeddings → FAISS index
   ├── [50%]  services/ai_engine.py — multi-query retrieval (5 queries × k=8, deduplicated)
   ├── [70%]  Groq LLM call (llama-3.3-70b, temp=0.1, max_tokens=2048)
   │           └── RSCIT prompt: Role → Situation → Chain-of-Thought → Instructions → Template
   ├── [88%]  Parse + validate JSON response
   └── [100%] Write result to Job.result (JSON column), status=COMPLETED

3. Frontend polls GET /api/jobs/{job_id}/status until status=COMPLETED
   └── Renders health score, architecture, bugs, improvements bento grid
```

---

## AI Engine — Multi-Query RAG

The retrieval step runs **5 parallel queries** against the FAISS index to maximise context coverage:

| Query | Intent |
|---|---|
| `"entry points, main modules, application structure"` | Top-level architecture |
| `"database models, schemas, data layer"` | Data access patterns |
| `"API endpoints, routes, controllers"` | Interface surface |
| `"configuration, environment, dependencies"` | Infrastructure setup |
| `"utility functions, helpers, shared code"` | Cross-cutting concerns |

Results are deduplicated by document ID before being packed into the LLM prompt.

---

## CORS & Security

- CORS is currently set to `allow_origins=["*"]` — suitable for development. Restrict to your frontend domain in production.
- GitHub URL inputs are validated against a strict regex before any processing: `^https?://github\.com/[\w\-\.]+/[\w\-\.]+/?$`
- No user authentication is implemented (stateless public API).

---

## Environment Variables

| Variable | Service | Required | Description |
|---|---|---|---|
| `GROQ_API_KEY` | Backend | ✅ | Groq cloud API key |
| `DATABASE_URL` | Backend | ✅ | Neon Postgres connection string (pooled) |
| `GITHUB_TOKEN` | Backend | ⚠️ Optional | Raises GitHub API rate limit from 60 to 5000 req/hr |
| `NEXT_PUBLIC_API_URL` | Frontend | ⚠️ Optional | Backend base URL (defaults to `http://localhost:8000`) |
