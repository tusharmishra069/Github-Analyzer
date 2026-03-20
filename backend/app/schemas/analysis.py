import re
from datetime import datetime
from pydantic import BaseModel, field_validator
from typing import Optional, Any

GITHUB_URL_RE = re.compile(
    r"^https?://github\.com/[\w\-\.]+/[\w\-\.]+/?$",
    re.IGNORECASE,
)


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


class JobListItem(BaseModel):
    job_id: str
    repository_url: str
    status: str
    progress: int
    message: str
    created_at: datetime
    result: Optional[Any] = None


class JobListResponse(BaseModel):
    items: list[JobListItem]
