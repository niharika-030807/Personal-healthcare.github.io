import os
from typing import List, Optional
from dotenv import load_dotenv

# Load .env file from backend directory and project root
backend_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
load_dotenv(backend_env)
load_dotenv(root_env)
load_dotenv()

class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "Personal Health Copilot")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./personal_health_copilot.db")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    GOOGLE_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CLIENT_ID", "490503764573-q7j3ho1lbdr4tltrhglvaab8simtlls3.apps.googleusercontent.com")

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
