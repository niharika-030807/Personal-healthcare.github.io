import datetime
import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, JSON, Integer
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    auth_provider = Column(String, default="email") # 'email' or 'google'
    google_sub = Column(String, unique=True, index=True, nullable=True)
    preferred_language = Column(String, default="en")
    date_of_birth = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    patients = relationship("Patient", back_populates="account_user", cascade="all, delete-orphan")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    display_name = Column(String, nullable=False, default="Self")
    relationship_type = Column(String, default="Self") # Self, Family Member, Dependent, Spouse, Child, Parent
    date_of_birth = Column(String, nullable=True)
    preferred_language = Column(String, default="en")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    account_user = relationship("User", back_populates="patients")
    records = relationship("MedicalRecord", back_populates="patient", cascade="all, delete-orphan")
    events = relationship("DocumentEvent", back_populates="patient", cascade="all, delete-orphan")

class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    record_type = Column(String, nullable=False, default="Unknown document")
    original_filename = Column(String, nullable=False)
    storage_reference = Column(String, nullable=False)
    document_date = Column(String, nullable=True)
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Patient identity tracking & mismatch resolution
    extracted_patient_name = Column(String, nullable=True)
    patient_mismatch_warning = Column(Integer, default=0) # 1 if extracted name differs from patient profile
    patient_confirmation_status = Column(String, default="Confirmed") # Confirmed, Mismatch Pending, Reassigned

    processing_status = Column(String, default="Completed")
    extraction_status = Column(String, default="Completed")
    verification_status = Column(String, default="Extracted")
    diagnoses = Column(JSON, default=list)
    is_demo = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="records")
    lab_results = relationship("LabResult", back_populates="medical_record", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="medical_record", cascade="all, delete-orphan")
    summaries = relationship("HealthSummary", back_populates="medical_record", cascade="all, delete-orphan")
    events = relationship("DocumentEvent", back_populates="medical_record", cascade="all, delete-orphan")

class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(String, primary_key=True, default=generate_uuid)
    medical_record_id = Column(String, ForeignKey("medical_records.id"), nullable=False)
    test_name = Column(String, nullable=False, index=True)
    value = Column(String, nullable=False)
    unit = Column(String, nullable=True)
    reference_min = Column(Float, nullable=True)
    reference_max = Column(Float, nullable=True)
    reference_text = Column(String, nullable=True)
    result_status = Column(String, default="Normal") # Normal, Abnormal, Critical, Unknown
    source_text = Column(Text, nullable=True)
    page_number = Column(Integer, default=1)
    verification_status = Column(String, default="Extracted")

    medical_record = relationship("MedicalRecord", back_populates="lab_results")

class Medication(Base):
    __tablename__ = "medications"

    id = Column(String, primary_key=True, default=generate_uuid)
    medical_record_id = Column(String, ForeignKey("medical_records.id"), nullable=False)
    medicine_name = Column(String, nullable=False, index=True)
    strength = Column(String, nullable=True)
    dosage_instructions = Column(String, nullable=True)
    frequency = Column(String, nullable=True)
    duration = Column(String, nullable=True)
    route = Column(String, nullable=True)
    source_text = Column(Text, nullable=True)
    verification_status = Column(String, default="Extracted")

    medical_record = relationship("MedicalRecord", back_populates="medications")

class HealthSummary(Base):
    __tablename__ = "health_summaries"

    id = Column(String, primary_key=True, default=generate_uuid)
    medical_record_id = Column(String, ForeignKey("medical_records.id"), nullable=False)
    language = Column(String, nullable=False, default="en")
    summary_json = Column(JSON, nullable=False)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    model_identifier = Column(String, default="gemini-2.0-flash")

    medical_record = relationship("MedicalRecord", back_populates="summaries")

class DocumentEvent(Base):
    __tablename__ = "document_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    medical_record_id = Column(String, ForeignKey("medical_records.id"), nullable=False)
    event_date = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False)
    description = Column(Text, nullable=False)

    patient = relationship("Patient", back_populates="events")
    medical_record = relationship("MedicalRecord", back_populates="events")
