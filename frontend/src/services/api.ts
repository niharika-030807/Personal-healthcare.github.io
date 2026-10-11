import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach Bearer token if logged in and handle FormData boundary
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('health_copilot_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // When transmitting FormData, let browser generate multipart boundary automatically
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
  }
  return config;
});

export interface User {
  id: string;
  email: string;
  full_name: string;
  auth_provider?: string;
  google_sub?: string;
  preferred_language: string;
  date_of_birth?: string;
  created_at: string;
}

export interface Patient {
  id: string;
  user_id: string;
  display_name: string;
  relationship_type?: string;
  date_of_birth?: string;
  preferred_language: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  patients: Patient[];
}

export interface LanguageMeta {
  code: string;
  name: string;
  native_name: string;
  dir: 'ltr' | 'rtl';
  interface_supported: boolean;
  ai_translation_supported: boolean;
  ocr_supported: boolean;
  region?: string;
}

export interface LabResult {
  id: string;
  medical_record_id: string;
  test_name: string;
  value: string;
  unit?: string;
  reference_min?: number;
  reference_max?: number;
  reference_text?: string;
  result_status: string;
  source_text?: string;
  verification_status: string;
}

export interface Medication {
  id: string;
  medical_record_id: string;
  medicine_name: string;
  strength?: string;
  dosage_instructions?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  verification_status: string;
}

export interface HealthSummary {
  id: string;
  medical_record_id: string;
  language: string;
  summary_json: {
    overview: string;
    key_highlights?: string[];
    important_findings: string[];
    diagnoses?: string[];
    abnormal_results: Array<{
      test_name: string;
      value: string;
      reference_range: string;
      explanation: string;
    }>;
    plain_language_explanations: string[];
    uncertainties: string[];
    questions_for_doctor: string[];
    disclaimer: string;
  };
  generated_at: string;
  model_identifier: string;
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  record_type: string;
  original_filename: string;
  storage_reference: string;
  document_date?: string;
  upload_date: string;
  extracted_patient_name?: string;
  patient_mismatch_warning: number;
  patient_confirmation_status: string;
  processing_status: string;
  extraction_status: string;
  verification_status: string;
  diagnoses?: string[];
  is_demo: number;
  created_at: string;
  updated_at: string;
  lab_results: LabResult[];
  medications: Medication[];
  summaries: HealthSummary[];
}

export interface DocumentEvent {
  id: string;
  patient_id: string;
  medical_record_id: string;
  event_date: string;
  event_type: string;
  description: string;
}

// Auth API Calls
export const loginApi = async (email: string, password: string, fullName?: string): Promise<AuthResponse> => 
  (await api.post('/api/auth/login', { email, password, full_name: fullName })).data;

export const googleAuthApi = async (idToken: string): Promise<AuthResponse> =>
  (await api.post('/api/auth/google', { id_token: idToken })).data;

export const registerApi = async (payload: {
  full_name: string;
  email: string;
  password: string;
  confirm_password?: string;
  preferred_language?: string;
  date_of_birth?: string;
}): Promise<AuthResponse> => (await api.post('/api/auth/register', payload)).data;

export const fetchAuthMeApi = async (): Promise<{ user: User; patients: Patient[] }> =>
  (await api.get('/api/auth/me')).data;

export const fetchUserPatientsApi = async (): Promise<Patient[]> =>
  (await api.get('/api/auth/patients')).data;

export const createPatientProfileApi = async (payload: { display_name: string; relationship_type?: string }): Promise<Patient> =>
  (await api.post('/api/auth/patients', payload)).data;

export const fetchHealth = async () => (await api.get('/health')).data;
export const fetchLanguages = async (): Promise<LanguageMeta[]> => (await api.get('/api/languages')).data;
export const fetchPatientMe = async (): Promise<Patient> => (await api.get('/api/patients/me')).data;

export const fetchRecords = async (type?: string, patientId?: string): Promise<MedicalRecord[]> => 
  (await api.get('/api/records', { params: { record_type: type, patient_id: patientId } })).data;

export const fetchRecordDetail = async (id: string): Promise<MedicalRecord> => (await api.get(`/api/records/${id}`)).data;

export const reprocessRecordApi = async (id: string): Promise<MedicalRecord> => (await api.post(`/api/records/${id}/reprocess`)).data;

export const updateRecord = async (id: string, payload: any): Promise<MedicalRecord> => (await api.patch(`/api/records/${id}`, payload)).data;

export const confirmPatientMismatchApi = async (recordId: string, targetPatientId?: string) =>
  (await api.post(`/api/records/${recordId}/confirm_patient`, null, { params: { target_patient_id: targetPatientId } })).data;

export const deleteRecord = async (id: string) => (await api.delete(`/api/records/${id}`)).data;

export const uploadRecordFile = async (file: File, patientId?: string): Promise<MedicalRecord> => {
  const formData = new FormData();
  formData.append('file', file);
  if (patientId) {
    formData.append('patient_id', patientId);
  }
  return (await api.post('/api/records/upload', formData)).data;
};

export const translateSummary = async (recordId: string, targetLanguage: string) => 
  (await api.post(`/api/records/${recordId}/translate`, { target_language: targetLanguage })).data;

export const fetchTimeline = async (eventType?: string, search?: string): Promise<DocumentEvent[]> =>
  (await api.get('/api/timeline', { params: { event_type: eventType, search } })).data;

export const fetchTrendTests = async (): Promise<string[]> => (await api.get('/api/trends/tests')).data;

export const fetchLabTrend = async (testName: string) => (await api.get(`/api/trends/${encodeURIComponent(testName)}`)).data;

export const fetchFhirObservation = async () => (await api.get('/api/interop/fhir/Observation')).data;

export const exportRecordFhir = async (recordId: string) => (await api.get(`/api/records/${recordId}/export`)).data;

export const seedDemo = async () => (await api.post('/api/demo/seed')).data;
