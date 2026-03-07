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
    
    # Aggregate stats
    repo_count = len(repos_data)
    total_stars = sum(repo.get("stargazers_count", 0) for repo in repos_data)
    
    languages = {}
    for repo in repos_data:
        lang = repo.get("language")
        if lang:
            languages[lang] = languages.get(lang, 0) + 1
            
    top_language = max(languages, key=languages.get) if languages else "None"
    
    repo_names = [repo["name"] for repo in repos_data[:10]]
    
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
        "recent_repos": repo_names
    }
