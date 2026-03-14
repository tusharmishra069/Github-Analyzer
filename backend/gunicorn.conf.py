"""Gunicorn production configuration — Railway/Render compatible."""
import os

# ── Binding ───────────────────────────────────────────────────────────────────
# Railway/Render inject PORT at runtime; local default remains 8000
port = os.environ.get("PORT", "8000")
bind = f"0.0.0.0:{port}"

# ── Workers ───────────────────────────────────────────────────────────────────
# Low-memory defaults: keep 1 worker unless explicitly overridden.
workers = int(os.environ.get("WEB_CONCURRENCY", "1"))
worker_class = "uvicorn.workers.UvicornWorker"
threads = 1

# ── Memory optimisations ────────────────────────────────────────────────────────────────────
# preload_app loads heavy libs once before forking workers (saves RAM)
preload_app = True
# Recycle worker after 100 requests to prevent slow memory leaks from FAISS
max_requests = 100
max_requests_jitter = 20
worker_tmp_dir = "/tmp"

# ── Timeouts ─────────────────────────────────────────────────────────────────
# AI analysis can take up to 3 min on large repos
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "300"))
graceful_timeout = 60
keepalive = 5

# ── Logging ───────────────────────────────────────────────────────────────────
# Use "info" so Render dashboard shows request logs
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s "%(r)s" %(s)s %(b)s %(D)sµs'

# ── Proxy chain: trust forwarded headers from platform ingress ───────────────
forwarded_allow_ips = "*"

# ── Process naming ─────────────────────────────────────────────────────────────
proc_name = "codebase-analyzer"

# ── Security ──────────────────────────────────────────────────────────────────
limit_request_line = 8190
limit_request_fields = 100
