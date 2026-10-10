import os
import uuid
import logging
import datetime
from sqlalchemy.orm import Session

from app.models import MedicalRecord, LabResult, Medication, HealthSummary, DocumentEvent, Patient
from app.services.pdf_extractor import extract_text_from_pdf
from app.services.ocr_service import extract_text_from_image, extract_ocr_from_scanned_pdf
from app.services.document_classifier import classify_document_text
from app.services.ai_extraction_service import extract_structured_medical_data
from app.services.medical_validation import validate_medical_data
from app.services.summary_service import generate_health_summary
from app.config import settings

logger = logging.getLogger(__name__)

def process_and_save_document(
    file_bytes: bytes,
    original_filename: str,
    db: Session,
    patient_id: str,
    is_demo: int = 0
) -> MedicalRecord:
    """
    Complete document processing pipeline:
    Upload -> Extract Content -> Classify Document -> Extract Medical Data -> Validate -> Patient Mismatch Check -> Summarize -> Save DB
    """
    # 1. Save file securely
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    
    unique_name = f"{uuid.uuid4()}_{original_filename.replace(' ', '_')}"
    file_path = os.path.join(upload_dir, unique_name)
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise ValueError(f"Patient profile {patient_id} not found.")

    # 2. Create initial DB record with 'Extracting text' status
    record = MedicalRecord(
        patient_id=patient.id,
        record_type="Unknown document",
        original_filename=original_filename,
        storage_reference=file_path,
        processing_status="Extracting text",
        extraction_status="Processing",
        verification_status="Extracted",
        patient_mismatch_warning=0,
        patient_confirmation_status="Confirmed",
        is_demo=is_demo
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    try:
        # 3. Extract Text
        ext = os.path.splitext(original_filename)[1].lower()
        if ext == ".pdf":
            raw_text = extract_text_from_pdf(file_path)
            if not raw_text or len(raw_text.strip()) < 30:
                # Scanned PDF fallback
                raw_text = extract_ocr_from_scanned_pdf(file_path)
        else:
            raw_text = extract_text_from_image(file_path)

        record.processing_status = "Classifying document"
        db.commit()

        # 4. Classify Document (initial estimate)
        doc_type = classify_document_text(raw_text)
        record.record_type = doc_type

        record.processing_status = "Extracting medical information"
        db.commit()

        # 5. Extract Structured Medical Data (Multimodal vision + text)
        extracted_data = extract_structured_medical_data(raw_text, original_filename, file_path=file_path)
        if extracted_data.record_type and extracted_data.record_type != "Unknown document":
            record.record_type = extracted_data.record_type
        
        record.document_date = extracted_data.document_date or datetime.date.today().isoformat()
        record.diagnoses = extracted_data.diagnoses or []

        # Check Patient Mismatch between extracted document name & profile display_name
        doc_patient_name = extracted_data.patient_name.strip() if extracted_data.patient_name else None
        record.extracted_patient_name = doc_patient_name
        
        if doc_patient_name and doc_patient_name.lower() != "patient name not identified.":
            profile_name = patient.display_name.strip().lower()
            extracted_lower = doc_patient_name.lower()
            # If names don't match partially or fully
            if profile_name not in extracted_lower and extracted_lower not in profile_name:
                record.patient_mismatch_warning = 1
                record.patient_confirmation_status = "Mismatch Pending"
                logger.info(f"Patient mismatch detected: Document patient '{doc_patient_name}' vs Profile '{patient.display_name}'")

        record.processing_status = "Validating extracted data"
        db.commit()

        # 6. Validate Data
        validated_data = validate_medical_data(extracted_data)

        # Flag verification status
        has_needs_review = any(
            l.verification_status == "Needs Review" for l in validated_data.lab_results
        ) or any(
            m.verification_status == "Needs Review" for m in validated_data.medications
        )
        if has_needs_review or record.patient_mismatch_warning:
            record.verification_status = "Needs Review"

        # Save Lab Results
        for lab in validated_data.lab_results:
            lab_entity = LabResult(
                medical_record_id=record.id,
                test_name=lab.test_name,
                value=lab.value,
                unit=lab.unit,
                reference_min=lab.reference_min,
                reference_max=lab.reference_max,
                reference_text=lab.reference_text,
                result_status=lab.result_status,
                source_text=lab.source_text,
                verification_status=lab.verification_status
            )
            db.add(lab_entity)

        # Save Medications
        for med in validated_data.medications:
            med_entity = Medication(
                medical_record_id=record.id,
                medicine_name=med.medicine_name,
                strength=med.strength,
                dosage_instructions=med.dosage_instructions,
                frequency=med.frequency,
                duration=med.duration,
                route=med.route,
                source_text=med.source_text,
                verification_status=med.verification_status
            )
            db.add(med_entity)

        record.processing_status = "Generating summary"
        db.commit()

        # 7. Generate Summary
        summary_obj = generate_health_summary(validated_data, language="en")
        health_summary_entity = HealthSummary(
            medical_record_id=record.id,
            language="en",
            summary_json=summary_obj.model_dump(),
            model_identifier="gemini-3.8-flash"
        )
        db.add(health_summary_entity)

        # 8. Create Document Event for Timeline
        event_desc = f"{record.record_type} processed ({len(validated_data.lab_results)} lab tests, {len(validated_data.medications)} meds)"
        doc_event = DocumentEvent(
            patient_id=patient.id,
            medical_record_id=record.id,
            event_date=record.document_date or datetime.date.today().isoformat(),
            event_type=record.record_type,
            description=event_desc
        )
        db.add(doc_event)

        # 9. Complete
        record.processing_status = "Completed"
        record.extraction_status = "Completed"
        db.commit()
        db.refresh(record)
        return record

    except Exception as e:
        logger.error(f"Pipeline error for record {record.id}: {e}")
        record.processing_status = "Failed"
        record.extraction_status = "Failed"
        db.commit()
        raise e

def reprocess_record_pipeline(record_id: str, db: Session) -> MedicalRecord:
    """
    Reprocess an already uploaded record using the latest multimodal AI pipeline.
    Re-analyzes the stored file and refreshes lab results, medications, and health summary.
    """
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise ValueError(f"Record {record_id} not found.")

    patient = db.query(Patient).filter(Patient.id == record.patient_id).first()
    file_path = record.storage_reference

    # 1. Text extraction fallback if needed
    raw_text = ""
    if file_path and os.path.exists(file_path):
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            raw_text = extract_text_from_pdf(file_path)
        else:
            raw_text = extract_text_from_image(file_path)

    # 2. Multimodal extraction
    extracted_data = extract_structured_medical_data(raw_text, record.original_filename, file_path=file_path)
    if extracted_data.record_type and extracted_data.record_type != "Unknown document":
        record.record_type = extracted_data.record_type

    if extracted_data.document_date:
        record.document_date = extracted_data.document_date

    record.diagnoses = extracted_data.diagnoses or []

    doc_patient_name = extracted_data.patient_name.strip() if extracted_data.patient_name else None
    record.extracted_patient_name = doc_patient_name

    if doc_patient_name and patient:
        profile_name = patient.display_name.strip().lower()
        extracted_lower = doc_patient_name.lower()
        if profile_name not in extracted_lower and extracted_lower not in profile_name:
            record.patient_mismatch_warning = 1
            record.patient_confirmation_status = "Mismatch Pending"
        else:
            record.patient_mismatch_warning = 0
            record.patient_confirmation_status = "Confirmed"

    validated_data = validate_medical_data(extracted_data)

    # 3. Clean old records
    db.query(LabResult).filter(LabResult.medical_record_id == record.id).delete()
    db.query(Medication).filter(Medication.medical_record_id == record.id).delete()
    db.query(HealthSummary).filter(HealthSummary.medical_record_id == record.id).delete()

    # 4. Save new lab results
    for lab in validated_data.lab_results:
        db.add(LabResult(
            medical_record_id=record.id,
            test_name=lab.test_name,
            value=lab.value,
            unit=lab.unit,
            reference_min=lab.reference_min,
            reference_max=lab.reference_max,
            reference_text=lab.reference_text,
            result_status=lab.result_status,
            source_text=lab.source_text,
            verification_status=lab.verification_status
        ))

    # 5. Save new medications
    for med in validated_data.medications:
        db.add(Medication(
            medical_record_id=record.id,
            medicine_name=med.medicine_name,
            strength=med.strength,
            dosage_instructions=med.dosage_instructions,
            frequency=med.frequency,
            duration=med.duration,
            route=med.route,
            source_text=med.source_text,
            verification_status=med.verification_status
        ))

    # 6. Generate new rich summary
    summary_obj = generate_health_summary(validated_data, language="en")
    db.add(HealthSummary(
        medical_record_id=record.id,
        language="en",
        summary_json=summary_obj.model_dump(),
        model_identifier="gemini-3.8-flash"
    ))

    record.processing_status = "Completed"
    record.extraction_status = "Completed"
    record.verification_status = "Needs Review" if (record.patient_mismatch_warning or any(l.verification_status == "Needs Review" for l in validated_data.lab_results)) else "Extracted"

    db.commit()
    db.refresh(record)
    return record
