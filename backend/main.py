import re
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from typing import Optional, Any

from database import get_db, engine, Base
from models import Job
from worker import analyze_github_repo

# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Code Analyzer API",
    description="Submit a GitHub repository URL and receive a Staff Engineer AI code review.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------
GITHUB_URL_RE = re.compile(
    r"^https?://github\.com/[\w\-\.]+/[\w\-\.]+/?$",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------
class AnalyzeRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        v = v.strip().rstrip("/")
        if not GITHUB_URL_RE.match(v):
            raise ValueError(
                "URL must be a valid public GitHub repository "
                "(e.g. https://github.com/owner/repo)"
            )
        return v


class AnalyzeResponse(BaseModel):
    job_id: str
    status: str
    message: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    message: str
    result: Optional[Any] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/")
def health_check():
    return {"status": "ok", "service": "AI Code Analyzer API v2"}


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze_repo(
    req: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Queue a new code analysis job for a GitHub repository."""
    job = Job(repository_url=req.url)
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(analyze_github_repo, str(job.id), job.repository_url)

    return AnalyzeResponse(
        job_id=str(job.id),
        status=job.status,
        message="Job queued. Poll /api/jobs/{job_id}/status for progress.",
    )


@app.get("/api/jobs/{job_id}/status", response_model=JobStatusResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Poll the status and result of an analysis job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    return JobStatusResponse(
        job_id=str(job.id),
        status=job.status,
        progress=job.progress,
        message=job.message,
        result=job.result,
    )
