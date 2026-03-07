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


class RoastRequest(BaseModel):
    username: str


class RoastLine(BaseModel):
    emoji: str
    text: str

class RoastData(BaseModel):
    lines: list[RoastLine]
    verdict: str

class RoastResponse(BaseModel):
    username: str
    avatar_url: Optional[str] = None
    stats: dict
    roast: RoastData

class ProfileReviewRequest(BaseModel):
    username: str
    
class Achievement(BaseModel):
    emoji: str
    title: str

class RadarMetrics(BaseModel):
    readability: int
    architecture: int
    testing: int
    documentation: int
    consistency: int
    open_source: int

class ProfileReviewData(BaseModel):
    user_summary: str
    inferred_skills: list[str]
    achievements: list[Achievement]
    hireability_grade: str
    hireability_reasoning: str
    github_streak_estimate: str
    total_contributions_estimate: str
    code_quality_radar: RadarMetrics
    ai_suggestions: list[str] = []

class ProfileReviewResponse(BaseModel):
    username: str
    avatar_url: Optional[str] = None
    stats: dict
    review: ProfileReviewData

class AiSuggestion(BaseModel):
    priority: int
    icon: str
    title: str
    detail: str
    effort: str

class AiSuggestionsResponse(BaseModel):
    username: str
    suggestions: list[AiSuggestion]



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


@app.post("/api/roast", response_model=RoastResponse)
def handle_roast(req: RoastRequest):
    """Generate a brutal roast for a GitHub profile."""
    try:
        from github_service import fetch_github_profile
        profile_data = fetch_github_profile(req.username)
    except ValueError as e:
        import logging
        logging.error(f"GitHub fetch failed: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import logging
        logging.error(f"GitHub fetch error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch GitHub profile")
        
    try:
        from roast_generator import RoastGenerator
        generator = RoastGenerator()
        roast_data = generator.generate_roast(profile_data)
    except Exception as e:
        import logging
        logging.error(f"Roast generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate roast: {str(e)}")
    
    return RoastResponse(
        username=profile_data["username"],
        avatar_url=profile_data.get("avatar_url"),
        stats={
            "followers": profile_data.get("followers", 0),
            "public_repos": profile_data.get("public_repos_count", 0),
            "total_stars": profile_data.get("total_stars", 0),
            "top_language": profile_data.get("top_language", "None")
        },
        roast=roast_data
    )


@app.post("/api/profile-review", response_model=ProfileReviewResponse)
def handle_profile_review(req: ProfileReviewRequest):
    """Generate a structured, professional review for a GitHub profile."""
    try:
        from github_service import fetch_github_profile
        profile_data = fetch_github_profile(req.username)
    except ValueError as e:
        import logging
        logging.error(f"GitHub fetch failed: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import logging
        logging.error(f"GitHub fetch error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch GitHub profile")
        
    try:
        from profile_review_generator import ProfileReviewGenerator
        generator = ProfileReviewGenerator()
        review_data = generator.generate_review(profile_data)
    except Exception as e:
        import logging
        logging.error(f"Review generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate review: {str(e)}")
    
    return ProfileReviewResponse(
        username=profile_data["username"],
        avatar_url=profile_data.get("avatar_url"),
        stats={
            "followers": profile_data.get("followers", 0),
            "public_repos": profile_data.get("public_repos_count", 0),
            "total_stars": profile_data.get("total_stars", 0),
            "top_language": profile_data.get("top_language", "None"),
            "language_breakdown": profile_data.get("language_breakdown", {}),
        },
        review=review_data
    )


@app.post("/api/profile-suggestions", response_model=AiSuggestionsResponse)
def handle_profile_suggestions(req: ProfileReviewRequest):
    """Generate 5 targeted AI suggestions to improve a GitHub profile."""
    try:
        from github_service import fetch_github_profile
        profile_data = fetch_github_profile(req.username)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import logging
        logging.error(f"GitHub fetch error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch GitHub profile")

    try:
        from profile_review_generator import ProfileReviewGenerator
        generator = ProfileReviewGenerator()
        suggestions = generator.generate_ai_suggestions(profile_data)
    except Exception as e:
        import logging
        logging.error(f"AI suggestions error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")

    return AiSuggestionsResponse(
        username=profile_data["username"],
        suggestions=suggestions,
    )
