from pydantic import BaseModel
from typing import Optional


# ── Shared ────────────────────────────────────────────────────────────────────

class ProfileRequest(BaseModel):
    username: str


# ── Roast ─────────────────────────────────────────────────────────────────────

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


# ── Profile Review ────────────────────────────────────────────────────────────

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


# ── AI Suggestions ────────────────────────────────────────────────────────────

class AiSuggestion(BaseModel):
    priority: int
    icon: str
    title: str
    detail: str
    effort: str


class AiSuggestionsResponse(BaseModel):
    username: str
    suggestions: list[AiSuggestion]
