from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from app.database import get_db
from app.models import Patient, MedicalRecord, LabResult
from app.services.fhir_service import build_fhir_patient, build_fhir_observation
from app.seed import seed_demo_data

router = APIRouter(prefix="/api/interop", tags=["FHIR Interoperability"])

@router.get("/fhir/Patient/{patient_id}")
def get_fhir_patient(patient_id: str, db: Session = Depends(get_db)):
    """Exports FHIR R4 Patient resource."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        patient = db.query(Patient).filter(Patient.user_id == "demo_user").first()
        if not patient:
            patient = seed_demo_data(db)
    return build_fhir_patient(patient)

@router.get("/fhir/Observation")
def get_fhir_observations(db: Session = Depends(get_db)):
    """Exports FHIR R4 Observations bundle for all lab results."""
    patient = db.query(Patient).filter(Patient.user_id == "demo_user").first()
    if not patient:
        patient = seed_demo_data(db)

    results = (
        db.query(LabResult, MedicalRecord)
        .join(MedicalRecord)
        .filter(MedicalRecord.patient_id == patient.id)
        .all()
    )

    entries = []
    for lab, rec in results:
        obs = build_fhir_observation(lab, patient.id, rec.document_date)
        entries.append({"resource": obs})

    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": entries
    }
