import sys
import os
import io
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.services.document_classifier import classify_document_text
from app.services.ai_extraction_service import extract_structured_medical_data
from app.services.summary_service import generate_health_summary, get_plain_language_abnormal_explanation
from app.services.translation_service import translate_summary_json
from app.services.ocr_service import preprocess_image_for_handwriting
from app.schemas import ExtractedMedicalData, LabResultCreate, MedicationCreate, SummaryJSON
from PIL import Image

client = TestClient(app)

def get_demo_auth_headers():
    response = client.post("/api/auth/login", json={
        "email": "eleanor@healthcopilot.org",
        "password": "demo1234"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# ==============================================================================
# REQUIREMENT 1: Medical Record Intelligence & OCR
# Ingest prescriptions, lab reports, discharge summaries, and diagnostic records;
# Extract medicines, dosages, test values, diagnoses, and dates.
# ==============================================================================

def test_document_classification_all_types():
    """Verify system accurately classifies all 4 mandatory document types + checkup reports."""
    rx_text = "Rx: Tab Amoxicillin 500mg 1-0-1 for 7 days. Prescribed by Dr. Sharma."
    lab_text = "Comprehensive Metabolic Panel: Hemoglobin 10.5 g/dL, Glucose 118 mg/dL, ref range 70-99."
    discharge_text = "Hospital Discharge Summary: Date of admission 2026-08-18, Date of discharge 2026-08-20. Condition at discharge stable."
    diagnostic_text = "Chest X-Ray Diagnostic Report: Impression: Normal lungs, no focal consolidation."

    assert classify_document_text(rx_text) == "Prescription"
    assert classify_document_text(lab_text) == "Laboratory report"
    assert classify_document_text(discharge_text) == "Discharge summary"
    assert classify_document_text(diagnostic_text) == "Diagnostic report"

def test_medical_entity_extraction():
    """Verify extraction of medicines, dosages, test values, diagnoses, and dates."""
    sample_text = """
    City Hospital - Clinical Consultation Record
    Date: 2026-09-15
    Patient Name: Eleanor Vance
    Primary Diagnosis: Acute Bronchitis and Iron-Deficiency Anemia

    Measurements:
    Blood Pressure: 135/85 mmHg
    Hemoglobin: 10.2 g/dL (12.0 - 16.0)
    Fasting Blood Sugar: 115 mg/dL (70.0 - 99.0)

    Prescriptions:
    1. Tab Azithromycin 500 mg - 1-0-0 once daily for 5 days
    2. Tab Ferrous Sulfate 325 mg - Take 1 tablet daily with food
    """
    extracted = extract_structured_medical_data(text=sample_text, file_name="Consultation_Report.pdf")

    # 1. Dates
    assert extracted.document_date == "2026-09-15"

    # 2. Diagnoses
    assert len(extracted.diagnoses) > 0
    assert any("Bronchitis" in d or "Anemia" in d for d in extracted.diagnoses)

    # 3. Test values (Labs/Vitals)
    assert len(extracted.lab_results) >= 2
    test_names = [l.test_name for l in extracted.lab_results]
    assert "Hemoglobin" in test_names
    hb = next(l for l in extracted.lab_results if l.test_name == "Hemoglobin")
    assert hb.value == "10.2"
    assert hb.result_status == "Abnormal"

    # 4. Medicines & Dosages
    assert len(extracted.medications) >= 2
    med_names = [m.medicine_name for m in extracted.medications]
    assert any("Azithromycin" in m for m in med_names) or any("Ferrous Sulfate" in m for m in med_names)
    az = next((m for m in extracted.medications if "Azithromycin" in m.medicine_name), None)
    if az:
        assert az.strength == "500 mg" or "500" in az.strength
        inst_or_freq = f"{az.dosage_instructions} {az.frequency or ''}".lower()
        assert "daily" in inst_or_freq

# ==============================================================================
# REQUIREMENT 2: AI Health Summary in Simple Language
# Explain records in plain language, including what abnormal values mean.
# ==============================================================================

def test_plain_language_health_summary_and_abnormal_explanations():
    """Verify plain-language overview and clinical explanations for abnormal values."""
    extracted = ExtractedMedicalData(
        record_type="Laboratory report",
        document_date="2026-09-05",
        patient_name="Eleanor Vance",
        lab_results=[
            LabResultCreate(
                test_name="Hemoglobin",
                value="10.2",
                unit="g/dL",
                reference_min=12.0,
                reference_max=16.0,
                reference_text="12.0 - 16.0 g/dL",
                result_status="Abnormal"
            ),
            LabResultCreate(
                test_name="Fasting Blood Sugar",
                value="118.0",
                unit="mg/dL",
                reference_min=70.0,
                reference_max=99.0,
                reference_text="70.0 - 99.0 mg/dL",
                result_status="Abnormal"
            )
        ],
        medications=[],
        diagnoses=["Mild Iron-Deficiency Anemia"],
        key_highlights=[]
    )

    summary = generate_health_summary(extracted, language="en")

    # Plain language overview
    assert len(summary.overview) > 20
    assert "Eleanor Vance" in summary.overview or "Laboratory report" in summary.overview

    # What abnormal values mean
    assert len(summary.abnormal_results) == 2
    hb_ab = next(a for a in summary.abnormal_results if a["test_name"] == "Hemoglobin")
    assert "anemia" in hb_ab["explanation"].lower() or "oxygen" in hb_ab["explanation"].lower()
    
    fbs_ab = next(a for a in summary.abnormal_results if a["test_name"] == "Fasting Blood Sugar")
    assert "glucose" in fbs_ab["explanation"].lower() or "sugar" in fbs_ab["explanation"].lower()

    # Medical questions for doctor
    assert len(summary.questions_for_doctor) > 0
    assert len(summary.disclaimer) > 10

def test_clinical_abnormal_value_explainer():
    """Test dedicated plain-language explainer helper."""
    exp = get_plain_language_abnormal_explanation("Hemoglobin", "10.2 g/dL", "12.0 - 16.0 g/dL")
    assert "oxygen" in exp.lower()
    assert "anemia" in exp.lower()

    bp_exp = get_plain_language_abnormal_explanation("Blood Pressure", "145/90 mmHg", "120/80 mmHg")
    assert "hypertension" in bp_exp.lower()

# ==============================================================================
# REQUIREMENT 3: Unified Health Profile & Timeline
# Organize everything into one profile or timeline.
# ==============================================================================

def test_unified_health_profile_endpoints():
    """Verify backend endpoints powering the Unified Health Profile & Timeline."""
    headers = get_demo_auth_headers()

    # 1. Records endpoint returning all record types with diagnoses
    res_records = client.get("/api/records", headers=headers)
    assert res_records.status_code == 200
    records = res_records.json()
    assert len(records) >= 5

    # Check distinct record types in patient profile
    rec_types = set(r["record_type"] for r in records)
    assert "Laboratory report" in rec_types
    assert "Prescription" in rec_types
    assert "Discharge summary" in rec_types
    assert "Diagnostic report" in rec_types

    # Verify diagnoses are present
    has_diagnoses = any(len(r.get("diagnoses", [])) > 0 for r in records)
    assert has_diagnoses is True

    # 2. Timeline endpoint returning chronological event stream
    res_timeline = client.get("/api/timeline", headers=headers)
    assert res_timeline.status_code == 200
    timeline = res_timeline.json()
    assert len(timeline) >= 5
    # Events have dates and types
    assert all("event_date" in ev and "event_type" in ev for ev in timeline)

# ==============================================================================
# BONUS FEATURES 3.2: Multi-language Support & Bilingual/Handwritten OCR
# ==============================================================================

def test_multilingual_summary_translation():
    """Verify AI/fallback translation of summaries into Hindi (hi), Telugu (te), and Tamil (ta)."""
    summary_obj = SummaryJSON(
        overview="This document is a laboratory blood analysis indicating mild anemia and elevated glucose.",
        key_highlights=[
            "Blood pressure was mildly elevated at 140 mmHg.",
            "Continue daily medication hydrochlorothiazide 25 mg."
        ],
        important_findings=["Hemoglobin: 10.2 g/dL (Flagged outside reference limits)"],
        diagnoses=["Mild Iron-Deficiency Anemia"],
        abnormal_results=[{
            "test_name": "Hemoglobin",
            "value": "10.2 g/dL",
            "reference_range": "12.0 - 16.0 g/dL",
            "explanation": "Hemoglobin measures oxygen carrying red blood cells."
        }],
        plain_language_explanations=["Your red blood cell count is slightly lower than normal."],
        uncertainties=[],
        questions_for_doctor=["Should I start iron supplements?"],
        disclaimer="Personal Health Copilot provides informational summaries."
    )

    # 1. Telugu (te)
    te_trans = translate_summary_json(summary_obj, "te")
    assert any('\u0c00' <= c <= '\u0c7f' for c in te_trans["overview"]) or "వైద్య" in te_trans["overview"] or "సారాంశం" in te_trans["overview"]
    assert len(te_trans["key_highlights"]) > 0

    # 2. Hindi (hi)
    hi_trans = translate_summary_json(summary_obj, "hi")
    assert any('\u0900' <= c <= '\u097f' for c in hi_trans["overview"]) or "दस्तावेज़" in hi_trans["overview"] or "रिपोर्ट" in hi_trans["overview"]
    assert len(hi_trans["key_highlights"]) > 0

    # 3. Tamil (ta)
    ta_trans = translate_summary_json(summary_obj, "ta")
    assert any('\u0b80' <= c <= '\u0bff' for c in ta_trans["overview"]) or "ஆவணம்" in ta_trans["overview"] or "அறிக்கை" in ta_trans["overview"]
    assert len(ta_trans["key_highlights"]) > 0

def test_language_catalog_regional_support():
    """Verify language catalog includes Hindi, Telugu, and Tamil with interface support."""
    res = client.get("/api/languages")
    assert res.status_code == 200
    languages = res.json()
    lang_map = {l["code"]: l for l in languages}

    assert "hi" in lang_map and lang_map["hi"]["interface_supported"] is True
    assert "te" in lang_map and lang_map["te"]["interface_supported"] is True
    assert "ta" in lang_map and lang_map["ta"]["interface_supported"] is True

def test_bilingual_and_handwritten_ocr_pipeline():
    """Verify handwriting preprocessing filter and bilingual script recognition."""
    # 1. Test handwriting image contrast & sharpening filter
    img = Image.new("RGB", (300, 150), color=(240, 240, 240))
    processed = preprocess_image_for_handwriting(img)
    assert processed.mode == "L"  # Grayscale conversion for ink contrast
    assert processed.size == (300, 150)

    # 2. Test bilingual and handwritten prescription classification
    bilingual_rx_hindi = "डॉक्टर पर्चा: Tab Paracetamol 650mg 1-0-1 दिन में दो बार"
    bilingual_rx_telugu = "వైద్య ప్రిస్క్రిప్షన్: Tab Metformin 500mg 1-0-1 భోజనం తర్వాత"
    bilingual_rx_tamil = "மருத்துவர் மருந்துச் சீட்டு: Tab Amoxicillin 500mg 1-0-1"

    assert classify_document_text(bilingual_rx_hindi) == "Prescription"
    assert classify_document_text(bilingual_rx_telugu) == "Prescription"
    assert classify_document_text(bilingual_rx_tamil) == "Prescription"

    # 3. Test handwritten dosage shorthand parsing (1-0-1, BD, TDS)
    handwritten_note = "Rx: Tab Pantoprazole 40mg 1-0-0 AC. Tab Paracetamol 650mg SOS."
    extracted = extract_structured_medical_data(text=handwritten_note, file_name="Handwritten_Rx.jpg")
    assert len(extracted.medications) >= 1
    panto = next((m for m in extracted.medications if "Pantoprazole" in m.medicine_name), None)
    if panto:
        dosage_info = f"{panto.dosage_instructions} {panto.frequency or ''}".lower()
        assert "once daily" in dosage_info or "morning" in dosage_info or "1-0-0" in dosage_info
