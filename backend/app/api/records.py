from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from app.database import get_db
from app.models import MedicalRecord, Patient, LabResult, Medication, User
from app.schemas import MedicalRecordSchema, RecordCorrectionRequest
from app.services.document_processor import process_and_save_document, reprocess_record_pipeline
from app.services.fhir_service import build_fhir_bundle_for_record
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/records", tags=["Medical Records"])

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}

@router.post("/upload", response_model=MedicalRecordSchema)
async def upload_medical_record(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and process a PDF or image medical document through OCR and AI extraction."""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file extension {ext}. Allowed: PDF, JPG, PNG")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowed limit of 10MB.")

    # Determine target patient profile
    target_patient = None
    if patient_id:
        target_patient = db.query(Patient).filter(Patient.id == patient_id, Patient.user_id == current_user.id).first()
    
    if not target_patient:
        # Default to user's 'Self' profile or first managed patient
        target_patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not target_patient:
            target_patient = Patient(
                user_id=current_user.id,
                display_name=current_user.full_name,
                relationship_type="Self",
                preferred_language=current_user.preferred_language
            )
            db.add(target_patient)
            db.commit()
            db.refresh(target_patient)

    record = process_and_save_document(
        file_bytes=file_bytes,
        original_filename=file.filename,
        db=db,
        patient_id=target_patient.id,
        is_demo=0
    )
    return record

@router.get("", response_model=List[MedicalRecordSchema])
def get_medical_records(
    record_type: Optional[str] = None,
    patient_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all medical records for current user's patient profiles."""
    user_patients = db.query(Patient).filter(Patient.user_id == current_user.id).all()
    patient_ids = [p.id for p in user_patients]

    if not patient_ids:
        return []

    query = db.query(MedicalRecord).filter(MedicalRecord.patient_id.in_(patient_ids))
    if patient_id:
        query = query.filter(MedicalRecord.patient_id == patient_id)
    if record_type and record_type != "All":
        query = query.filter(MedicalRecord.record_type == record_type)

    return query.order_by(MedicalRecord.upload_date.desc()).all()

@router.get("/{record_id}", response_model=MedicalRecordSchema)
def get_medical_record_detail(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed medical record information including lab results, medications, and summary."""
    user_patients = db.query(Patient).filter(Patient.user_id == current_user.id).all()
    patient_ids = [p.id for p in user_patients]

    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id,
        MedicalRecord.patient_id.in_(patient_ids)
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found or access unauthorized.")
    return record

@router.post("/{record_id}/reprocess", response_model=MedicalRecordSchema)
def reprocess_medical_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Re-analyzes the uploaded medical record with multimodal AI to extract latest insights, vitals, and summary."""
    user_patients = db.query(Patient).filter(Patient.user_id == current_user.id).all()
    patient_ids = [p.id for p in user_patients]

    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id,
        MedicalRecord.patient_id.in_(patient_ids)
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found or access unauthorized.")

    try:
        updated_record = reprocess_record_pipeline(record_id=record.id, db=db)
        return updated_record
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reprocessing failed: {str(e)}")

@router.patch("/{record_id}", response_model=MedicalRecordSchema)
def update_medical_record(
    record_id: str,
    payload: RecordCorrectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows user to correct extracted information or confirm verification status."""
    user_patients = db.query(Patient).filter(Patient.user_id == current_user.id).all()
    patient_ids = [p.id for p in user_patients]

    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id,
        MedicalRecord.patient_id.in_(patient_ids)
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found.")

    if payload.document_date:
        record.document_date = payload.document_date
    if payload.record_type:
        record.record_type = payload.record_type
    if payload.verification_status:
        record.verification_status = payload.verification_status
    if payload.diagnoses is not None:
        record.diagnoses = payload.diagnoses
    if payload.patient_confirmation_status:
        record.patient_confirmation_status = payload.patient_confirmation_status
        record.patient_mismatch_warning = 0

    if payload.lab_results is not None:
        db.query(LabResult).filter(LabResult.medical_record_id == record.id).delete()
        for lab in payload.lab_results:
            new_lab = LabResult(
                medical_record_id=record.id,
                test_name=lab.test_name,
                value=lab.value,
                unit=lab.unit,
                reference_min=lab.reference_min,
                reference_max=lab.reference_max,
                reference_text=lab.reference_text,
                result_status=lab.result_status or "Normal",
                verification_status="User Verified"
            )
            db.add(new_lab)

    if payload.medications is not None:
        db.query(Medication).filter(Medication.medical_record_id == record.id).delete()
        for med in payload.medications:
            new_med = Medication(
                medical_record_id=record.id,
                medicine_name=med.medicine_name,
                strength=med.strength,
                dosage_instructions=med.dosage_instructions,
                frequency=med.frequency,
                duration=med.duration,
                route=med.route,
                verification_status="User Verified"
            )
            db.add(new_med)

    db.commit()
    db.refresh(record)
    return record

@router.post("/{record_id}/confirm_patient")
def confirm_patient_association(
    record_id: str,
    target_patient_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Confirm patient association or reassign record to another patient profile."""
    user_patients = db.query(Patient).filter(Patient.user_id == current_user.id).all()
    patient_ids = [p.id for p in user_patients]

    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id,
        MedicalRecord.patient_id.in_(patient_ids)
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found.")

    if target_patient_id:
        target_patient = db.query(Patient).filter(Patient.id == target_patient_id, Patient.user_id == current_user.id).first()
        if not target_patient:
            raise HTTPException(status_code=400, detail="Invalid target patient profile.")
        record.patient_id = target_patient.id
        record.patient_confirmation_status = "Reassigned"
    else:
        record.patient_confirmation_status = "Confirmed"

    record.patient_mismatch_warning = 0
    db.commit()
    return {"message": "Patient association confirmed cleanly.", "record_id": record.id}

@router.delete("/{record_id}")
def delete_medical_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Safely delete a medical record and associated extracted data."""
    user_patients = db.query(Patient).filter(Patient.user_id == current_user.id).all()
    patient_ids = [p.id for p in user_patients]

    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id,
        MedicalRecord.patient_id.in_(patient_ids)
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found.")

    if record.storage_reference and os.path.exists(record.storage_reference):
        try:
            os.remove(record.storage_reference)
        except Exception:
            pass

    db.delete(record)
    db.commit()
    return {"message": "Record deleted successfully."}

@router.get("/{record_id}/export")
def export_record_fhir(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Exports record as a FHIR R4 Bundle JSON."""
    user_patients = db.query(Patient).filter(Patient.user_id == current_user.id).all()
    patient_ids = [p.id for p in user_patients]

    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id,
        MedicalRecord.patient_id.in_(patient_ids)
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found.")

    bundle = build_fhir_bundle_for_record(record)
    return bundle
