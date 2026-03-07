import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # ── LLM ──────────────────────────────────────────────────────────────────
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # ── GitHub ────────────────────────────────────────────────────────────────
    GITHUB_TOKEN: str | None = os.getenv("GITHUB_TOKEN")

    # ── Repo parser limits ────────────────────────────────────────────────────
    MAX_FILE_SIZE_BYTES: int = 512 * 1024   # 512 KB
    MAX_FILE_COUNT: int = 120

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = ["*"]

    def validate(self) -> None:
        if not self.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY environment variable is required")
        if not self.DATABASE_URL:
            raise ValueError("DATABASE_URL environment variable is required")


settings = Settings()
