from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
import datetime

# --- Auth & User Schemas ---
class UserRegister(BaseModel):
    full_name: str
    email: str
    password: str
    confirm_password: Optional[str] = None
    preferred_language: Optional[str] = "en"
    date_of_birth: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class GoogleLoginRequest(BaseModel):
    id_token: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None

class UserSchema(BaseModel):
    id: str
    email: str
    full_name: str
    auth_provider: Optional[str] = "email"
    google_sub: Optional[str] = None
    preferred_language: str
    date_of_birth: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserSchema
    patients: List["PatientSchema"] = []

# --- Patient Schemas ---
class PatientCreate(BaseModel):
    display_name: str
    relationship_type: Optional[str] = "Self"
    date_of_birth: Optional[str] = None
    preferred_language: Optional[str] = "en"

class PatientSchema(BaseModel):
    id: str
    user_id: str
    display_name: str
    relationship_type: str
    date_of_birth: Optional[str] = None
    preferred_language: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- Lab Results ---
class LabResultBase(BaseModel):
    test_name: str
    value: str
    unit: Optional[str] = None
    reference_min: Optional[float] = None
    reference_max: Optional[float] = None
    reference_text: Optional[str] = None
    result_status: Optional[str] = "Normal" # Normal, Abnormal, Critical, Unknown
    source_text: Optional[str] = None
    page_number: Optional[int] = 1
    verification_status: Optional[str] = "Extracted"

class LabResultCreate(LabResultBase):
    pass

class LabResultUpdate(BaseModel):
    test_name: Optional[str] = None
    value: Optional[str] = None
    unit: Optional[str] = None
    reference_min: Optional[float] = None
    reference_max: Optional[float] = None
    reference_text: Optional[str] = None
    result_status: Optional[str] = None
    verification_status: Optional[str] = None

class LabResultSchema(LabResultBase):
    id: str
    medical_record_id: str

    model_config = ConfigDict(from_attributes=True)

# --- Medications ---
class MedicationBase(BaseModel):
    medicine_name: str
    strength: Optional[str] = None
    dosage_instructions: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    route: Optional[str] = None
    source_text: Optional[str] = None
    verification_status: Optional[str] = "Extracted"

class MedicationCreate(MedicationBase):
    pass

class MedicationUpdate(BaseModel):
    medicine_name: Optional[str] = None
    strength: Optional[str] = None
    dosage_instructions: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    route: Optional[str] = None
    verification_status: Optional[str] = None

class MedicationSchema(MedicationBase):
    id: str
    medical_record_id: str

    model_config = ConfigDict(from_attributes=True)

# --- AI Extracted Document Schema ---
class ExtractedMedicalData(BaseModel):
    record_type: str = Field(description="Prescription, Laboratory report, Diagnostic report, Discharge summary, Medical history, Unknown document")
    document_date: Optional[str] = Field(default=None, description="Date of document YYYY-MM-DD if available")
    patient_name: Optional[str] = Field(default=None, description="Patient name stated explicitly in source document")
    prescriber_or_facility: Optional[str] = None
    lab_results: List[LabResultCreate] = []
    medications: List[MedicationCreate] = []
    diagnoses: List[str] = []
    procedures: List[str] = []
    findings: List[str] = []
    impression: Optional[str] = None
    recommendations: List[str] = []
    follow_up_instructions: Optional[str] = None
    raw_text: Optional[str] = None
    transcribed_text: Optional[str] = None
    key_highlights: List[str] = []
    uncertain_fields: List[str] = []

# --- Summaries ---
class SummaryJSON(BaseModel):
    overview: str
    key_highlights: List[str] = []
    important_findings: List[str] = []
    diagnoses: List[str] = []
    abnormal_results: List[Dict[str, Any]] = []
    plain_language_explanations: List[str] = []
    uncertainties: List[str] = []
    questions_for_doctor: List[str] = []
    disclaimer: str

class HealthSummarySchema(BaseModel):
    id: str
    medical_record_id: str
    language: str
    summary_json: Dict[str, Any]
    generated_at: datetime.datetime
    model_identifier: str

    model_config = ConfigDict(from_attributes=True)

# --- Medical Record ---
class MedicalRecordBase(BaseModel):
    record_type: str
    original_filename: str
    document_date: Optional[str] = None
    diagnoses: List[str] = []

class MedicalRecordSchema(MedicalRecordBase):
    id: str
    patient_id: str
    storage_reference: str
    upload_date: datetime.datetime
    extracted_patient_name: Optional[str] = None
    patient_mismatch_warning: int = 0
    patient_confirmation_status: str = "Confirmed"
    processing_status: str
    extraction_status: str
    verification_status: str
    diagnoses: List[str] = []
    is_demo: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    lab_results: List[LabResultSchema] = []
    medications: List[MedicationSchema] = []
    summaries: List[HealthSummarySchema] = []

    model_config = ConfigDict(from_attributes=True)

# --- Document Event ---
class DocumentEventSchema(BaseModel):
    id: str
    patient_id: str
    medical_record_id: str
    event_date: str
    event_type: str
    description: str

    model_config = ConfigDict(from_attributes=True)

# --- Language Metadata ---
class LanguageMeta(BaseModel):
    code: str
    name: str
    native_name: str
    dir: str = "ltr"
    interface_supported: bool = False
    ai_translation_supported: bool = True
    ocr_supported: bool = True
    region: Optional[str] = None

# --- Translation Request ---
class TranslationRequest(BaseModel):
    target_language: str

# --- Record Correction & Reassignment Request ---
class RecordCorrectionRequest(BaseModel):
    document_date: Optional[str] = None
    record_type: Optional[str] = None
    verification_status: Optional[str] = "User Verified"
    patient_confirmation_status: Optional[str] = "Confirmed"
    diagnoses: Optional[List[str]] = None
    lab_results: Optional[List[LabResultCreate]] = None
    medications: Optional[List[MedicationCreate]] = None
