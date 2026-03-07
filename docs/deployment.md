# Deployment

## Local Development

See `docs/testing.md` for the quick-start run commands. This page covers environment setup, production deployment, and platform-specific configuration.

---

## Environment Variables

### Backend (`backend/.env`)

Create this file before starting the backend:

```env
# Required
GROQ_API_KEY=gsk_...          # Groq cloud API key — https://console.groq.com
DATABASE_URL=postgresql://... # Neon pooled connection string (see below)

# Optional — raises GitHub API rate limit from 60 to 5000 req/hr
GITHUB_TOKEN=ghp_...
```

**Getting `DATABASE_URL` from Neon:**
1. Go to [console.neon.tech](https://console.neon.tech) → your project → Connection Details
2. Select **Pooled connection** (PgBouncer)
3. Copy the `postgresql://...` string
4. Paste it as `DATABASE_URL`

The app automatically rewrites `postgres://` → `postgresql://` if needed.

### Frontend (`frontend/.env.local`)

```env
# Optional — defaults to http://localhost:8000 in development
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

---

## Running Locally

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the auto-generated Swagger UI.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI will be available at `http://localhost:3000`.

---

## Production Deployment

### Frontend → Vercel

Vercel is the simplest deployment target for Next.js.

1. Push the repository to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL` → your backend's public URL
5. Deploy

Vercel auto-detects Next.js and sets the build command (`npm run build`) and output directory (`.next`) correctly.

---

### Backend → Railway

Railway is the recommended platform for the FastAPI backend.

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select your repository
3. Set **Root Directory** to `backend`
4. Railway will auto-detect Python. If it doesn't, add a `Procfile`:

```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

5. Set environment variables in the Railway dashboard:
   - `GROQ_API_KEY`
   - `DATABASE_URL`
   - `GITHUB_TOKEN` (optional)
6. Deploy

**Note:** The sentence-transformers model (`all-MiniLM-L6-v2`) is downloaded from HuggingFace on first startup (~90 MB). Railway's ephemeral filesystem means it re-downloads on each deploy unless you add a persistent volume or pre-bundle the model.

---

### Backend → Render

1. Go to [render.com](https://render.com) → New Web Service → Connect GitHub repo
2. Set **Root Directory** to `backend`
3. Set **Build Command**: `pip install -r requirements.txt`
4. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `GROQ_API_KEY`
   - `DATABASE_URL`
   - `GITHUB_TOKEN` (optional)
6. Deploy

Render's free tier spins down after 15 minutes of inactivity — the first request after a cold start will take ~30 seconds.

---

## CORS Configuration

Update `ALLOWED_ORIGINS` in `backend/main.py` before deploying:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-vercel-app.vercel.app",
        "https://yourdomain.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Requirements Files

### Backend — `backend/requirements.txt`

```
fastapi==0.135.1
uvicorn==0.41.0
groq==1.0.0
faiss-cpu==1.13.2
sentence-transformers==5.2.3
langchain==1.2.10
pydantic==2.12.5
sqlalchemy
psycopg2-binary
python-dotenv==1.2.2
requests==2.32.5
transformers==5.3.0
gitpython
```

Generate a fresh one from your virtual environment with:

```bash
pip freeze > backend/requirements.txt
```

### Frontend — `frontend/package.json`

All dependencies are tracked in `package.json`. Install with:

```bash
cd frontend && npm install
```

---

## Health Check

Once the backend is deployed, confirm it's running:

```bash
curl https://your-backend-domain.com/
# → {"status":"ok","service":"AI Code Analyzer API v2"}
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `PoolTimeout` errors | Neon idle timeout + pool exhaustion | Ensure `pool_pre_ping=True` and use pooled endpoint |
| `Rate limit exceeded` from GitHub | No `GITHUB_TOKEN` set | Add a personal access token to env |
| `Model not found` on first boot | HuggingFace download fails | Check outbound internet access on the server |
| Frontend shows "Network Error" | CORS mismatch or wrong API URL | Verify `NEXT_PUBLIC_API_URL` and `allow_origins` |
| Roast/review returns 500 | Groq API key invalid or quota exceeded | Check [console.groq.com](https://console.groq.com) |
