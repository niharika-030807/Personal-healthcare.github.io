from typing import List, Tuple
from app.schemas import ExtractedMedicalData, LabResultCreate, MedicationCreate

def validate_medical_data(extracted: ExtractedMedicalData) -> ExtractedMedicalData:
    """
    Apply strict validation checks on extracted medical data.
    Identify values outside reference ranges and set verification flags.
    """
    validated_labs: List[LabResultCreate] = []

    for lab in extracted.lab_results:
        status = lab.result_status or "Normal"
        verification = lab.verification_status or "Extracted"
        
        # Parse float value if available
        try:
            val_num = float(lab.value.replace(",", "").strip())
            
            # Check range
            if lab.reference_min is not None and val_num < lab.reference_min:
                status = "Abnormal"
                verification = "Needs Review"
            elif lab.reference_max is not None and val_num > lab.reference_max:
                status = "Abnormal"
                verification = "Needs Review"
        except (ValueError, AttributeError):
            # Non-numeric value or qualitative (e.g., Positive / Negative)
            if any(ab in str(lab.value).lower() for ab in ["positive", "reactive", "high", "low"]):
                status = "Abnormal"
                verification = "Needs Review"

        updated_lab = lab.model_copy(update={
            "result_status": status,
            "verification_status": verification
        })
        validated_labs.append(updated_lab)

    validated_meds: List[MedicationCreate] = []
    for med in extracted.medications:
        # Check potential dosage conflicts or missing strength
        verification = med.verification_status or "Extracted"
        if not med.strength or not med.dosage_instructions:
            verification = "Needs Review"
        
        updated_med = med.model_copy(update={
            "verification_status": verification
        })
        validated_meds.append(updated_med)

    return extracted.model_copy(update={
        "lab_results": validated_labs,
        "medications": validated_meds
    })
