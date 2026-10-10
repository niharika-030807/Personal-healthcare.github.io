import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.seed import seed_demo_data

from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.languages import router as languages_router
from app.api.patients import router as patients_router
from app.api.records import router as records_router
from app.api.summaries import router as summaries_router
from app.api.timeline import router as timeline_router
from app.api.trends import router as trends_router
from app.api.interoperability import router as interop_router
from app.api.demo import router as demo_router

def ensure_db_schema():
    Base.metadata.create_all(bind=engine)
    if settings.DATABASE_URL.startswith("sqlite"):
        try:
            with engine.connect() as conn:
                res = conn.exec_driver_sql("PRAGMA table_info(medical_records)")
                cols = [row[1] for row in res.fetchall()]
                if cols and "diagnoses" not in cols:
                    conn.exec_driver_sql("ALTER TABLE medical_records ADD COLUMN diagnoses JSON DEFAULT '[]'")
                    conn.commit()
        except Exception:
            pass

ensure_db_schema()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup seeding and shutdown cleanup."""
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered medical record organization, extraction, health timelines, trends, and translation platform.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
origins = settings.cors_origin_list
if "*" not in origins:
    origins.extend([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Uploads directory for local document viewing
upload_dir = settings.UPLOAD_DIR
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

# Root & Favicon endpoints
@app.get("/")
def root():
    return {
        "message": "Personal Health Copilot Backend",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)

# Include Routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(languages_router)
app.include_router(patients_router)
app.include_router(records_router)
app.include_router(summaries_router)
app.include_router(timeline_router)
app.include_router(trends_router)
app.include_router(interop_router)
app.include_router(demo_router)
