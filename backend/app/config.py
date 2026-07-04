from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import os


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    database_url: str = "sqlite:///./portfoliolens.db"
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    frontend_url: str = "http://localhost:5173"
    ticker_fetch_timeout: int = 8
    ticker_concurrency: int = 5
    tesseract_cmd: str = ""

    # Auth
    secret_key: str = "dev-secret-key-change-in-production"
    access_token_expire_minutes: int = 60 * 24 * 14  # 14 days
    jwt_algorithm: str = "HS256"

    model_config = {"env_file": ".env", "case_sensitive": False}

    @field_validator("database_url")
    @classmethod
    def _normalize_database_url(cls, v: str) -> str:
        # Railway/Heroku-style URLs use the legacy "postgres://" scheme,
        # which SQLAlchemy 2.x's psycopg2 dialect rejects.
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    @property
    def origins_list(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()

# Apply tesseract path override if provided
if settings.tesseract_cmd:
    try:
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd
    except ImportError:
        pass
