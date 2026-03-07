import traceback

from app.core.database import SessionLocal
from app.models.job import Job
from app.services import repo_parser, ai_engine


def _update_job(db, job, *, status=None, progress=None, message=None) -> None:
    """Applies fields to a job row and commits in one call."""
    if status is not None:
        job.status = status
    if progress is not None:
        job.progress = progress
    if message is not None:
        job.message = message
    db.commit()


def analyze_github_repo(job_id: str, repository_url: str) -> None:
    """
    Background task: clone → parse → embed → AI analysis → persist result.

    Progress milestones:
      10%  job accepted, initializing
      25%  repository cloned
      40%  scanning files
      50%  codebase parsed
      70%  embeddings ready
      88%  LLM analysis running
     100%  complete
    """
    db = SessionLocal()
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        db.close()
        return

    repo_dir = None

    try:
        # ── 1. Initialise ─────────────────────────────────────────────────────
        _update_job(db, job, status="PROCESSING", progress=10, message="Job accepted. Connecting to repository...")

        # ── 2. Clone ──────────────────────────────────────────────────────────
        _update_job(db, job, progress=25, message=f"Cloning {repository_url}...")
        repo_dir = repo_parser.clone_repository(repository_url)

        # ── 3. Parse ──────────────────────────────────────────────────────────
        _update_job(db, job, progress=40, message="Scanning repository files...")
        code_documents = repo_parser.parse_codebase(repo_dir)

        if not code_documents:
            raise ValueError(
                "No supported source files found in the repository. "
                "Make sure it contains code files (Python, JS/TS, Go, etc.)."
            )

        file_count = len(code_documents)
        _update_job(
            db, job,
            progress=50,
            message=f"Found {file_count} source file{'s' if file_count != 1 else ''}. Generating embeddings...",
        )

        # ── 4. Embed ──────────────────────────────────────────────────────────
        analyzer = ai_engine.CodeAnalyzer()
        vectorstore = analyzer.create_vector_store(code_documents)

        _update_job(
            db, job,
            progress=70,
            message=f"Embeddings ready. Running multi-query retrieval across {file_count} files...",
        )

        # ── 5. AI Analysis ────────────────────────────────────────────────────
        _update_job(db, job, progress=88, message="Staff Engineer AI is reviewing your codebase...")
        final_result = analyzer.analyze_codebase(vectorstore)

        # ── 6. Complete ───────────────────────────────────────────────────────
        health = final_result.get("health_score", "?")
        bug_count = len(final_result.get("bugs", []))
        imp_count = len(final_result.get("improvements", []))
        _update_job(
            db, job,
            status="COMPLETED",
            progress=100,
            message=(
                f"Analysis complete — Health: {health}, "
                f"{bug_count} bug{'s' if bug_count != 1 else ''} found, "
                f"{imp_count} improvement{'s' if imp_count != 1 else ''} suggested."
            ),
        )
        job.result = final_result
        db.commit()

    except Exception as e:
        traceback.print_exc()
        print(f"[worker] Job {job_id} FAILED: {e}")
        _update_job(db, job, status="FAILED", message=f"Analysis failed: {str(e)}"[:300])

    finally:
        if repo_dir:
            repo_parser.cleanup_repository(repo_dir)
        db.close()
