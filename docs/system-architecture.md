# System Architecture

> **Current Design Phase:** 6-Phase Architect-Optimized Pipeline (commit `c78ae97`)  
> **Performance Target:** <45 seconds analysis (13-20x faster than 10+ minutes)  
> **Deployment:** Railway (backend) + Vercel (frontend)

---

## 📐 High-Level Architecture

CodeBase Analyzer is a **full-stack production system** with independent frontend (Next.js 16) and backend (FastAPI) services deployed on different platforms.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Browser / User (Vercel)                            │
│                                                                              │
│  Next.js 16 Frontend (https://github-analyzer-tan.vercel.app)              │
│  ├── Landing page + 3D demo (Three.js)                                     │
│  ├── /repo-analysis → async job polling                                    │
│  ├── /profile-review → GitHub profile assessment                           │
│  └── /profile-roast → Comedy roast generator                               │
└───────────────────────────┬──────────────────────────────────────────────────┘
                            │ HTTPS REST + JSON
                            │ X-API-Key header
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Railway) — 6-Phase Architecture               │
│         https://github-analyzer-production.up.railway.app                   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ API Layer (REST Routes)                                              │  │
│  │ ├── POST /api/analyze → Create job, return {job_id}                │  │
│  │ ├── GET /api/jobs/{id}/status → Poll for progress + result         │  │
│  │ ├── POST /api/profile-review → Fetch GitHub user, return analysis  │  │
│  │ └── POST /api/roast → Comedy roast generator                       │  │
│  └──────────┬───────────────────────────────────────────────────────────┘  │
│             │                                                               │
│  ┌──────────▼───────────────────────────────────────────────────────────┐  │
│  │ 6-Phase Analysis Pipeline (worker.py)                               │  │
│  │                                                                       │  │
│  │  PHASE 1: Clone Repository (shallow clone, 3s)                      │  │
│  │  └─► git clone --depth=1 into /tmp/...                             │  │
│  │                                                                       │  │
│  │  PHASE 2: Parse Codebase (extract files, 3s)                        │  │
│  │  └─► Recursive walk, filter by extension, enforce 2MB cap           │  │
│  │                                                                       │  │
│  │  PHASE 3: Smart Sampling (score & select golden files, 2s) ← NEW   │  │
│  │  └─► Entry points (main.py, app.ts) + security files + keywords    │  │
│  │  └─► Result: ~150KB from 2MB (80% of insight in 7.5% of content)   │  │
│  │                                                                       │  │
│  │  PHASE 4: Pattern Analysis (regex-based bug detection, 3s) ← NEW   │  │
│  │  └─► 15+ hardcoded patterns: secrets, SQL injection, auth gaps      │  │
│  │  └─► Confidence-scored, <5% false-positive rate                    │  │
│  │  └─► Output: 5-10 high-confidence bugs instantly                    │  │
│  │                                                                       │  │
│  │  PHASE 5: Conditional Embedding (smart decision, 0-5s) ← SMART     │  │
│  │  IF pattern_bugs >= 5:                                              │  │
│  │    └─► Skip embedding → return results in 22s                       │  │
│  │  ELSE:                                                               │  │
│  │    └─► Embed golden files only (MiniLM-L3, 500 chunks not 2000)    │  │
│  │    └─► 2 parallel queries (not 3) for retrieval                    │  │
│  │    └─► Time: 4-5s vs 5-10min if full repo                         │  │
│  │                                                                       │  │
│  │  PHASE 6: LLM Synthesis (Groq sense-making, 8-15s) ← EVOLVED       │  │
│  │  └─► LLM role: Validate pattern bugs + add architectural insights  │  │
│  │  └─► NOT analyzing from scratch (10x faster)                       │  │
│  │  └─► Output: JSON with bugs (pattern + LLM) + improvements         │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│             │                                                               │
│  ┌──────────▼────────────────────────────────────────────────────────────┐ │
│  │ Service Layer                                                         │ │
│  │                                                                        │ │
│  │ ├── pattern_analyzer.py (NEW)                                        │ │
│  │ │   ├── analyze_code_patterns() — 15+ regex patterns                │ │
│  │ │   ├── smart_sample_files() — intelligent file selection           │ │
│  │ │   └── Bug class with severity + confidence                        │ │
│  │ │                                                                     │ │
│  │ ├── ai_engine.py (EVOLVED)                                          │ │
│  │ │   ├── CodeAnalyzer class                                          │ │
│  │ │   ├── create_vector_store() — chunk & embed with FAISS           │ │
│  │ │   ├── _single_query_retrieve() — parallel-safe retrieval         │ │
│  │ │   ├── analyze_with_context() (NEW) — LLM sense-making           │ │
│  │ │   └── Module-level _EMBEDDINGS singleton (preload_app safe)      │ │
│  │ │                                                                     │ │
│  │ ├── repo_parser.py (OPTIMIZED)                                      │ │
│  │ │   ├── clone_repository() — shallow git clone                      │ │
│  │ │   ├── parse_codebase() — file filtering + content extraction      │ │
│  │ │   └── cleanup_repository() — rm -rf on completion                │ │
│  │ │                                                                     │ │
│  │ ├── github_service.py                                               │ │
│  │ │   └── fetch_user_repos() — GitHub REST API v3 integration        │ │
│  │ │                                                                     │ │
│  │ ├── profile_review_generator.py                                     │ │
│  │ │   └── generate_profile_review() — sync Groq call                 │ │
│  │ │                                                                     │ │
│  │ └── roast_generator.py                                              │ │
│  │     └── generate_roast() — comedian LLM personality                │ │
│  │                                                                        │ │
│  └────────┬─────────────────────────────────────────────────────────────┘ │
│           │                                                                │
│  ┌────────▼────────────────────────────────────────────────────────────┐  │
│  │ External Service Integration                                        │  │
│  │                                                                      │  │
│  │ ├── Groq API (llama-3.3-70b-versatile)                              │  │
│  │ │   ├── Repo analysis synthesis                                     │  │
│  │ │   ├── Profile review generation                                   │  │
│  │ │   └── Comedy roast generation                                     │  │
│  │ │   Endpoint: https://api.groq.com/openai/v1/chat/completions      │  │
│  │ │   Rate: 30 requests/min free tier                                 │  │
│  │ │                                                                    │  │
│  │ ├── Neon Postgres (Serverless)                                      │  │
│  │ │   ├── jobs table (UUID, status, result JSON)                      │  │
│  │ │   ├── Connection pooling: 5 base + 10 overflow                   │  │
│  │ │   └── Endpoint: ...neon.tech (requires SSL)                       │  │
│  │ │   Region: auto-selected by Neon                                   │  │
│  │ │                                                                    │  │
│  │ └── GitHub API (REST v3 + shallow clone via git)                   │  │
│  │     ├── Public profile data (repos, stars, contributors)            │  │
│  │     └── Rate limited (60 req/hr unauthenticated)                   │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Infrastructure (Railway free tier, 512MB RAM, 1 worker)                   │
│  ├── Python 3.11-slim base image                                           │
│  ├── Gunicorn + UvicornWorker (1 worker, preload_app=True)                 │
│  ├── FastAPI + Pydantic + SQLAlchemy                                       │
│  ├── HuggingFace transformers (paraphrase-MiniLM-L3-v2, 30MB)              │
│  ├── FAISS-cpu vector search (conditional-load)                            │
│  └── git (for repo cloning)                                                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Data Flow — Repository Analysis (End-to-End)

```
1. USER INITIATES
   POST /api/analyze { "repository_url": "https://github.com/..." }
   Response: { "job_id": "uuid-4", "status": "QUEUED" }

2. BACKEND QUEUES JOB
   ├─ Create Job record in Neon postgres (status=QUEUED)
   └─ Add to background worker queue (via threading)

3. WORKER PROCESSES (6-PHASE PIPELINE)
   
   PHASE 1: CLONE (3s)
   ├─ Update job: status=PROCESSING, progress=10
   ├─ git clone --depth=1 <url> /tmp/repo_xyz
   └─ Update progress: progress=20

   PHASE 2: PARSE (3s)
   ├─ Walk filesystem, filter files by extension
   ├─ Skip test files, vendor dirs, lock files
   ├─ Enforce max 2MB total content
   ├─ Extract entry points first (main.py, app.ts)
   └─ Update progress: progress=30

   PHASE 3: SMART SAMPLE (2s) ← NEW
   ├─ Score files: entry points (+1000) > security (+500) > keywords (+100) > size
   ├─ Select golden set (~150KB) target
   ├─ Dedup by content hash
   └─ Update progress: progress=40

   PHASE 4: PATTERN SCAN (3s) ← NEW
   ├─ Regex scan ALL files for 15+ known patterns
   ├─ Hardcoded secrets, SQL injection, missing auth, etc.
   ├─ Confidence score each finding (0.0-1.0)
   ├─ Sort by severity + confidence
   └─ Update progress: progress=50

   PHASE 5: CONDITIONAL EMBED (0-5s) ← SMART DECISION
   ├─ IF len(pattern_bugs) >= 5:
   │  └─ Skip embedding, use pattern results only
   │
   └─ ELSE (< 5 bugs found):
      ├─ Load embedding model (paraphrase-MiniLM-L3-v2, 30MB)
      ├─ Chunk golden files (500 chars, 50 char overlap)
      ├─ Embed chunks into FAISS index
      ├─ 2 parallel queries via ThreadPoolExecutor
      │  ├─ Query 1: "bugs errors security vulnerabilities"
      │  └─ Query 2: "architecture scalability performance"
      ├─ Retrieve top 4 chunks per query, deduplicate
      └─ Update progress: progress=60

   PHASE 6: LLM SYNTHESIS (8-15s) ← EVOLVED
   ├─ Call Groq with pattern bugs + code chunks
   ├─ LLM role: Validate findings + find architectural issues
   ├─ Constrain response to JSON schema
   │  {
   │    "health_score": "A|B+|B|C",
   │    "bugs": [...],
   │    "improvements": [...],
   │    "architecture_summary": "...",
   │    "tech_stack": ["Python", "FastAPI", ...]
   │  }
   ├─ Parse + validate response
   └─ Update progress: progress=100, status=COMPLETED

4. RESULT STORAGE
   ├─ Save result JSON to jobs.result column
   ├─ Update status=COMPLETED
   └─ Cleanup: rm -rf /tmp/repo_xyz

5. FRONTEND POLLS
   GET /api/jobs/uuid-4/status
   Response: { "status": "COMPLETED", "progress": 100, "result": {...} }
   Render results bento grid
```

---

## 🔄 Data Flow — Profile Review / Roast (Synchronous)

```
USER INPUT
├─ POST /api/profile-review { "username": "octocat" }
│
└─ BACKEND (Sync, < 15 seconds)
   ├─ Fetch from GitHub REST API:
   │  ├─ https://api.github.com/users/octocat
   │  ├─ https://api.github.com/users/octocat/repos
   │  └─ Calculate stats: total stars, language frequency, account age
   │
   ├─ Call Groq llama-3.3-70b (structured prompt)
   │  ├─ Input: {username, repos[], languages[], stats}
   │  ├─ System prompt: No buzzwords (explicit blocklist)
   │  └─ Output: {health_score, strengths, improvements[], hireability}
   │
   └─ Return JSON response
      Response: { "grade": "A+", "summary": "...", "radar_scores": {...} }
```

---

## 📊 Components & Responsibilities

### Backend (`app/` package)

| Component | File | Purpose |
|-----------|------|---------|
| **API Routes** | `routes/analysis.py` | POST /api/analyze, GET /api/jobs/{id}/status |
| | `routes/profile.py` | POST /api/profile-review, POST /api/roast |
| **Services** | `services/pattern_analyzer.py` | NEW: Pattern-based bug detection (15 patterns) |
| | `services/ai_engine.py` | EVOLVED: Embeddings + retrieval + LLM synthesis |
| | `services/repo_parser.py` | Clone, parse, clean up repos |
| | `services/github_service.py` | GitHub API integration |
| | `services/profile_review_generator.py` | Profile analysis via Groq |
| | `services/roast_generator.py` | Comedy roast via Groq |
| **Models** | `models/job.py` | SQLAlchemy Job ORM (id, status, result, etc.) |
| **Schemas** | `schemas/analysis.py` | Pydantic request/response models |
| | `schemas/profile.py` | GitHub profile schema |
| **Core** | `core/config.py` | Settings (env vars, tuning knobs) |
| | `core/database.py` | SQLAlchemy engine + SessionLocal |
| | `core/security.py` | API key validation, HMAC-SHA256 |
| | `core/limiter.py` | Rate limiting via slowapi |
| **Main** | `main.py` | FastAPI app factory, middleware, startup |

### Frontend (`src/` directory)

| Component | File | Purpose |
|-----------|------|---------|
| **Pages** | `app/page.tsx` | Landing + 3D scene + features |
| | `app/repo-analysis/page.tsx` | Input form + job polling + results |
| | `app/profile-review/page.tsx` | Username input + radar chart + suggestions |
| | `app/profile-roast/page.tsx` | Roast card display |
| **Components** | `components/Navbar.tsx` | Navigation + branding |
| | `components/Features.tsx` | Feature cards bento |
| | `components/ThreeDScene.tsx` | Three.js animated scene |
| | `components/Footer.tsx` | Links + branding |
| **Utilities** | `lib/utils.ts` | Tailwind cn() helper |
| | `lib/api.ts` | apiFetch wrapper (injects X-API-Key) |
| **UI Library** | `components/ui/*` | shadcn/ui buttons, inputs, cards, etc. |

---

## 🧪 Key Technologies

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Frontend** | Next.js | 16.1.6 | App Router, TypeScript |
| | React | 19 | Latest, SSR-compatible |
| | TypeScript | 5 | Strict mode |
| | Tailwind CSS | 4 | JIT, color-based styling |
| | shadcn/ui | Latest | Radix-based components |
| | Framer Motion | 12 | Animations |
| | Three.js | Latest | 3D graphics |
| | Recharts | 3 | Charting library |
| **Backend** | Python | 3.11 | uv-compiled (Dockerfile) |
| | FastAPI | 0.135 | ASGI, Pydantic v2 |
| | Uvicorn | Latest | ASGI worker |
| | Gunicorn | 25 | WSGI supervisor |
| | SQLAlchemy | 2.0.48 | ORM + pool management |
| | Pydantic | v2 | Schemas + validation |
| **AI/ML** | Groq API | Latest | `llama-3.3-70b-versatile` |
| | HuggingFace | transformers | `paraphrase-MiniLM-L3-v2` (30MB) |
| | FAISS | 1.13.2 | Vector search (conditional-load) |
| | LangChain | 1.2.10 | Text splitting + retrieval |
| **Database** | Neon Postgres | 16 | Serverless, SSL-only |
| **Hosting** | Railway | Free tier | 512MB RAM, 1 worker |
| | Vercel | Free tier | Next.js optimized |

---

## 🔐 Security & Performance

### Rate Limiting (slowapi)
```
GET /api/jobs/{id}/status    → 120 req/min (polling)
POST /api/analyze            → 10 req/min (AI analysis)
POST /api/profile-review     → 30 req/min
POST /api/roast              → 30 req/min
Default                      → 60 req/min
```

### API Authentication
- All endpoints require `X-API-Key` header
- Key: HMAC-SHA256 hash stored in `API_SECRET_KEY` env var
- Frontend injects via `apiFetch()` helper

### CORS & Security Headers
- Origins: Frontend Vercel URL only (production)
- Headers: HSTS, X-Frame-Options, X-Content-Type-Options, CSP
- Swagger/ReDoc disabled in production

### Memory Optimization
- Embedding model preloaded once per worker (module-level singleton)
- Conditional FAISS loading (only if needed)
- Aggressive `gc.collect()` between analysis phases
- Railway free tier: 512MB RAM, patterns + light embedding stay under 100MB peak

---

## 📈 Performance Targets

| Phase | Time | Constraint |
|-------|------|-----------|
| Clone | 3s | Network-bound, depth=1 |
| Parse | 3s | Disk I/O + filtering |
| Sampling | 2s | In-memory scoring |
| Pattern | 3s | Regex scanning (O(n)) |
| Embed | 0-5s | Conditional; MiniLM-L3 vs skipped |
| Retrieval | 2-3s | FAISS L2 distance (parallel) |
| LLM | 8-15s | Groq API latency |
| **Total** | **22-45s** | **Target: <1 min** |

---

## 🚀 Deployment Architecture

**Frontend** → Vercel (Next.js optimized, auto-scaling, edge caching)  
**Backend** → Railway (Docker, Gunicorn, auto-restart on crash)  
**Database** → Neon Postgres (serverless, auto-scale, point-in-time restore)  
**External APIs** → Groq (rate-limited), GitHub (public API)

All services communicate over HTTPS with explicit API keys. No vendor lock-in beyond Groq/Neon (both have free tiers and swap-friendly alternatives exist).



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
