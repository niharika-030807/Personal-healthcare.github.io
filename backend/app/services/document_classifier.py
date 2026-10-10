import re
from typing import List, Dict

VALID_RECORD_TYPES = [
    "Prescription",
    "Laboratory report",
    "Diagnostic report",
    "Discharge summary",
    "Medical history",
    "General check-up report",
    "Unknown document"
]

def classify_document_text(text: str) -> str:
    """
    Rule-based fast classification with fallback to Medical history or General Check-up Report.
    """
    if not text:
        return "General check-up report"

    lower_text = text.lower()

    # Rule heuristics (including bilingual English + Hindi, Telugu, Tamil medical terms)
    lab_keywords = [
        "hemoglobin", "wbc", "platelet", "cholesterol", "triglycerides", "hba1c", "blood test", "laboratory", 
        "ref range", "reference range", "unit", "specimen", "serum", "lipid profile", "complete blood count", "cbc",
        "प्रयोगशाला", "रक्त जांच", "जांच रिपोर्ट", "రక్త పరీక్ష", "ల్యాబ్ రిపోర్ట్", "రక్త నమూనా", "இரத்த பரிசோதனை", "ஆய்வக அறிக்கை"
    ]
    rx_keywords = [
        "rx", "℞", "prescription", "capsule", "tablet", "tab", "cap", "syr", "syrup", "mg", "dosage", "take 1", 
        "once daily", "twice daily", "po", "prescriber", "dr.", "hydrochlorothiazide", "hydrochlorthiqzide",
        "1-0-1", "1-0-0", "0-0-1", "1-1-1", "b.d", "bd", "t.d.s", "tds", "o.d", "od", "h.s", "hs", "s.o.s", "sos",
        "दवा", "पर्चा", "प्रिस्क्रिप्शन", "खुराक", "मందులు", "ప్రిస్క్రిప్షన్", "మోతాదు", "రోగి", "மருந்து", "பிரிஸ்கிரிப்ஷன்"
    ]
    discharge_keywords = [
        "discharge summary", "date of admission", "date of discharge", "admission date", "course in hospital", 
        "discharge prescription", "discharge diagnosis", "condition at discharge", "hospital course",
        "डिस्चार्ज सारांश", "अस्पताल", "छुट्टी", "డిశ్చార్జ్ సారాంశం", "ఆసుపత్రి నుండి డిశ్చార్జ్", "டிஸ்சார்ஜ் சுருக்கம்"
    ]
    diagnostic_keywords = [
        "x-ray", "mri", "ct scan", "ultrasound", "impression:", "findings:", "radiology", "echocardiogram", "diagnostic report",
        "एक्स-रे", "सीटी स्कैन", "अल्ट्रासाउंड", "ఎక్స్-రే", "సిటి స్కాన్", "ఎకోకార్డియోగ్రామ్", "எக்ஸ்-ரே", "சிடி ஸ்கேன்"
    ]
    history_keywords = [
        "general check-up", "check-up report", "vitals", "medical history", "past history", "chief complaint", 
        "family history", "social history", "blood pressure", "pulse", "respiratory", "doctor's observations",
        "स्वास्थ्य इतिहास", "వైద్య చరిత్ర", "மருத்துவ வரலாறு"
    ]

    lab_score = sum(1 for kw in lab_keywords if kw in lower_text)
    rx_score = sum(1 for kw in rx_keywords if kw in lower_text)
    discharge_score = sum(1 for kw in discharge_keywords if kw in lower_text)
    diagnostic_score = sum(1 for kw in diagnostic_keywords if kw in lower_text)
    history_score = sum(1 for kw in history_keywords if kw in lower_text)

    scores = {
        "Laboratory report": lab_score * 1.5,
        "Prescription": rx_score * 1.2,
        "Discharge summary": discharge_score * 2.0,
        "Diagnostic report": diagnostic_score * 1.8,
        "General check-up report": history_score * 1.5
    }

    max_type, max_score = max(scores.items(), key=lambda item: item[1])

    if max_score > 0.5:
        return max_type

    return "General check-up report"
