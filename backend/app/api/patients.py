from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Patient, User
from app.schemas import PatientSchema
from app.services.auth_service import get_current_user_optional
from app.seed import seed_demo_data

router = APIRouter(prefix="/api/patients", tags=["Patients"])

@router.get("/me", response_model=PatientSchema)
def get_current_patient(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Returns the current authenticated user's patient profile or fallback demo profile."""
    if current_user:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if patient:
            return patient

    patient = db.query(Patient).filter(Patient.user_id == "demo_user").first()
    if not patient:
        patient = seed_demo_data(db)
    return patient
