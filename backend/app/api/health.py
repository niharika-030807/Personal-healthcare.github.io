from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.config import settings
from app.database import get_db

router = APIRouter()

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_healthy = False
    db_error = None
    try:
        db.execute(text("SELECT 1"))
        db_healthy = True
    except Exception as e:
        db_healthy = False
        db_error = str(e)

    return {
        "status": "healthy" if db_healthy else "degraded",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database_connected": db_healthy,
        "database_error": db_error,
        "gemini_api_configured": bool(settings.GEMINI_API_KEY)
    }
