"""Gunicorn production configuration — Render compatible."""
import os

# ── Binding ───────────────────────────────────────────────────────────────────
# Render injects a dynamic PORT env var — must be respected or health checks fail
port = os.environ.get("PORT", "8000")
bind = f"0.0.0.0:{port}"

# ── Workers ───────────────────────────────────────────────────────────────────
# Keep workers low for CPU-bound AI workloads; UvicornWorker handles async I/O
workers = 2
worker_class = "uvicorn.workers.UvicornWorker"
threads = 1

# ── Timeouts ─────────────────────────────────────────────────────────────────
# AI analysis can take up to 3 min on large repos
timeout = 300
graceful_timeout = 60
keepalive = 5

# ── Logging ───────────────────────────────────────────────────────────────────
# Use "info" so Render dashboard shows request logs
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s "%(r)s" %(s)s %(b)s %(D)sµs'

# ── Render: trust X-Forwarded-For from Render's proxy ─────────────────────────
forwarded_allow_ips = "*"

# ── Process naming ─────────────────────────────────────────────────────────────
proc_name = "codebase-analyzer"

# ── Security ──────────────────────────────────────────────────────────────────
limit_request_line = 8190
limit_request_fields = 100
