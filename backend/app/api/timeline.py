from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import DocumentEvent, Patient
from app.schemas import DocumentEventSchema
from app.seed import seed_demo_data

router = APIRouter(prefix="/api/timeline", tags=["Timeline"])

@router.get("", response_model=List[DocumentEventSchema])
def get_health_timeline(
    event_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieve chronological medical history timeline events."""
    patient = db.query(Patient).filter(Patient.user_id == "demo_user").first()
    if not patient:
        patient = seed_demo_data(db)

    query = db.query(DocumentEvent).filter(DocumentEvent.patient_id == patient.id)
    if event_type and event_type != "All":
        query = query.filter(DocumentEvent.event_type == event_type)
    if search:
        query = query.filter(DocumentEvent.description.ilike(f"%{search}%"))

    # Return newest first
    return query.order_by(DocumentEvent.event_date.desc()).all()
