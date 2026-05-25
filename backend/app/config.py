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

    model_config = {"env_file": ".env", "case_sensitive": False}

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
