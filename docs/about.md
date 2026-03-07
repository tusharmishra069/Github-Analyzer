# About

## What Is This?

**AI Code Analyzer** is an open-source developer tool that uses large language models to give you real, actionable insight into GitHub repositories and developer profiles — without the buzzword fluff.

It was built out of frustration with code review tools that either require expensive enterprise plans, produce shallow observations, or bury the useful signal under marketing language. This project is an attempt to do it right: fast, free to self-host, and honest.

---

## The Three Modules

### Module 01 — Repository Analysis

Paste any public GitHub repository URL and get a full AI-powered code review in under 60 seconds.

**What it does:**
- Clones the repository into an ephemeral sandbox
- Parses and prioritises source files (entry points first, skipping generated/vendor dirs)
- Builds a FAISS vector index from the codebase
- Runs multi-query RAG retrieval (5 targeted queries) to surface the most relevant code
- Sends packed context to Groq's `llama-3.3-70b-versatile` model with a structured Chain-of-Thought prompt
- Returns a scored, structured review including architecture pattern, tech stack, bugs (with file/line), and concrete improvement suggestions

**What you get:**
- Overall health score (0–100)
- Architecture summary and detected pattern
- Bug list sorted by severity (high → low)
- Improvement opportunities with implementation guidance
- Code quality breakdown: readability, maintainability, test coverage estimate

---

### Module 02 — Profile Review

Enter a GitHub username and get a professional-grade developer profile assessment — the kind of summary a senior engineer would write after spending 30 minutes on your GitHub.

**What it does:**
- Fetches public profile data from the GitHub REST API: repos, languages, stars, contributions, account age
- Builds a language frequency breakdown from all public repos
- Sends a structured prompt to Groq — with a strict no-buzzword constraint (words like "passionate", "rock star", "ninja" are explicitly banned from the output)
- Scores the profile across 6 technical axes using a radar chart
- Optionally generates 5 concrete, prioritised improvement suggestions

**What you get:**
- Overall grade (A+ → F) with an animated ring display
- Stats: total repos, total stars, followers, account age
- Language breakdown donut chart (up to 10 languages)
- 6-axis radar: Readability / Architecture / Testing / Documentation / Consistency / Open Source
- Hireability index with strengths + areas to address
- 5 AI suggestions with priority, effort estimate, and step-by-step detail

---

### Module 03 — Profile Roast

A comedian's take on your GitHub profile. Cruel, specific, and oddly motivating.

**What it does:**
- Fetches the same public profile data as Module 02
- Sends it to Groq with a different system prompt: the model plays a savage-but-fair code reviewer who has had too much coffee
- Returns a multi-line roast and a one-sentence verdict

**What you get:**
- 5–7 roast lines targeting your actual commits, language choices, and repo names
- A final verdict
- A shareable card UI

---

## Design Philosophy

- **No buzzwords**: The LLM prompts include an explicit blocklist of filler words. Output reads like it came from a real engineer, not a LinkedIn post.
- **Structured output**: All LLM responses are constrained to a JSON schema. The frontend renders data, not raw text blobs.
- **Fast by default**: Profile review and roast are synchronous (<10 seconds). Repo analysis is async with live progress tracking.
- **Self-hostable**: No vendor lock-in beyond Groq and Neon (both have generous free tiers). Swap either out by changing ~10 lines.

---

## Roadmap

The following features are planned but not yet implemented. See `docs/add_on_features.md` for detailed specs.

| Feature | Status |
|---|---|
| Resume vs GitHub Analysis | Planned |
| Repo Comparison (A vs B) | Planned |
| Team Coding Style Consistency | Planned |
| AI-generated commit message suggester | Considering |
| Webhook-triggered analysis on push | Considering |

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| UI | shadcn/ui, Framer Motion, Three.js, Recharts |
| Backend | FastAPI, Python 3, Uvicorn |
| LLM | Groq API — `llama-3.3-70b-versatile` |
| Embeddings | `all-MiniLM-L6-v2` via sentence-transformers |
| Vector Search | FAISS (in-memory, per-job) |
| Database | Neon Postgres (serverless) |
| ORM | SQLAlchemy 2.x (sync) |

---

## License

MIT — do whatever you want with it, just don't sell it as your own SaaS and call it a day.
