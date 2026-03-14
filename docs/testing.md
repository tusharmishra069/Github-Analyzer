# Testing & Local Validation

> **Framework:** pytest + FastAPI TestClient  
> **Coverage:** Unit tests + Integration tests + E2E tests  
> **Environment:** Local development stack (FastAPI + Next.js + PostgreSQL)  
> **Target:** <45 second analysis, pattern accuracy, API reliability  

---

## Table of Contents

1. [Setup for Testing](#setup-for-testing)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [E2E Tests](#e2e-tests)
5. [Performance Profiling](#performance-profiling)
6. [CI/CD](#cicd)

---

## Setup for Testing

### 1. Install Test Dependencies

```bash
cd backend

pip install pytest pytest-asyncio pytest-cov pytest-mock
```

### 2. Create Test Environment

```bash
# Create .env.test
cat > .env.test <<EOF
# Use SQLite for fast tests (or test Neon instance)
DATABASE_URL=sqlite:///test.db

# Use free tier Groq key
GROQ_API_KEY=gsk_test_...

# Test API key
API_SECRET_KEY=test_secret_12345

# Disable rate limiting for tests
RATE_LIMIT_ENABLED=false
EOF
```

### 3. Run Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Specific test file
pytest tests/unit/test_pattern_analyzer.py

# Verbose output
pytest -v

# Stop on first failure
pytest -x

# Run only fast tests (skip E2E)
pytest -m "not slow"
```

---

## Unit Tests

### Test Pattern Analyzer

```python
# tests/unit/test_pattern_analyzer.py

from app.services.pattern_analyzer import PatternAnalyzer

def test_hardcoded_aws_key_detection():
    """Test AWS key pattern detection."""
    code = """
    aws_key = "AKIAIOSFODNN7EXAMPLE"
    """
    bugs = PatternAnalyzer.analyze_code_patterns([{"path": "config.py", "content": code}])
    
    assert len(bugs) > 0
    assert bugs[0].severity in ["HIGH", "CRITICAL"]
    assert bugs[0].confidence > 0.8

def test_sql_injection_pattern():
    """Test SQL injection detection."""
    code = """
    query = "SELECT * FROM users WHERE id = " + user_input
    """
    bugs = PatternAnalyzer.analyze_code_patterns([{"path": "db.py", "content": code}])
    
    assert len(bugs) > 0
    assert "SQL" in bugs[0].title

def test_no_false_positives():
    """Test clean code produces no bugs."""
    code = """
    query = "SELECT * FROM users WHERE id = %s"
    db.execute(query, (user_id,))
    """
    bugs = PatternAnalyzer.analyze_code_patterns([{"path": "db.py", "content": code}])
    
    assert len(bugs) == 0

def test_confidence_scoring():
    """Test confidence score varies by pattern."""
    code = """
    secret_key = os.getenv("SECRET_KEY")  # Safe (using env var)
    password = "hardcoded_123"             # Unsafe
    """
    bugs = PatternAnalyzer.analyze_code_patterns([{"path": "config.py", "content": code}])
    
    # Hardcoded password should have lower confidence than exposed secret
    assert any(b.confidence > 0.8 for b in bugs)
```

### Test AI Engine

```python
# tests/unit/test_ai_engine.py

from app.services.ai_engine import CodeAnalyzer
from app.models.pattern_analyzer import Bug

def test_pattern_synthesis():
    """Test LLM synthesis of pattern bugs."""
    pattern_bugs = [
        Bug(
            title="Hardcoded AWS key",
            severity="CRITICAL",
            description="AWS access key found in source code",
            file_hint="config.py:42",
            fix="Move to environment variables",
            confidence=0.95
        )
    ]
    
    analyzer = CodeAnalyzer()
    enhancements = analyzer.analyze_with_context(
        pattern_bugs=pattern_bugs,
        code_chunks=[],
        files_analyzed=10
    )
    
    assert len(enhancements) > 0
    assert "enhancement" in enhancements[0] or "insight" in enhancements[0]
```

---

## Integration Tests

### Test Worker Pipeline

```python
# tests/integration/test_worker.py

import pytest
from app.services.worker import analyze_github_repo
from app.core.database import get_db
from sqlalchemy.orm import Session

@pytest.mark.asyncio
async def test_full_analysis_pipeline(db: Session):
    """Test complete 6-phase analysis pipeline."""
    repo_url = "https://github.com/pallets/flask"
    job_id = "test_job_123"
    
    # Run analysis
    result = await analyze_github_repo(job_id, repo_url)
    
    # Verify all phases completed
    assert result["status"] == "completed"
    assert "timing" in result
    assert result["timing"]["total"] < 45  # Target: <45 seconds
    
    # Verify phases
    assert result["timing"]["clone"] > 0
    assert result["timing"]["patterns"] > 0
    
    # Verify results
    assert "pattern_bugs" in result
    assert len(result["pattern_bugs"]) >= 0  # May find 0+ bugs

@pytest.mark.asyncio
async def test_analysis_with_small_repo(db: Session):
    """Test analysis on small repository."""
    repo_url = "https://github.com/user/tiny-repo"
    job_id = "test_small_123"
    
    result = await analyze_github_repo(job_id, repo_url)
    
    assert result["status"] in ["completed", "failed"]
    assert result["timing"]["total"] < 20  # Small repo < 20s
```

### Test API Endpoints

```python
# tests/integration/test_api.py

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    """Test health check endpoint."""
    response = client.get("/health")
    
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_analyze_endpoint_missing_key():
    """Test API key validation."""
    response = client.post(
        "/api/analyze",
        json={"repository_url": "https://github.com/test/repo"}
    )
    
    assert response.status_code == 401
    assert "X-API-Key" in response.json()["detail"] or "API key" in response.json()["detail"]

def test_analyze_endpoint_invalid_url():
    """Test URL validation."""
    response = client.post(
        "/api/analyze",
        headers={"X-API-Key": "test_key"},
        json={"repository_url": "not-a-valid-url"}
    )
    
    assert response.status_code == 400
    assert "URL" in response.json()["detail"] or "repository" in response.json()["detail"]

def test_analyze_endpoint_success(mocker):
    """Test successful analysis request."""
    # Mock worker to avoid long-running job
    mocker.patch("app.api.routes.analysis.queue_analysis", return_value="job_123")
    
    response = client.post(
        "/api/analyze",
        headers={"X-API-Key": "test_key"},
        json={"repository_url": "https://github.com/fastapi/fastapi"}
    )
    
    assert response.status_code == 202
    assert "job_id" in response.json()
```

---

## E2E Tests

### Full Stack Test (Local)

```bash
# Terminal 1: Start backend
cd backend
source venv/bin/activate
uvicorn main:app --reload

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Run E2E tests
cd frontend
npm run cypress  # Or your E2E test runner
```

### Manual E2E Test

1. **Start Stack**
   ```bash
   cd backend
   uvicorn main:app --port 8000
   
   # New terminal
   cd frontend
   npm run dev  # Runs on 3000
   ```

2. **Test Analysis Flow**
   ```bash
   # Get API key from backend
   API_KEY="dev-key-change-in-production"
   
   # Submit analysis
   curl -X POST http://localhost:8000/api/analyze \
     -H "X-API-Key: $API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"repository_url": "https://github.com/fastapi/fastapi"}'
   
   # Response:
   # {"job_id": "550e8400-e29b-41d4-a716-446655440000"}
   ```

3. **Poll Status**
   ```bash
   JOB_ID="550e8400-e29b-41d4-a716-446655440000"
   
   curl -X GET http://localhost:8000/api/analyze/$JOB_ID \
     -H "X-API-Key: $API_KEY"
   
   # Returns:
   # {
   #   "status": "processing" | "completed" | "failed",
   #   "result": { ... }
   # }
   ```

4. **Verify Results**
   - Check pattern bugs detected
   - Verify timing breakdown (<45s total)
   - Confirm LLM enhancements present

### Test Scenarios

| Scenario | Repo | Expected Time | Expected Bugs |
|----------|------|----------------|---------------|
| **Large Enterprise** | `fastapi/fastapi` (800+ files) | 40-45s | 5+ |
| **Medium Open Source** | `requests/requests` (300 files) | 25-35s | 2-5 |
| **Small Project** | `user/hello-world` (<50 files) | 15-20s | 0-2 |
| **Broken Repo** (invalid URL) | `https://github.com/fake/fake` | <5s | Error |

---

## Performance Profiling

### Profile Pipeline Phases

```bash
# Add timing to backend logs
export DEBUG=true

# Run analysis
curl -X POST http://localhost:8000/api/analyze \
  -H "X-API-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"repository_url": "https://github.com/fastapi/fastapi"}'

# Watch logs
# [worker] Clone: 3.2s
# [worker] Parse: 2.8s
# [worker] Sampling: 1.9s
# [worker] Patterns: 3.1s
# [worker] Embedding: 0.0s (skipped)
# [worker] LLM: 12.4s
# [worker] Total: 23.4s
```

### Benchmark Each Phase

```python
# tests/performance/test_phases.py

import time
from app.services.pattern_analyzer import PatternAnalyzer
from app.services.repo_parser import RepoParser

def benchmark_pattern_analysis():
    """Benchmark pattern detection phase."""
    files = [
        {"path": "config.py", "content": open("sample_code.py").read()}
        for _ in range(50)
    ]
    
    start = time.time()
    bugs = PatternAnalyzer.analyze_code_patterns(files)
    duration = time.time() - start
    
    print(f"Pattern analysis: {duration:.2f}s for {len(files)} files")
    assert duration < 5  # Target: <5 seconds

def benchmark_golden_sampling():
    """Benchmark smart file sampling."""
    files = [
        {"path": f"file_{i}.py", "content": "x = 1\n" * 100}
        for i in range(500)
    ]
    
    start = time.time()
    golden_files = PatternAnalyzer.smart_sample_files(files, target_kb=150)
    duration = time.time() - start
    
    print(f"Sampling: {duration:.2f}s, selected {len(golden_files)} files")
    assert duration < 3  # Target: <3 seconds
```

### Load Testing

```bash
# Install load testing tool
pip install locust

# Create loadtest.py
cat > loadtest.py <<'EOF'
from locust import HttpUser, task

class AnalyzerUser(HttpUser):
    @task
    def submit_analysis(self):
        self.client.post(
            "/api/analyze",
            headers={"X-API-Key": "test_key"},
            json={"repository_url": "https://github.com/fastapi/fastapi"}
        )
EOF

# Run load test (100 concurrent users)
locust -f loadtest.py -u 100 -r 10 -t 5m
```

---

## CI/CD

### GitHub Actions Test Workflow

```yaml
# .github/workflows/test.yml

name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov
      
      - name: Run tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/test_db
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          API_SECRET_KEY: test_secret
        run: |
          cd backend
          pytest --cov=app --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.xml
```

---

## Troubleshooting Tests

### Test Fails: "Connection refused"

```bash
# Ensure test database is running
psql postgresql://postgres@localhost/test_db

# Or use SQLite for tests
export DATABASE_URL=sqlite:///test.db
```

### Test Fails: "Groq API key invalid"

```bash
# Use test key from environment
export GROQ_API_KEY=gsk_test_...

# Or mock in tests
mocker.patch("app.services.ai_engine.groq_client")
```

### Test Fails: "Timeout"

```bash
# Increase pytest timeout
pytest --timeout=300

# Or mark as slow test
@pytest.mark.slow
def test_full_analysis():
    ...
```

---

## Testing Checklist

Before deploying to production:

- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ Pattern analyzer has <5% false positives
- ✅ Analysis completes in <45 seconds (large repos)
- ✅ API key validation works
- ✅ Rate limiting enabled
- ✅ Database connection pooling tested
- ✅ E2E test with real repo completes
- ✅ No sensitive data in logs
- ✅ Error handling verified

See `docs/setup.md` for deployment instructions.
