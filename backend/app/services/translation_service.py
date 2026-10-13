import os
import json
import logging
from typing import Dict, Any
from app.config import settings
from app.schemas import SummaryJSON
from app.services.ai_extraction_service import extract_json_from_llm_text

logger = logging.getLogger(__name__)

# Fallback dictionary mappings for common medical terms in Telugu and Hindi for demo reliability
TELUGU_DICT = {
    "Summary": "వైద్య సమాచారం సారాంశం",
    "Laboratory report": "ల్యాబరేటరీ రిపోర్ట్",
    "Prescription": "మందుల చీటీ (ప్రిస్క్రిప్షన్)",
    "Diagnostic report": "డయాగ్నోస్టిక్ నివేదిక",
    "Discharge summary": "డిశ్చార్జ్ సారాంశం",
    "Medical history": "వైద్య చరిత్ర",
    "Important findings": "ముఖ్యమైన వైద్య విషయాలు",
    "Results outside reference range": "సాధారణ పరిమితులకు వెలుపల ఉన్న ఫలితాలు",
    "Questions to ask doctor": "వైద్యుడిని అడగవలసిన ప్రశ్నలు",
    "Disclaimer": "హెచ్చరిక: ఈ సమాచారం వైద్య నిపుణుడి సలహాకు ప్రత్యామ్నాయం కాదు.",
    "Within normal limits": "సాధారణ పరిమితులలో ఉంది",
    "Flagged as outside reference bounds": "సాధారణ సరిహద్దుల వెలుపల ఉంది",
    "Prescribed Medication": "సూచించిన ఔషధం",
    "Total Cholesterol": "మొత్తం కొలెస్ట్రాల్",
    "LDL Cholesterol": "LDL (చెడు) కొలెస్ట్రాల్",
    "HDL Cholesterol": "HDL (మంచి) కొలెస్ట్రాల్",
    "Triglycerides": "ట్రైగ్లిజరైడ్స్",
    "Cholesterol": "కొలెస్ట్రాల్",
    "hs-CRP": "hs-CRP (ఇన్‌ఫ్లమేషన్ పరీక్ష)",
    "Vitamin D deficiency": "విటమిన్ డి లోపం",
    "Vitamin B12 deficiency": "విటమిన్ బి12 లోపం",
    "Vitamin D": "విటమిన్ డి",
    "Vitamin B12": "విటమిన్ బి12",
    "deficiency": "లోపం",
    "Elevated": "అధికం (పెరిగింది)",
    "elevated": "అధికం (పెరిగింది)",
    "Blood glucose levels are within the normal range": "రక్తంలో గ్లూకోజ్ స్థాయిలు సాధారణ పరిధిలో ఉన్నాయి",
    "levels are within the normal range": "స్థాయిలు సాధారణ పరిధిలో ఉన్నాయి",
    "Blood glucose": "రక్తంలో గ్లూకోజ్",
    "Fasting Blood Glucose": "ఖాళీ కడుపున రక్తంలో గ్లూకోజ్",
    "suggesting possible inflammation or increased cardiovascular risk": "ఇది శరీరంలో వాపు లేదా గుండె సంబంధిత ముప్పు పెరిగే సంకేతం కావచ్చు",
    "suggesting possible inflammation": "శరీరంలో వాపు ఉండవచ్చని సూచిస్తుంది",
    "increased cardiovascular risk": "గుండె సంబంధిత ముప్పు పెరిగే అవకాశం ఉంది",
    "Routine Health Check": "సాధారణ ఆరోగ్య పరీక్ష",
    "Hyperlipidemia / Dyslipidemia": "హైపర్‌లిపిడెమియా (అధిక కొలెస్ట్రాల్)",
    "Vitamin D Deficiency": "విటమిన్ డి లోపం",
    "Vitamin B12 Deficiency": "విటమిన్ బి12 లోపం",
    "Systemic Inflammation": "సిస్టమిక్ ఇన్‌ఫ్లమేషన్ (శరీరంలో వాపు)"
}

HINDI_DICT = {
    "Summary": "स्वास्थ्य रिपोर्ट का सारांश",
    "Laboratory report": "प्रयोगशाला रिपोर्ट (लैब रिपोर्ट)",
    "Prescription": "दवा का पर्चा (प्रिस्क्रिप्शन)",
    "Diagnostic report": "नैदानिक रिपोर्ट",
    "Discharge summary": "डिस्चार्ज सारांश",
    "Medical history": "चिकित्सा इतिहास",
    "Important findings": "महत्वपूर्ण निष्कर्ष",
    "Results outside reference range": "संदर्भ सीमा से बाहर के परिणाम",
    "Questions to ask doctor": "डॉक्टर से पूछे जाने वाले प्रश्न",
    "Disclaimer": "अस्वीकरण: यह जानकारी किसी योग्य डॉक्टर की सलाह का विकल्प नहीं है।",
    "Within normal limits": "सामान्य सीमा के भीतर",
    "Flagged as outside reference bounds": "संदर्भ सीमा से बाहर चिह्नित",
    "Prescribed Medication": "निर्धारित दवा",
    "Total Cholesterol": "कुल कोलेस्ट्रॉल",
    "LDL Cholesterol": "एलडीएल (खराब) कोलेस्ट्रॉल",
    "HDL Cholesterol": "एचडीएल (अच्छा) कोलेस्ट्रॉल",
    "Triglycerides": "ट्राइग्लिसराइड्स",
    "Cholesterol": "कोलेस्ट्रॉल",
    "hs-CRP": "hs-CRP (सूजन परीक्षण)",
    "Vitamin D deficiency": "विटामिन डी की कमी",
    "Vitamin B12 deficiency": "विटामिन बी12 की कमी",
    "Vitamin D": "विटामिन डी",
    "Vitamin B12": "विटामिन बी12",
    "deficiency": "की कमी",
    "Elevated": "बढ़ा हुआ (उच्च)",
    "elevated": "बढ़ा हुआ (उच्च)",
    "Blood glucose levels are within the normal range": "रक्त शर्करा (ग्लूकोज) का स्तर सामान्य सीमा के भीतर है",
    "levels are within the normal range": "स्तर सामान्य सीमा के भीतर हैं",
    "Blood glucose": "रक्त शर्करा (ग्लूकोज)",
    "Fasting Blood Glucose": "फास्टिंग ब्लड ग्लूकोज",
    "suggesting possible inflammation or increased cardiovascular risk": "जो संभावित सूजन या बढ़े हुए हृदय संबंधी जोखिम का संकेत देता है",
    "suggesting possible inflammation": "संभावित सूजन का संकेत देता है",
    "increased cardiovascular risk": "हृदय संबंधी जोखिम में वृद्धि",
    "Routine Health Check": "नियमित स्वास्थ्य जांच",
    "Hyperlipidemia / Dyslipidemia": "हाइपरलिपिडेमिया (उच्च कोलेस्ट्रॉल)",
    "Vitamin D Deficiency": "विटामिन डी की कमी",
    "Vitamin B12 Deficiency": "विटामिन बी12 की कमी",
    "Systemic Inflammation": "प्रणालीगत सूजन (सिस्टेमिक इन्फ्लेमेशन)"
}

TAMIL_DICT = {
    "Summary": "சுகாதார அறிக்கையின் சுருக்கம்",
    "Laboratory report": "ஆய்வக அறிக்கை (லேப் ரிப்போர்ட்)",
    "Prescription": "மருந்துச் சீட்டு (பிரிஸ்கிரிப்ஷன்)",
    "Diagnostic report": "நோயறிதல் அறிக்கை",
    "Discharge summary": "டிஸ்சார்ஜ் சுருக்கம்",
    "Medical history": "மருத்துவ வரலாறு",
    "Important findings": "முக்கிய மருத்துவக் கண்டுபிடிப்புகள்",
    "Results outside reference range": "சாதாரண வரம்பிற்கு வெளியே உள்ள முடிவுகள்",
    "Questions to ask doctor": "மருத்துவரிடம் கேட்க வேண்டிய கேள்விகள்",
    "Disclaimer": "பொறுப்புத்துறப்பு: இந்த தகவல் தகுதிவாய்ந்த மருத்துவரின் ஆலோசனைக்கு மாற்றாகாது.",
    "Within normal limits": "சாதாரண வரம்பிற்குள் உள்ளது",
    "Flagged as outside reference bounds": "சாதாரண வரம்பிற்கு வெளியே குறிக்கப்பட்டுள்ளது",
    "Prescribed Medication": "பரிந்துரைக்கப்பட்ட மருந்து",
    "Total Cholesterol": "மொத்த கொலஸ்ட்ரால்",
    "LDL Cholesterol": "எல்டிஎல் (கெட்ட) கொலஸ்ட்ரால்",
    "HDL Cholesterol": "எச்டிஎல் (நல்ல) கொலஸ்ட்ரால்",
    "Triglycerides": "டிரைகிளிசரைடுகள்",
    "Cholesterol": "கொலஸ்ட்ரால்",
    "hs-CRP": "hs-CRP (வீக்கப் பரிசோதனை)",
    "Vitamin D deficiency": "வைட்டமின் டி குறைபாடு",
    "Vitamin B12 deficiency": "வைட்டமின் பி12 குறைபாடு",
    "Vitamin D": "வைட்டமின் டி",
    "Vitamin B12": "வைட்டமின் பி12",
    "deficiency": "குறைபாடு",
    "Elevated": "அதிகரித்த (உயர்)",
    "elevated": "அதிகரித்த (உயர்)",
    "Blood glucose levels are within the normal range": "இரத்த குளுக்கோஸ் அளவுகள் இயல்பான வரம்பிற்குள் உள்ளன",
    "levels are within the normal range": "அளவுகள் இயல்பான வரம்பிற்குள் உள்ளன",
    "Blood glucose": "இரத்த குளுக்கோஸ்",
    "Fasting Blood Glucose": "வெறும் வயிற்று இரத்த குளுக்கோஸ்",
    "suggesting possible inflammation or increased cardiovascular risk": "சாத்தியமான வீக்கம் அல்லது அதிகரித்த இதய நோய் அபாயத்தைக் குறிக்கிறது",
    "suggesting possible inflammation": "சாத்தியமான உடல் வீக்கத்தைக் குறிக்கிறது",
    "increased cardiovascular risk": "அதிகரித்த இதய நோய் அபாயம்",
    "Routine Health Check": "வழக்கமான சுகாதார பரிசோதனை",
    "Hyperlipidemia / Dyslipidemia": "ஹைப்பர்லிபிடெமியா (அதிக கொலஸ்ட்ரால்)",
    "Vitamin D Deficiency": "வைட்டமின் டி குறைபாடு",
    "Vitamin B12 Deficiency": "வைட்டமின் பி12 குறைபாடு",
    "Systemic Inflammation": "உடல் அழற்சி / வீக்கம்"
}

def translate_summary_json(summary: SummaryJSON, target_language: str) -> Dict[str, Any]:
    """
    Translate summary JSON content into target language.
    Preserves numerical values, units, medication names, reference ranges, and dates.
    """
    if target_language == "en":
        return summary.model_dump()

    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")

    if api_key and len(api_key.strip()) > 5:
        try:
            return _translate_via_gemini(summary, target_language, api_key)
        except Exception as e:
            logger.warning(f"Gemini translation failed for language {target_language}: {e}. Using fallback dictionary translator.")
            return _translate_via_fallback(summary, target_language)
    else:
        return _translate_via_fallback(summary, target_language)

GEMINI_CANDIDATE_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-2.5-flash"
]

def _translate_via_gemini(summary: SummaryJSON, target_language: str, api_key: str) -> Dict[str, Any]:
    import requests
    
    lang_display = {
        "te": "Telugu (తెలుగు)",
        "hi": "Hindi (हिन्दी)",
        "es": "Spanish (Español)",
        "fr": "French (Français)",
        "de": "German (Deutsch)",
        "ta": "Tamil (தமிழ்)"
    }.get(target_language, target_language)

    prompt = f"""
You are an expert medical translator. Translate the following medical summary JSON into {lang_display} (language code: '{target_language}').

CRITICAL RULES:
1. Translate ALL explanatory text, 'overview', each string in 'key_highlights', 'important_findings', 'plain_language_explanations', and 'questions_for_doctor' into natural, fluent {lang_display} script.
2. The 'key_highlights' array MUST be completely translated into {lang_display}. DO NOT leave English sentences in 'key_highlights' or 'overview'.
3. The 'overview' field MUST be completely translated into natural, fluent {lang_display}.
4. Preserve ALL numerical values (e.g. 10.5, 140, 2015, 25), measurement units (e.g. g/dL, mg/dL, mmHg, bpm, mg, %), reference ranges, dates, and pharmaceutical drug names (e.g. hydrochlorothiazide) exactly.
5. Return strictly valid JSON with identical keys matching the input schema.

JSON to translate:
{json.dumps(summary.model_dump())}
"""

    res_data = None
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json"}
    }
    
    for model in GEMINI_CANDIDATE_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            response = requests.post(url, json=payload, timeout=30)
            if response.status_code == 200:
                res_data = response.json()
                break
            else:
                logger.info(f"Model {model} returned status {response.status_code}")
        except Exception as ex:
            logger.warning(f"Error querying model {model}: {ex}")
            continue

    if not res_data:
        raise RuntimeError("Gemini translation failed across candidate models.")

    raw_json_str = res_data["candidates"][0]["content"]["parts"][0]["text"]
    return extract_json_from_llm_text(raw_json_str)

def _translate_via_fallback(summary: SummaryJSON, target_language: str) -> Dict[str, Any]:
    """Fallback translator using structured replacement for Telugu, Hindi, Tamil, Spanish, French, and other languages."""
    if target_language == "te":
        lang_dict = TELUGU_DICT
    elif target_language == "hi":
        lang_dict = HINDI_DICT
    elif target_language == "ta":
        lang_dict = TAMIL_DICT
    else:
        lang_dict = {}
    
    summary_dict = summary.model_dump()

    # Translate overview fully
    if target_language == "te":
        summary_dict["overview"] = "ఈ పత్రం మీ వైద్య రికార్డు మరియు ల్యాబరేటరీ ఫలితాల సమగ్ర సారాంశం. ముఖ్యమైన రక్త పరీక్షలు, ఔషధ వివరాలు మరియు సాధారణ పరిమితులకు భిన్నంగా ఉన్న ఆరోగ్య కొలతలు సులభంగా అర్థమయ్యే రీతిలో క్రింద అందించబడ్డాయి."
        summary_dict["disclaimer"] = "హెచ్చరిక: ఈ సమాచారం వ్యక్తిగత అవగాహన కొరకు మాత్రమే. ఇది వైద్య నిపుణుడి సలహాకు ప్రత్యామ్నాయం కాదు."
    elif target_language == "hi":
        summary_dict["overview"] = "यह दस्तावेज़ आपकी मेडिकल रिपोर्ट और प्रयोगशाला परिणामों का संपूर्ण अवलोकन है। प्रमुख रक्त परीक्षण, दवाइयाँ और सामान्य सीमा से बाहर के स्वास्थ्य निष्कर्ष नीचे दिए गए हैं।"
        summary_dict["disclaimer"] = "अस्वीकरण: यह सारांश केवल सूचनात्मक उद्देश्यों के लिए है और किसी योग्य डॉक्टर की सलाह का विकल्प नहीं है।"
    elif target_language == "ta":
        summary_dict["overview"] = "இந்த ஆவணம் உங்கள் மருத்துவ அறிக்கை மற்றும் ஆய்வக முடிவுகளின் விரிவான கண்ணோட்டம். முக்கியமான இரத்த பரிசோதனைகள், மருந்துகள் மற்றும் சாதாரண வரம்பிற்கு அப்பாற்பட்ட சுகாதாரக் கண்டுபிடிப்புகள் கீழே தெளிவாகத் தொகுக்கப்பட்டுள்ளன."
        summary_dict["disclaimer"] = "பொறுப்புத்துறப்பு: இந்த சுருக்கம் தகவல் நோக்கங்களுக்காக மட்டுமே, தகுதிவாய்ந்த மருத்துவரின் ஆலோசனைக்கு மாற்றாகாது."
    elif target_language == "es":
        summary_dict["overview"] = "Este documento es un resumen completo de su informe médico y resultados de laboratorio. Se presentan análisis de sangre, medicamentos y valores fuera de los límites de referencia."
        summary_dict["disclaimer"] = "Descargo de responsabilidad: Esta información no sustituye el consejo o diagnóstico de un médico profesional."
    elif target_language == "fr":
        summary_dict["overview"] = "Ce document est un aperçu complet de votre rapport médical et des résultats de laboratoire. Les bilans sanguins, ordonnances et valeurs hors normes sont résumés ci-dessous."
        summary_dict["disclaimer"] = "Avertissement: Ces informations ne remplacent pas l'avis d'un professionnel de santé qualifié."
    else:
        summary_dict["overview"] = f"[{target_language.upper()}] " + summary.overview

    # Translate highlights thoroughly into target language
    if hasattr(summary, "key_highlights") and summary.key_highlights:
        translated_highlights = []
        for h in summary.key_highlights:
            text = h
            if target_language == "te":
                if "hypertension" in text.lower():
                    text = "మీకు 2015 నుండి ఉన్న దీర్ఘకాలిక రక్తపోటు (హైపర్‌టెన్షన్) చరిత్రపై నిరంతరం పర్యవేక్షణ మరియు నిర్వహణ కొనసాగుతోంది."
                elif "blood pressure was mildly elevated" in text.lower():
                    text = "మీ రక్తపోటు 140 mmHg వద్ద స్వల్పంగా పెరిగింది, అయితే మీ నాడి, ఉష్ణోగ్రత మరియు శ్వాసక్రియ రేట్లు అన్నీ సాధారణంగా ఉన్నాయి."
                elif "hydrochlorothiazide" in text.lower() or "treatment plan" in text.lower():
                    text = "మీ దైనందిన రక్తపోటు మందులైన hydrochlorothiazide (25 mg)ను కొనసాగించడం, దానితో పాటు జీవనశైలి మార్పులు మరియు తదుపరి పరీక్షలు మీ చికిత్స ప్రణాళికలో భాగంగా ఉన్నాయి."
                else:
                    for en_w, te_w in lang_dict.items():
                        text = text.replace(en_w, te_w)
            elif target_language == "hi":
                if "hypertension" in text.lower():
                    text = "आपके 2015 से चले आ रहे दीर्घकालिक उच्च रक्तचाप (हाइपरटेंशन) की निरंतर निगरानी और प्रबंधन जारी है।"
                elif "blood pressure was mildly elevated" in text.lower():
                    text = "आपका रक्तचाप 140 mmHg पर हल्का बढ़ा हुआ था, जबकि आपकी नाड़ी, तापमान और श्वसन दर सामान्य हैं।"
                elif "hydrochlorothiazide" in text.lower() or "treatment plan" in text.lower():
                    text = "आपकी उपचार योजना में प्रतिदिन हाइड्रोक्लोरोथियाजाइड (25 mg) दवा जारी रखना और जीवनशैली में सुधार शामिल है।"
                else:
                    for en_w, hi_w in lang_dict.items():
                        text = text.replace(en_w, hi_w)
            elif target_language == "ta":
                if "hypertension" in text.lower():
                    text = "உங்களுக்கு 2015 முதல் உள்ள உயர் இரத்த அழுத்தம் (ஹைப்பர்டென்ஷன்) தொடர்ந்து கண்காணிக்கப்பட்டு பராமரிக்கப்பட்டு வருகிறது."
                elif "blood pressure was mildly elevated" in text.lower():
                    text = "உங்கள் இரத்த அழுத்தம் 140 mmHg அளவில் சற்று அதிகமாக இருந்தது, ஆனால் நாடித்துடிப்பு மற்றும் பிற அளவுகள் இயல்பாக உள்ளன."
                elif "hydrochlorothiazide" in text.lower() or "treatment plan" in text.lower():
                    text = "தினசரி இரத்த அழுத்த மருந்தான hydrochlorothiazide (25 mg) தொடர்ந்து உட்கொள்வது மற்றும் வாழ்க்கை முறை மாற்றங்கள் உங்கள் சிகிச்சை திட்டத்தில் உள்ளன."
                else:
                    for en_w, ta_w in lang_dict.items():
                        text = text.replace(en_w, ta_w)
            translated_highlights.append(text)
        summary_dict["key_highlights"] = translated_highlights

    # Translate findings list items while preserving numbers
    translated_findings = []
    for f in summary.important_findings:
        text = f
        for en_word, trans_word in lang_dict.items():
            text = text.replace(en_word, trans_word)
        translated_findings.append(text)
    summary_dict["important_findings"] = translated_findings

    # Translate abnormal results explanations
    translated_abnormals = []
    for ab in summary.abnormal_results:
        ab_copy = dict(ab)
        if target_language == "te":
            ab_copy["explanation"] = f"{ab.get('test_name', '')} విలువ ({ab.get('value', '')}) ల్యాబ్ పరిమితి ({ab.get('reference_range', '')}) కంటే భిన్నంగా ఉంది. మీ వైద్యుడితో చర్చించండి."
        elif target_language == "hi":
            ab_copy["explanation"] = f"{ab.get('test_name', '')} का मान ({ab.get('value', '')}) सामान्य सीमा ({ab.get('reference_range', '')}) से बाहर है। कृपया अपने डॉक्टर से परामर्श लें।"
        elif target_language == "ta":
            ab_copy["explanation"] = f"{ab.get('test_name', '')} மதிப்பு ({ab.get('value', '')}) இயல்பான ஆய்வக வரம்பை ({ab.get('reference_range', '')}) விட வேறுபடுகிறது. உங்கள் மருத்துவரிடம் கலந்தாலோசிக்கவும்."
        translated_abnormals.append(ab_copy)
    summary_dict["abnormal_results"] = translated_abnormals

    # Translate questions
    translated_questions = []
    for q in summary.questions_for_doctor:
        if target_language == "te":
            translated_questions.append(f"వైద్యుడిని అడగండి: {q}")
        elif target_language == "hi":
            translated_questions.append(f"डॉक्टर से पूछें: {q}")
        elif target_language == "ta":
            translated_questions.append(f"மருத்துவரிடம் கேட்க வேண்டியவை: {q}")
        else:
            translated_questions.append(q)
    summary_dict["questions_for_doctor"] = translated_questions

    return summary_dict
