from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models import LabResult, MedicalRecord, Patient
from app.seed import seed_demo_data

router = APIRouter(prefix="/api/trends", tags=["Laboratory Trends"])

@router.get("/tests")
def get_available_test_names(db: Session = Depends(get_db)):
    """Returns list of all unique lab test names available for trending."""
    patient = db.query(Patient).filter(Patient.user_id == "demo_user").first()
    if not patient:
        patient = seed_demo_data(db)

    results = (
        db.query(LabResult.test_name)
        .join(MedicalRecord)
        .filter(MedicalRecord.patient_id == patient.id)
        .distinct()
        .all()
    )
    return [r[0] for r in results if r[0]]

@router.get("/{test_name}")
def get_lab_test_trend(test_name: str, db: Session = Depends(get_db)):
    """
    Get historical lab test measurements sorted by date for Recharts visualization.
    """
    patient = db.query(Patient).filter(Patient.user_id == "demo_user").first()
    if not patient:
        patient = seed_demo_data(db)

    results = (
        db.query(LabResult, MedicalRecord)
        .join(MedicalRecord)
        .filter(
            MedicalRecord.patient_id == patient.id,
            LabResult.test_name.ilike(f"%{test_name}%")
        )
        .order_by(MedicalRecord.document_date.asc())
        .all()
    )

    data_points = []
    unit = None
    ref_min = None
    ref_max = None

    for lab, rec in results:
        val_num = None
        try:
            val_num = float(lab.value)
        except (ValueError, TypeError):
            pass

        if not unit and lab.unit:
            unit = lab.unit
        if ref_min is None and lab.reference_min is not None:
            ref_min = lab.reference_min
        if ref_max is None and lab.reference_max is not None:
            ref_max = lab.reference_max

        data_points.append({
            "record_id": rec.id,
            "date": rec.document_date,
            "value": val_num if val_num is not None else lab.value,
            "raw_value": lab.value,
            "unit": lab.unit or unit or "",
            "status": lab.result_status,
            "filename": rec.original_filename,
            "ref_min": lab.reference_min or ref_min,
            "ref_max": lab.reference_max or ref_max
        })

    return {
        "test_name": test_name,
        "unit": unit or "",
        "reference_min": ref_min,
        "reference_max": ref_max,
        "data_points": data_points
    }
