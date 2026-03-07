import requests

from app.core.config import settings


def _get_headers() -> dict:
    headers = {"Accept": "application/vnd.github.v3+json"}
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"
    return headers


def fetch_github_profile(username: str) -> dict:
    """
    Fetches public GitHub profile data for a username.
    Returns a dict with user stats, language breakdown, and recent activity.
    Raises ValueError if the user is not found.
    """
    headers = _get_headers()

    # 1. User profile
    user_resp = requests.get(
        f"https://api.github.com/users/{username}",
        headers=headers,
        timeout=10,
    )
    if user_resp.status_code == 404:
        raise ValueError(f"GitHub user '{username}' not found.")
    user_resp.raise_for_status()
    user_data = user_resp.json()

    # 2. Public repositories
    repos_resp = requests.get(
        f"https://api.github.com/users/{username}/repos?per_page=100&sort=updated",
        headers=headers,
        timeout=10,
    )
    repos_resp.raise_for_status()
    repos_data = repos_resp.json()

    # 3. Recent events (activity / streak estimation)
    events_resp = requests.get(
        f"https://api.github.com/users/{username}/events?per_page=100",
        headers=headers,
        timeout=10,
    )
    events_data = events_resp.json() if events_resp.status_code == 200 else []

    # Aggregate
    total_stars = sum(repo.get("stargazers_count", 0) for repo in repos_data)

    languages: dict[str, int] = {}
    for repo in repos_data:
        lang = repo.get("language")
        if lang:
            languages[lang] = languages.get(lang, 0) + 1
    languages = dict(sorted(languages.items(), key=lambda x: x[1], reverse=True))

    top_language = next(iter(languages), "None")
    repo_names = [repo["name"] for repo in repos_data[:10]]

    recent_commits = sum(
        len(event.get("payload", {}).get("commits", []))
        for event in events_data
        if event.get("type") == "PushEvent"
    )
    issues_prs_created = len([
        e for e in events_data
        if e.get("type") in ("IssuesEvent", "PullRequestEvent")
    ])

    return {
        "username": username,
        "name": user_data.get("name") or username,
        "avatar_url": user_data.get("avatar_url"),
        "bio": user_data.get("bio"),
        "followers": user_data.get("followers", 0),
        "following": user_data.get("following", 0),
        "public_repos_count": user_data.get("public_repos", 0),
        "total_stars": total_stars,
        "top_language": top_language,
        "language_breakdown": languages,
        "recent_repos": repo_names,
        "recent_commits_in_last_100_events": recent_commits,
        "recent_issues_prs": issues_prs_created,
        "created_at": user_data.get("created_at"),
    }
