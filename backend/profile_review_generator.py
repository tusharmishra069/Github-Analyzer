import os
import json
from groq import Groq

# ─────────────────────────────────────────────────────────────────────────────
# System prompt: authoritative, no buzzwords, strengths-first, concrete output
# ─────────────────────────────────────────────────────────────────────────────
REVIEW_SYSTEM_PROMPT = """You are a Principal Engineer at a top-tier tech company reviewing a developer's GitHub profile for a senior hire.

CRITICAL RULES — read before writing a single word:
1. DO NOT use buzzwords or empty phrases like: "passionate", "driven", "rockstar",
   "ninja", "guru", "wizard", "seasoned", "proficient", "adept", "enthusiastic",
   "leveraging", "synergy", "cutting-edge", "world-class", "innovative thinker",
   "thought leader", "results-driven", "collaborative", "proactive", "dynamic".
2. Write like a senior engineer speaking to a hiring committee — specific, factual, terse.
3. The `user_summary` must be 2-3 sentences that describe WHAT the developer
   actually builds and WHAT their strongest technical area is, based on evidence
   from their repos and language data. Name the domain (e.g. "web backends",
   "CLI tooling", "data pipelines").
4. `ai_suggestions` must be 3 concrete, actionable steps this specific developer
   can take to improve their GitHub profile and hireability. Each must reference
   their actual data where possible.
5. The radar must have exactly 6 axes scored 0–100 based on evidence, not guesses.
6. Return ONLY a valid JSON object — no markdown, no explanation, no code block fences.

Output schema (strict):
{
  "user_summary": "2–3 sentences describing the developer's actual work and strongest area.",
  "inferred_skills": ["skill1", "skill2", "skill3", "skill4"],
  "achievements": [
    {"emoji": "⭐", "title": "Short concrete achievement title"},
    {"emoji": "🔥", "title": "Another concrete achievement"}
  ],
  "hireability_grade": "B+",
  "hireability_reasoning": "One paragraph. Cite specific evidence (stars, repo count, language depth, commit frequency). No buzzwords.",
  "github_streak_estimate": "Active daily | Regular weekday committer | Weekend-only | Sporadic",
  "total_contributions_estimate": "High (300+/yr) | Medium (100–299/yr) | Low (<100/yr)",
  "code_quality_radar": {
    "readability": 70,
    "architecture": 65,
    "testing": 40,
    "documentation": 55,
    "consistency": 75,
    "open_source": 60
  },
  "ai_suggestions": [
    "Add README files to the repos that currently have none — recruiters skip repos without documentation.",
    "Pin your 3 strongest projects on your profile to surface them immediately.",
    "Write at least one substantial commit message per repo explaining the project purpose."
  ]
}
"""

AI_SUGGESTIONS_SYSTEM_PROMPT = """You are a senior engineering recruiter and technical career coach.
A developer has asked how to improve their GitHub profile for a senior engineering role.

RULES:
- Be blunt, specific, and actionable. No fluff.
- Reference the actual data provided (language counts, repo names, star counts, commit activity).
- Each suggestion must be implementable within 1–2 weeks by a working developer.
- Do NOT use buzzwords (passionate, leverage, synergy, etc.).
- Return ONLY a valid JSON object with a key "suggestions" containing an array of exactly 5 items.

Schema:
{
  "suggestions": [
    {
      "priority": 1,
      "icon": "📌",
      "title": "Short action title (5–8 words)",
      "detail": "One or two sentences explaining the what and why, referencing their specific data.",
      "effort": "15 min | 1 hr | 2–3 hrs | 1 day"
    }
  ]
}
"""


class ProfileReviewGenerator:
    def __init__(self):
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    def _build_profile_prompt(self, profile_data: dict) -> str:
        lang_breakdown = profile_data.get("language_breakdown", {})
        lang_str = ", ".join(
            f"{lang} ({count} repos)"
            for lang, count in list(lang_breakdown.items())[:10]
        ) or "None detected"

        return f"""Analyse this GitHub profile and return the JSON described in the system prompt.

Username       : {profile_data.get('username')}
Display Name   : {profile_data.get('name')}
Bio            : {profile_data.get('bio') or '(none)'}
Account Age    : since {profile_data.get('created_at', 'unknown')[:10]}
Followers      : {profile_data.get('followers', 0)}
Public Repos   : {profile_data.get('public_repos_count', 0)}
Total Stars    : {profile_data.get('total_stars', 0)}
Top Language   : {profile_data.get('top_language', 'None')}
Language Breakdown (by repo count): {lang_str}
Recent Repos   : {', '.join(profile_data.get('recent_repos', []))}
Commits in last 100 events : {profile_data.get('recent_commits_in_last_100_events', 0)}
Issues / PRs in last 100 events : {profile_data.get('recent_issues_prs', 0)}
"""

    def _build_suggestions_prompt(self, profile_data: dict) -> str:
        lang_breakdown = profile_data.get("language_breakdown", {})
        lang_str = ", ".join(
            f"{lang} ({count} repos)"
            for lang, count in list(lang_breakdown.items())[:8]
        ) or "None"

        return f"""GitHub profile data for @{profile_data.get('username')}:
- Public repos: {profile_data.get('public_repos_count', 0)}
- Total stars: {profile_data.get('total_stars', 0)}
- Followers: {profile_data.get('followers', 0)}
- Languages: {lang_str}
- Recent repos: {', '.join(profile_data.get('recent_repos', []))}
- Commits in last 100 events: {profile_data.get('recent_commits_in_last_100_events', 0)}
- Bio: {profile_data.get('bio') or '(none set)'}

Give 5 specific, actionable improvements for this exact profile.
"""

    def generate_review(self, profile_data: dict) -> dict:
        prompt = self._build_profile_prompt(profile_data)
        try:
            completion = self.groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": REVIEW_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.2,
                max_tokens=1200,
                response_format={"type": "json_object"},
            )
            raw = completion.choices[0].message.content.strip()
            start, end = raw.find("{"), raw.rfind("}") + 1
            if start != -1 and end > start:
                raw = raw[start:end]
            return json.loads(raw)
        except Exception as e:
            print(f"[ProfileReviewGenerator] generate_review failed: {e}")
            return self._fallback_review()

    def generate_ai_suggestions(self, profile_data: dict) -> list:
        prompt = self._build_suggestions_prompt(profile_data)
        try:
            completion = self.groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": AI_SUGGESTIONS_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.3,
                max_tokens=800,
                response_format={"type": "json_object"},
            )
            raw = completion.choices[0].message.content.strip()
            parsed = json.loads(raw)
            # Handle {"suggestions": [...]} or bare list
            if isinstance(parsed, list):
                return parsed
            for v in parsed.values():
                if isinstance(v, list):
                    return v
            return []
        except Exception as e:
            print(f"[ProfileReviewGenerator] generate_ai_suggestions failed: {e}")
            return []

    # ── fallback ──────────────────────────────────────────────────────────────
    def _fallback_review(self) -> dict:
        return {
            "user_summary": "Unable to generate summary due to a backend error.",
            "inferred_skills": [],
            "achievements": [],
            "hireability_grade": "C",
            "hireability_reasoning": "Analysis could not be completed.",
            "github_streak_estimate": "Unknown",
            "total_contributions_estimate": "Unknown",
            "code_quality_radar": {
                "readability": 50,
                "architecture": 50,
                "testing": 50,
                "documentation": 50,
                "consistency": 50,
                "open_source": 50,
            },
            "ai_suggestions": [],
        }
