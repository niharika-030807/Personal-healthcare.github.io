from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.seed import seed_demo_data

router = APIRouter(prefix="/api/demo", tags=["Demo Mode"])

@router.post("/seed")
def seed_demo(db: Session = Depends(get_db)):
    """Seed synthetic patient records for hackathon demo mode."""
    patient = seed_demo_data(db)
    return {
        "status": "success",
        "message": "Demo data populated cleanly.",
        "patient_id": patient.id
    }
