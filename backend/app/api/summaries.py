from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import MedicalRecord, HealthSummary
from app.schemas import HealthSummarySchema, TranslationRequest
from app.services.summary_service import generate_health_summary
from app.services.translation_service import translate_summary_json
from app.services.ai_extraction_service import ExtractedMedicalData, LabResultCreate, MedicationCreate

router = APIRouter(prefix="/api/records", tags=["Health Summaries"])

@router.post("/{record_id}/summarize", response_model=HealthSummarySchema)
def regenerate_record_summary(
    record_id: str,
    language: str = "en",
    db: Session = Depends(get_db)
):
    """Regenerate plain-language AI summary for a record."""
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found.")

    labs = [
        LabResultCreate(
            test_name=l.test_name,
            value=l.value,
            unit=l.unit,
            reference_min=l.reference_min,
            reference_max=l.reference_max,
            reference_text=l.reference_text,
            result_status=l.result_status
        ) for l in record.lab_results
    ]
    meds = [
        MedicationCreate(
            medicine_name=m.medicine_name,
            strength=m.strength,
            dosage_instructions=m.dosage_instructions,
            frequency=m.frequency
        ) for m in record.medications
    ]

    extracted_data = ExtractedMedicalData(
        record_type=record.record_type,
        document_date=record.document_date,
        lab_results=labs,
        medications=meds
    )

    summary_obj = generate_health_summary(extracted_data, language=language)

    # Save summary
    health_summary_entity = HealthSummary(
        medical_record_id=record.id,
        language=language,
        summary_json=summary_obj.model_dump(),
        model_identifier="gemini-2.5-flash-pipeline"
    )
    db.add(health_summary_entity)
    db.commit()
    db.refresh(health_summary_entity)
    return health_summary_entity

@router.post("/{record_id}/translate")
def translate_record_summary(
    record_id: str,
    body: TranslationRequest,
    db: Session = Depends(get_db)
):
    """Translates the summary of a medical record into user selected target language (e.g. Telugu 'te', Hindi 'hi')."""
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found.")

    summary = db.query(HealthSummary).filter(
        HealthSummary.medical_record_id == record_id,
        HealthSummary.language == "en"
    ).order_by(HealthSummary.generated_at.desc()).first()

    if not summary:
        # Generate default summary if missing
        labs = [LabResultCreate(test_name=l.test_name, value=l.value, unit=l.unit) for l in record.lab_results]
        meds = [MedicationCreate(medicine_name=m.medicine_name, strength=m.strength) for m in record.medications]
        extracted_data = ExtractedMedicalData(record_type=record.record_type, document_date=record.document_date, lab_results=labs, medications=meds)
        summary_obj = generate_health_summary(extracted_data, language="en")
    else:
        from app.schemas import SummaryJSON
        summary_obj = SummaryJSON(**summary.summary_json)

    translated_json = translate_summary_json(summary_obj, body.target_language)

    return {
        "record_id": record_id,
        "target_language": body.target_language,
        "translated_summary": translated_json
    }
