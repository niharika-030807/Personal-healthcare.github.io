import os
import json
import logging
import requests
from typing import Dict, Any, List
from app.config import settings
from app.schemas import ExtractedMedicalData, SummaryJSON
from app.services.ai_extraction_service import extract_json_from_llm_text

logger = logging.getLogger(__name__)

DISCLAIMER_TEXT = (
    "Personal Health Copilot helps organize medical records and explain health information. "
    "It does not diagnose diseases, replace professional medical advice, or prescribe treatment. "
    "AI-generated explanations and extracted information may contain errors. "
    "Verify important findings with a qualified healthcare professional."
)

GEMINI_CANDIDATE_MODELS = [
    "gemini-flash-latest",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-3-flash-preview"
]

def generate_health_summary(extracted: ExtractedMedicalData, language: str = "en") -> SummaryJSON:
    """
    Generate an AI plain-language medical summary using Gemini API if key is available,
    or deterministic plain-language summary builder as fallback.
    """
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")

    if api_key and len(api_key.strip()) > 5:
        try:
            return _generate_gemini_summary(extracted, language, api_key)
        except Exception as e:
            logger.warning(f"Gemini summary generation failed: {e}. Using local fallback summary builder.")
            return _generate_local_summary(extracted, language)
    else:
        return _generate_local_summary(extracted, language)

def _generate_gemini_summary(extracted: ExtractedMedicalData, language: str, api_key: str) -> SummaryJSON:
    prompt = f"""
You are an empathetic, clear, highly competent healthcare AI assistant. Create an understandable plain-language summary of this patient document.
Make sure to emphasize the key highlights, clinical takeaways, and what the patient should know.

Input Document Details:
- Document Type: {extracted.record_type}
- Document Date: {extracted.document_date or 'Not stated'}
- Patient Name (if in document): {extracted.patient_name or 'Not specified'}
- Facility / Prescriber: {extracted.prescriber_or_facility or 'Not specified'}
- Measurements / Vitals / Labs: {json.dumps([l.model_dump() for l in extracted.lab_results])}
- Medications: {json.dumps([m.model_dump() for m in extracted.medications])}
- Diagnoses / History: {json.dumps(extracted.diagnoses)}
- Findings & Notes: {json.dumps(extracted.findings)}
- Extracted Highlights: {json.dumps(extracted.key_highlights)}
- Transcribed Text: {extracted.transcribed_text[:2000] if extracted.transcribed_text else ''}

Return JSON with exact keys:
{{
  "overview": "Comprehensive 2-4 sentence narrative overview explaining what this document is, key findings, and clinical context in patient-friendly terms.",
  "key_highlights": [
    "Key Takeaway 1 (e.g. Primary diagnosis or health status)",
    "Key Takeaway 2 (e.g. Vital signs, abnormal measurements or medications)",
    "Key Takeaway 3 (e.g. Action plan, lifestyle advice or follow-up)"
  ],
  "important_findings": ["Clear bullet point of vital sign, test, diagnosis, or observation"],
  "abnormal_results": [
    {{
      "test_name": "Test Name",
      "value": "Value with unit",
      "reference_range": "Normal range or standard",
      "explanation": "Plain language explanation of what this test/vital measures and what this value signifies."
    }}
  ],
  "plain_language_explanations": ["Simple explanation of medical terms, diagnosis, or care instructions"],
  "uncertainties": ["Uncertainty or missing info if any"],
  "questions_for_doctor": ["Empowering question to ask physician at next visit"],
  "disclaimer": "{DISCLAIMER_TEXT}"
}}
Language Target: {language}
"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json"}
    }

    res_data = None
    last_err = None

    for model in GEMINI_CANDIDATE_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            resp = requests.post(url, json=payload, timeout=12)
            if resp.status_code == 200:
                res_data = resp.json()
                logger.info(f"Gemini summary generation succeeded using model: {model}")
                break
            else:
                last_err = f"Model {model} returned HTTP {resp.status_code}: {resp.text[:200]}"
                logger.warning(last_err)
        except Exception as e:
            last_err = f"Model {model} failed with exception: {e}"
            logger.warning(last_err)
            continue

    if not res_data:
        raise RuntimeError(f"Gemini API summary request failed across candidate models: {last_err}")

    raw_json_str = res_data["candidates"][0]["content"]["parts"][0]["text"]
    parsed = extract_json_from_llm_text(raw_json_str)

    # Fallback for key_highlights if empty in response
    key_highlights = parsed.get("key_highlights") or extracted.key_highlights or []
    if not key_highlights and parsed.get("important_findings"):
        key_highlights = parsed.get("important_findings")[:4]

    return SummaryJSON(
        overview=parsed.get("overview", f"Summary of {extracted.record_type}."),
        key_highlights=key_highlights,
        important_findings=parsed.get("important_findings", []),
        diagnoses=parsed.get("diagnoses") or extracted.diagnoses or [],
        abnormal_results=parsed.get("abnormal_results", []),
        plain_language_explanations=parsed.get("plain_language_explanations", []),
        uncertainties=parsed.get("uncertainties", []),
        questions_for_doctor=parsed.get("questions_for_doctor", []),
        disclaimer=DISCLAIMER_TEXT
    )

def get_plain_language_abnormal_explanation(test_name: str, val_str: str, ref_str: str) -> str:
    """
    Provides clear, empathetic plain-language medical explanations of what abnormal test values mean.
    Fulfills requirement: 'Explain records in plain language, including what abnormal values mean.'
    """
    tn = test_name.lower()
    if "hemoglobin" in tn or "hb" in tn:
        return (
            f"Hemoglobin is the iron-rich protein in red blood cells that carries oxygen from your lungs to your organs. "
            f"Your value of {val_str} is below the standard reference range ({ref_str}), which indicates mild anemia. "
            f"This can cause fatigue, mild weakness, or pale skin. Discuss dietary iron sources (green leafy vegetables, legumes) "
            f"or iron supplements with your healthcare provider."
        )
    elif "fasting blood sugar" in tn or "fbs" in tn or "glucose" in tn:
        return (
            f"Fasting blood sugar measures glucose circulating in your blood after an overnight fast. "
            f"Your measured level of {val_str} is higher than normal bounds ({ref_str}), suggesting impaired fasting glucose. "
            f"This means your body is having slightly greater difficulty processing carbohydrates. "
            f"Regular physical activity and a low-glycemic, high-fiber diet can help normalize blood glucose levels."
        )
    elif "cholesterol" in tn:
        return (
            f"Cholesterol is a waxy, fat-like substance necessary for building healthy cells, but elevated levels can accumulate "
            f"as plaque along arterial linings over time. Your value of {val_str} exceeds the recommended limit ({ref_str}). "
            f"Adopting a heart-healthy diet low in saturated fats and maintaining routine cardiovascular exercise helps restore optimal lipid balance."
        )
    elif "blood pressure" in tn or "bp" in tn:
        return (
            f"Blood pressure measures the pressure of circulating blood against the walls of blood vessels. "
            f"Your reading of {val_str} is elevated above standard reference parameters ({ref_str}), signaling hypertension. "
            f"Sustained elevated blood pressure places strain on the heart and kidneys. Sodium moderation and lifestyle care are recommended."
        )
    elif "hba1c" in tn or "glycated hemoglobin" in tn:
        return (
            f"HbA1c reflects your average blood sugar levels over the past 2 to 3 months. "
            f"Your result of {val_str} is outside the standard reference interval ({ref_str}), indicating chronically elevated glucose levels. "
            f"Review this metric with your doctor to assess your metabolic health plan."
        )
    elif "creatinine" in tn:
        return (
            f"Serum creatinine is a waste product generated from normal muscle metabolism that healthy kidneys continuously filter. "
            f"A value of {val_str} above reference bounds ({ref_str}) suggests your kidneys may not be filtering waste at optimal capacity. "
            f"Staying adequately hydrated and consulting your doctor for a renal panel is advised."
        )
    elif "platelet" in tn:
        return (
            f"Platelets are specialized blood cells responsible for clotting and preventing excessive bleeding. "
            f"Your measured count of {val_str} deviates from the standard reference range ({ref_str}). "
            f"Consult your doctor to evaluate whether this reflects a temporary viral reaction or blood clotting variation."
        )
    elif "wbc" in tn or "white blood cell" in tn:
        return (
            f"White blood cells are your body's immune defenders against infections. "
            f"A count of {val_str} outside normal reference limits ({ref_str}) frequently indicates an active immune response, "
            f"such as a recent bacterial or viral infection, or physical inflammation."
        )
    else:
        return (
            f"{test_name} ({val_str}) was flagged as outside standard clinical reference bounds ({ref_str}). "
            f"This test measurement may indicate a biological variation or medical condition requiring follow-up with your doctor."
        )

def _generate_local_summary(extracted: ExtractedMedicalData, language: str) -> SummaryJSON:
    rec_type = extracted.record_type or "Medical record"
    date_str = extracted.document_date or "recent date"

    # Contextual overview
    overview_parts = [f"This document is a {rec_type} dated {date_str}."]
    if extracted.patient_name:
        overview_parts.append(f"It records medical observations for {extracted.patient_name}.")
    if extracted.prescriber_or_facility:
        overview_parts.append(f"Issued by {extracted.prescriber_or_facility}.")
    if extracted.diagnoses:
        overview_parts.append(f"Clinical notes document: {', '.join(extracted.diagnoses)}.")
    overview = " ".join(overview_parts)

    key_highlights = list(extracted.key_highlights) if extracted.key_highlights else []
    important_findings = []
    abnormal_results = []
    plain_explanations = []
    questions = []

    # Process lab results and vitals with plain-language clinical explanations
    for lab in extracted.lab_results:
        val_str = f"{lab.value} {lab.unit or ''}".strip()
        ref_str = lab.reference_text or (f"{lab.reference_min} - {lab.reference_max}" if lab.reference_min and lab.reference_max else "Normal Range")

        if lab.result_status == "Abnormal":
            explanation_text = get_plain_language_abnormal_explanation(lab.test_name, val_str, ref_str)
            abnormal_results.append({
                "test_name": lab.test_name,
                "value": val_str,
                "reference_range": ref_str,
                "explanation": explanation_text
            })
            important_findings.append(f"{lab.test_name}: {val_str} (Flagged outside reference limits)")
            plain_explanations.append(explanation_text)
            questions.append(f"What lifestyle or medical steps should I take to improve my {lab.test_name} ({val_str})?")
        else:
            important_findings.append(f"{lab.test_name}: {val_str} (Within normal limits)")

    # Process medications
    for med in extracted.medications:
        med_desc = f"{med.medicine_name} {med.strength or ''}".strip()
        important_findings.append(f"Prescribed Medication: {med_desc} - {med.dosage_instructions or 'Per prescription'}")
        plain_explanations.append(f"{med.medicine_name} is prescribed to be taken as instructed ({med.dosage_instructions or 'per prescription'}).")
        questions.append(f"How long should I take {med.medicine_name} and are there any food/drug interactions to watch for?")

    # Process diagnoses
    for diag in extracted.diagnoses:
        important_findings.append(f"Documented Condition/Diagnosis: {diag}")
        plain_explanations.append(f"Medical notes document {diag}. Regular monitoring and medication adherence support long-term wellness.")
        questions.append(f"What steps can I take to effectively manage {diag}?")

    # Fill key highlights if not already set
    if not key_highlights:
        if extracted.diagnoses:
            key_highlights.append(f"Diagnosed Condition: {', '.join(extracted.diagnoses)}")
        if abnormal_results:
            ab_names = [a['test_name'] for a in abnormal_results]
            key_highlights.append(f"Attention Needed: {', '.join(ab_names)} flagged for clinical review")
        if extracted.medications:
            med_names = [m.medicine_name for m in extracted.medications]
            key_highlights.append(f"Prescriptions: {', '.join(med_names)}")
        if not key_highlights and important_findings:
            key_highlights = important_findings[:3]
        if not key_highlights:
            key_highlights.append(f"{rec_type} uploaded and indexed in your health profile.")

    if not important_findings:
        important_findings.append(f"Document registered under {rec_type}. Detailed clinical parameters can be verified with your physician.")

    plain_explanations.append("All medical documents should be reviewed with a licensed healthcare provider for clinical evaluation.")

    uncertainties = extracted.uncertain_fields if extracted.uncertain_fields else []

    return SummaryJSON(
        overview=overview,
        key_highlights=key_highlights,
        important_findings=important_findings,
        diagnoses=extracted.diagnoses or [],
        abnormal_results=abnormal_results,
        plain_language_explanations=plain_explanations,
        uncertainties=uncertainties,
        questions_for_doctor=questions if questions else ["What follow-up tests or consultations do I need next?"],
        disclaimer=DISCLAIMER_TEXT
    )
