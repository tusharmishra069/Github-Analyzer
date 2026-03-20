import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import require_api_key
from app.core.config import settings
from app.api.deps.auth import get_current_user
from app.models.job import Job
from app.schemas.analysis import AnalyzeRequest, AnalyzeResponse, JobListResponse, JobListItem, JobStatusResponse
from app.services.worker import analyze_github_repo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Analysis"])


@router.post("/analyze", response_model=AnalyzeResponse, status_code=202)
@limiter.limit(settings.RATE_LIMIT_AI)   # 10/min — expensive AI job
def start_analysis(
    request: Request,                          # required by slowapi
    req: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    _key: str = Depends(require_api_key),      # ← auth guard
):
    """Queue a new code analysis job for a GitHub repository."""
    job = Job(repository_url=req.url, user_id=current_user.id)
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(analyze_github_repo, str(job.id), job.repository_url)

    return AnalyzeResponse(
        job_id=str(job.id),
        status=job.status,
        message="Job queued. Poll /api/jobs/{job_id}/status for progress.",
    )


@router.get("/jobs/{job_id}/status", response_model=JobStatusResponse)
@limiter.limit(settings.RATE_LIMIT_STATUS)   # 120/min — cheap polling
def get_job_status(
    request: Request,                          # required by slowapi
    job_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    _key: str = Depends(require_api_key),      # ← auth guard
):
    """Poll the status and result of an analysis job."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    return JobStatusResponse(
        job_id=str(job.id),
        status=job.status,
        progress=job.progress,
        message=job.message,
        result=job.result,
    )


@router.get("/jobs", response_model=JobListResponse)
def list_jobs(
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    jobs = (
        db.query(Job)
        .filter(Job.user_id == current_user.id)
        .order_by(Job.created_at.desc())
        .limit(50)
        .all()
    )

    return JobListResponse(
        items=[
            JobListItem(
                job_id=str(job.id),
                repository_url=job.repository_url,
                status=job.status,
                progress=job.progress,
                message=job.message,
                created_at=job.created_at,
                result=job.result,
            )
            for job in jobs
        ]
    )
