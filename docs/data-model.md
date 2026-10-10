# Personal Health Copilot - Data Model & Schemas

## Database Schema (SQLAlchemy Models)

### 1. `patients`
- `id` (String, PK, UUID)
- `user_id` (String, Unique)
- `display_name` (String)
- `date_of_birth` (String, Optional)
- `preferred_language` (String, default "en")
- `created_at` (DateTime)
- `updated_at` (DateTime)

### 2. `medical_records`
- `id` (String, PK, UUID)
- `patient_id` (String, FK -> patients.id)
- `record_type` (String: Prescription, Laboratory report, Diagnostic report, Discharge summary, Medical history, Unknown document)
- `original_filename` (String)
- `storage_reference` (String)
- `document_date` (String, YYYY-MM-DD)
- `upload_date` (DateTime)
- `processing_status` (String: Uploading, Extracting text, Classifying document, Extracting medical information, Validating extracted data, Generating summary, Saving record, Completed, Failed)
- `extraction_status` (String: Pending, Processing, Completed, Failed)
- `verification_status` (String: Extracted, Needs Review, User Verified)
- `is_demo` (Integer: 0 or 1)
- `created_at` (DateTime)

### 3. `lab_results`
- `id` (String, PK, UUID)
- `medical_record_id` (String, FK -> medical_records.id)
- `test_name` (String, Indexed)
- `value` (String)
- `unit` (String, Optional)
- `reference_min` (Float, Optional)
- `reference_max` (Float, Optional)
- `reference_text` (String, Optional)
- `result_status` (String: Normal, Abnormal, Critical, Unknown)
- `verification_status` (String: Extracted, Needs Review, User Verified)

### 4. `medications`
- `id` (String, PK, UUID)
- `medical_record_id` (String, FK -> medical_records.id)
- `medicine_name` (String, Indexed)
- `strength` (String, Optional)
- `dosage_instructions` (String, Optional)
- `frequency` (String, Optional)
- `duration` (String, Optional)
- `route` (String, Optional)
- `verification_status` (String: Extracted, Needs Review, User Verified)

### 5. `health_summaries`
- `id` (String, PK, UUID)
- `medical_record_id` (String, FK -> medical_records.id)
- `language` (String, default "en")
- `summary_json` (JSON)
- `generated_at` (DateTime)
- `model_identifier` (String)

### 6. `document_events`
- `id` (String, PK, UUID)
- `patient_id` (String, FK -> patients.id)
- `medical_record_id` (String, FK -> medical_records.id)
- `event_date` (String, Indexed)
- `event_type` (String)
- `description` (Text)
