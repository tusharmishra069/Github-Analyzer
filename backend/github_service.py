import os
import requests

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

def get_headers():
    headers = {"Accept": "application/vnd.github.v3+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"
    return headers

def fetch_github_profile(username: str):
    headers = get_headers()
    
    # 1. Get User Profile
    user_resp = requests.get(f"https://api.github.com/users/{username}", headers=headers)
    if user_resp.status_code == 404:
        raise ValueError("GitHub user not found.")
    user_resp.raise_for_status()
    user_data = user_resp.json()
    
    # 2. Get User Repos
    repos_resp = requests.get(f"https://api.github.com/users/{username}/repos?per_page=100&sort=updated", headers=headers)
    repos_resp.raise_for_status()
    repos_data = repos_resp.json()
    
    # 3. Get Recent Events (for streaks and activity)
    events_resp = requests.get(f"https://api.github.com/users/{username}/events?per_page=100", headers=headers)
    events_data = events_resp.json() if events_resp.status_code == 200 else []
    
    # Aggregate stats
    repo_count = len(repos_data)
    total_stars = sum(repo.get("stargazers_count", 0) for repo in repos_data)
    
    languages: dict[str, int] = {}
    for repo in repos_data:
        lang = repo.get("language")
        if lang:
            languages[lang] = languages.get(lang, 0) + 1

    # Sort by frequency descending
    languages = dict(sorted(languages.items(), key=lambda x: x[1], reverse=True))
    top_language = next(iter(languages), "None")
    
    repo_names = [repo["name"] for repo in repos_data[:10]]
    
    # Estimate recent activity from events
    recent_commits = sum(
        len(event.get("payload", {}).get("commits", []))
        for event in events_data if event.get("type") == "PushEvent"
    )
    issues_prs_created = len([
        e for e in events_data if e.get("type") in ("IssuesEvent", "PullRequestEvent")
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
        "created_at": user_data.get("created_at")
    }
