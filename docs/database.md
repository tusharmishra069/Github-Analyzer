# Database Schema & Optimization

> **Database:** Neon PostgreSQL 16 (serverless, auto-scaling)  
> **Schema:** Single `jobs` table (simple, effective)  
> **Connections:** Pooled endpoints + connection pooling  
> **Performance:** Sub-10ms queries, auto-indexed  

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Jobs Table](#jobs-table)
3. [Connection Pooling](#connection-pooling)
4. [Performance Tuning](#performance-tuning)
5. [Backups & Disaster Recovery](#backups--disaster-recovery)
6. [Monitoring](#monitoring)

---

## Schema Overview

### Design Philosophy

**Simple is better.** The app needs only one table to track analysis jobs:

```
jobs table
├─ id (UUID, primary key)
├─ repository_url (text, indexed)
├─ status (enum: pending, processing, completed, failed)
├─ result (JSON, nullable)
├─ error (text, nullable)
├─ created_at (timestamp)
└─ updated_at (timestamp)
```

**Why single table?**
- Minimal schema complexity
- No JOINs needed (performance)
- Easy to scale horizontally (shard by repo if needed)
- Perfect for serverless PostgreSQL (Neon)

---

## Jobs Table

### Full Schema

```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    result JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes for fast queries
CREATE INDEX idx_jobs_repository_url ON jobs(repository_url);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_updated_at ON jobs(updated_at DESC);
```

### Column Details

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | No | `gen_random_uuid()` | Unique job identifier |
| `repository_url` | TEXT | No | — | GitHub repo URL (e.g., `https://github.com/fastapi/fastapi`) |
| `status` | VARCHAR(20) | No | `'pending'` | Job state: pending → processing → completed/failed |
| `result` | JSONB | Yes | NULL | Analysis results (bugs, LLM insights, timeline) |
| `error` | TEXT | Yes | NULL | Error message if job failed |
| `created_at` | TIMESTAMPTZ | No | `now()` | Job submission timestamp |
| `updated_at` | TIMESTAMPTZ | No | `now()` | Last status change timestamp |

### Status Flow

```
pending → processing → completed (with result)
                   ↘ failed (with error)
```

### Sample Result JSON

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "repository_url": "https://github.com/fastapi/fastapi",
  "status": "completed",
  "timing": {
    "clone": 3.2,
    "parse": 2.8,
    "sampling": 1.9,
    "patterns": 3.1,
    "embedding": 0.0,
    "llm_synthesis": 12.4,
    "total": 23.4
  },
  "pattern_bugs": [
    {
      "title": "Hardcoded database password",
      "severity": "CRITICAL",
      "file_hint": "config.py:42",
      "fix": "Use environment variables instead",
      "confidence": 0.95
    }
  ],
  "llm_enhancements": [
    {
      "insight": "Consider adding circuit breaker pattern for external API calls",
      "priority": "HIGH"
    }
  ],
  "files_analyzed": 30
}
```

---

## Connection Pooling

### Why Pooling Matters

FastAPI + Gunicorn spawns multiple workers. Each worker needs database connections:

```
Without pooling:
- 4 workers × 5 connections = 20 connections
- Neon free tier: 20 connections max → Frequently exceeded

With pooling (PgBouncer):
- 4 workers × 1 pooled connection = 4 real connections
- Same throughput, 5x fewer connections
```

### Setup

#### Neon's Built-in Pooling

1. **Neon Console → Connection Pooling (Settings)**
   - Mode: `Transaction pooling` (recommended for FastAPI)
   - Pool size: `6` (default)
   - Reserve pool size: `3`

2. **Connection String**
   ```
   # Non-pooled (connect directly)
   postgresql://user:pass@ep-xxx.neon.tech/neondb
   
   # Pooled (via PgBouncer)
   postgresql://user:pass@ep-xxx-pooler.neon.tech/neondb
   ```

3. **In Backend Code** (`config.py`)
   ```python
   DATABASE_URL = "postgresql://user:pass@ep-xxx-pooler.neon.tech/neondb?sslmode=require"
   ```

### Connection States

```
┌──────────────────────────────────────────────────────────┐
│ FastAPI Workers (4)                                      │
├──────────────────────────────────────────────────────────┤
│ Worker 1  │ Worker 2  │ Worker 3  │ Worker 4             │
│ (req1)    │ (req1)    │ (req1)    │ (req1)               │
└─────┬─────┴────┬─────┴────┬─────┴────┬───────────────────┘
      │          │          │          │
      └──────────┼──────────┼──────────┘
                 │          │
         ┌───────▼──────────▼────────────┐
         │  Neon PgBouncer             │
         │  (pooler.neon.tech)         │
         │  ┌─────────────────┐        │
         │  │ Pooled Conns (6)│        │
         │  │ - Ready: 4      │        │
         │  │ - Busy: 2       │        │
         │  └─────────────────┘        │
         └──────────────┬───────────────┘
                        │
         ┌──────────────▼─────────────┐
         │  PostgreSQL Instance      │
         │  (actual backend server)  │
         │  ┌──────────────┐         │
         │  │ Real Conns(2)│         │
         │  └──────────────┘         │
         └──────────────────────────┘
```

### Monitoring Pooler Health

```bash
# Check if pooler is responsive
psql postgresql://user:pass@ep-xxx-pooler.neon.tech/neondb -c "SELECT 1;"

# In Neon console: Monitoring → Connections
# Shows: Active, Idle, Waiting connections
```

---

## Performance Tuning

### Indexes

All indexes created automatically:

```sql
-- Lookup jobs by repository (common query)
idx_jobs_repository_url  — Used for: "Find analysis for this repo"

-- Filter by status (common query)
idx_jobs_status          — Used for: "Find all pending jobs"

-- Sort by time (common query)
idx_jobs_created_at      — Used for: "Latest analyses first"
idx_jobs_updated_at      — Used for: "Recently updated jobs"
```

### Query Performance

| Query | Time | Notes |
|-------|------|-------|
| `SELECT * FROM jobs WHERE id = ?` | <1ms | UUID primary key |
| `SELECT * FROM jobs WHERE repository_url = ?` | <5ms | Indexed TEXT |
| `SELECT * FROM jobs WHERE status = 'completed'` | <10ms | ENUM indexed |
| `SELECT * FROM jobs ORDER BY created_at DESC LIMIT 10` | <5ms | DESC index |

### Auto-Vacuum

Neon auto-vacuums tables (default: every 2 hours). No manual maintenance needed.

### Autoscaling

- **Compute:** Scales CPU/RAM automatically
- **Connections:** Grows as traffic increases
- **Storage:** Unlimited (scales seamlessly)

---

## Backups & Disaster Recovery

### Automatic Backups

Neon provides:
- ✅ **Continuous Backups** (WAL-based)
- ✅ **Daily Snapshots** (1 month retention)
- ✅ **Point-in-Time Restore** (7 days back)

### Manual Backup

```bash
# Export to local file
pg_dump "postgresql://user:pass@ep-xxx.neon.tech/neondb" > backup.sql

# Compress
gzip backup.sql

# Upload to S3 (optional)
aws s3 cp backup.sql.gz s3://my-backups/
```

### Restore from Backup

```bash
# Restore from exported file
psql "postgresql://user:pass@ep-xxx.neon.tech/neondb" < backup.sql

# Restore to point-in-time (via Neon console)
# Settings → Backups → Restore → Select timestamp
```

---

## Monitoring

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Active Connections** | <10 | >20 |
| **Query Duration (p95)** | <100ms | >500ms |
| **Disk Usage** | Monitor | 80% of max |
| **CPU** | <70% | >90% sustained |
| **Replication Lag** | N/A | N/A (single node) |

### Neon Monitoring Dashboard

**Neon Console → Monitoring:**
- Connections graph
- Query performance
- Storage trends
- Compute scaling events

### Health Check Query

```bash
# Run from backend or monitoring tool
curl -H "X-API-Key: <key>" \
  https://github-analyzer-production.up.railway.app/health

# Expected response:
# { "status": "ok", "database": "connected" }
```

### Database Stats

```sql
-- Check table size
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- Check index usage
SELECT 
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Check active queries
SELECT pid, query, state FROM pg_stat_activity WHERE state != 'idle';
```

---

## Maintenance

### Weekly

- ✅ Check connection pooler health (Neon console)
- ✅ Review query performance logs
- ✅ Verify backup completion

### Monthly

- ✅ Analyze storage trends
- ✅ Review slow query logs
- ✅ Test restore procedure (optional)

### As-Needed

- 🔄 Scale compute if CPU trending high (Neon auto-scaling usually handles)
- 🔄 Vacuum manually if auto-vacuum seems slow (rare)

---

## Troubleshooting

### "too many connections"

**Cause:** Pooling not configured or limit exceeded

**Fix:**
1. Verify using pooled endpoint (`..-pooler.neon.tech`)
2. Check pool size in Neon console (should be ≥ worker count)
3. Scale up if needed: Worker count < Pool size

### "Connection refused"

**Cause:** Network issue or database offline

**Fix:**
1. Test directly: `psql "<DATABASE_URL>"`
2. Check Neon status: [status.neon.tech](https://status.neon.tech)
3. Verify IP whitelist (Neon doesn't have IP restrictions)

### Slow Queries

**Diagnosis:**
```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Fix:**
- Add index if missing
- Rewrite query to use existing indexes
- Cache results if data is static

---

## Schema Evolution

### Adding Columns (Zero-Downtime)

```sql
-- Add nullable column (safe, no downtime)
ALTER TABLE jobs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Add not-null column with default (safe)
ALTER TABLE jobs ADD COLUMN priority INT DEFAULT 0 NOT NULL;

-- NOT safe (requires rewrite):
ALTER TABLE jobs ADD COLUMN big_data TEXT NOT NULL;
-- Use multi-step migration instead
```

### Backfilling Data

```sql
-- Step 1: Add nullable column
ALTER TABLE jobs ADD COLUMN new_field TEXT;

-- Step 2: Backfill (can run during operation)
UPDATE jobs SET new_field = 'default' WHERE new_field IS NULL;

-- Step 3: Add not-null constraint
ALTER TABLE jobs ALTER COLUMN new_field SET NOT NULL;
```

---

## Next Steps

- ✅ Database is production-ready
- ✅ Pooling configured
- ✅ Backups automatic
- 🔄 Monitor Neon dashboard monthly
- 🔄 Run health check queries weekly

See `docs/setup.md` for deployment instructions.
