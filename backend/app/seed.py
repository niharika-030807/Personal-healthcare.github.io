import datetime
from sqlalchemy.orm import Session
from app.models import User, Patient, MedicalRecord, LabResult, Medication, HealthSummary, DocumentEvent
from app.services.auth_service import hash_password

def seed_demo_data(db: Session) -> Patient:
    """
    Seeds realistic synthetic medical records for hackathon demo mode under demo user account.
    """
    # Check existing demo user
    user = db.query(User).filter(User.email == "eleanor@healthcopilot.org").first()
    if not user:
        user = User(
            id="demo_user_001",
            email="eleanor@healthcopilot.org",
            password_hash=hash_password("demo1234"),
            full_name="Eleanor Vance",
            preferred_language="en",
            date_of_birth="1988-04-12"
        )
        db.add(user)
        db.commit()

    patient = db.query(Patient).filter(Patient.user_id == user.id, Patient.relationship_type == "Self").first()
    if not patient:
        patient = Patient(
            id="demo_patient_001",
            user_id=user.id,
            display_name="Eleanor Vance",
            relationship_type="Self",
            date_of_birth="1988-04-12",
            preferred_language="en"
        )
        db.add(patient)
        db.commit()

    # Check if demo records already exist and ensure diagnoses are populated
    demo_records = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient.id).all()
    if demo_records:
        demo_diag_map = {
            "demo_rec_001": ["Mild Iron-Deficiency Anemia", "Impaired Fasting Glucose (Borderline)", "Hyperlipidemia"],
            "demo_rec_002": ["Improving Anemia (Hemoglobin Response)", "Impaired Fasting Glucose (Monitoring)"],
            "demo_rec_003": ["Acute Respiratory Tract Infection", "Nutritional Iron Deficiency"],
            "demo_rec_004": ["Normal Chest Radiograph", "Clear Lung Fields"],
            "demo_rec_005": ["Acute Bronchitis (Resolved)", "Post-Infectious Recovery"],
            "demo_rec_006": ["Mild Anemia (Hemoglobin 11.2 g/dL, Hematocrit 34.5%)", "Elevated Fasting Blood Glucose (104 mg/dL)", "Hypercholesterolemia (Total Cholesterol 210 mg/dL, LDL 134 mg/dL)"]
        }
        for rec in demo_records:
            if not rec.diagnoses and rec.id in demo_diag_map:
                rec.diagnoses = demo_diag_map[rec.id]
        
        has_rec6 = any(r.id == "demo_rec_006" for r in demo_records)
        if not has_rec6:
            _seed_niharika_lab_report(db, patient)
            
        db.commit()
        return patient

    # 1. First Lab Report (September 2026)
    rec1 = MedicalRecord(
        id="demo_rec_001",
        patient_id=patient.id,
        record_type="Laboratory report",
        original_filename="Complete_Blood_Count_Sept2026.pdf",
        storage_reference="./uploads/demo_cbc_sept.pdf",
        document_date="2026-09-05",
        extracted_patient_name="Eleanor Vance",
        patient_mismatch_warning=0,
        patient_confirmation_status="Confirmed",
        processing_status="Completed",
        extraction_status="Completed",
        verification_status="Extracted",
        diagnoses=["Mild Iron-Deficiency Anemia", "Impaired Fasting Glucose (Borderline)", "Hyperlipidemia"],
        is_demo=1
    )
    db.add(rec1)
    db.commit()

    lab1_1 = LabResult(
        medical_record_id=rec1.id,
        test_name="Hemoglobin",
        value="10.2",
        unit="g/dL",
        reference_min=12.0,
        reference_max=16.0,
        reference_text="12.0 - 16.0 g/dL",
        result_status="Abnormal",
        verification_status="Needs Review"
    )
    lab1_2 = LabResult(
        medical_record_id=rec1.id,
        test_name="Fasting Blood Sugar",
        value="118.0",
        unit="mg/dL",
        reference_min=70.0,
        reference_max=99.0,
        reference_text="70.0 - 99.0 mg/dL",
        result_status="Abnormal",
        verification_status="Needs Review"
    )
    lab1_3 = LabResult(
        medical_record_id=rec1.id,
        test_name="Total Cholesterol",
        value="215.0",
        unit="mg/dL",
        reference_min=120.0,
        reference_max=200.0,
        reference_text="120.0 - 200.0 mg/dL",
        result_status="Abnormal",
        verification_status="Needs Review"
    )
    db.add_all([lab1_1, lab1_2, lab1_3])

    sum1 = HealthSummary(
        medical_record_id=rec1.id,
        language="en",
        summary_json={
            "overview": "Laboratory Blood Analysis report dated September 5, 2026. Identifies mild anemia and elevated blood glucose.",
            "important_findings": [
                "Hemoglobin is 10.2 g/dL (Below recommended reference range of 12.0 - 16.0 g/dL).",
                "Fasting Blood Sugar is 118.0 mg/dL (Slightly elevated above normal 70.0 - 99.0 mg/dL range).",
                "Total Cholesterol is 215.0 mg/dL (Borderline high)."
            ],
            "abnormal_results": [
                {
                    "test_name": "Hemoglobin",
                    "value": "10.2 g/dL",
                    "reference_range": "12.0 - 16.0 g/dL",
                    "explanation": "Hemoglobin measures oxygen-carrying red blood cells. A value of 10.2 g/dL indicates mild iron-deficiency anemia."
                },
                {
                    "test_name": "Fasting Blood Sugar",
                    "value": "118.0 mg/dL",
                    "reference_range": "70.0 - 99.0 mg/dL",
                    "explanation": "Fasting glucose level is slightly above normal range, suggesting mild impairment in glucose clearance."
                }
            ],
            "plain_language_explanations": [
                "Your red blood cell count (Hemoglobin) is slightly lower than usual.",
                "Your morning blood sugar is slightly higher than standard target ranges."
            ],
            "uncertainties": ["Ensure test was conducted after an 8-hour overnight fast."],
            "questions_for_doctor": [
                "Should I start iron dietary supplements for my 10.2 g/dL Hemoglobin?",
                "What dietary modifications do you recommend for my Fasting Glucose of 118 mg/dL?"
            ],
            "disclaimer": "Personal Health Copilot helps organize medical records and explain health information. It does not diagnose diseases, replace professional medical advice, or prescribe treatment."
        },
        model_identifier="gemini-2.0-flash"
    )
    db.add(sum1)

    event1 = DocumentEvent(
        patient_id=patient.id,
        medical_record_id=rec1.id,
        event_date="2026-09-05",
        event_type="Laboratory report",
        description="Comprehensive Blood Panel - Mild Anemia & Glucose Elevation"
    )
    db.add(event1)

    # 2. Second Lab Report (October 2026 - Follow-up showing improvement)
    rec2 = MedicalRecord(
        id="demo_rec_002",
        patient_id=patient.id,
        record_type="Laboratory report",
        original_filename="Followup_Blood_Panel_Oct2026.pdf",
        storage_reference="./uploads/demo_cbc_oct.pdf",
        document_date="2026-10-02",
        extracted_patient_name="Eleanor Vance",
        patient_mismatch_warning=0,
        patient_confirmation_status="Confirmed",
        processing_status="Completed",
        extraction_status="Completed",
        verification_status="Extracted",
        diagnoses=["Improving Anemia (Hemoglobin Response)", "Impaired Fasting Glucose (Monitoring)"],
        is_demo=1
    )
    db.add(rec2)
    db.commit()

    lab2_1 = LabResult(
        medical_record_id=rec2.id,
        test_name="Hemoglobin",
        value="11.4",
        unit="g/dL",
        reference_min=12.0,
        reference_max=16.0,
        reference_text="12.0 - 16.0 g/dL",
        result_status="Abnormal",
        verification_status="Extracted"
    )
    lab2_2 = LabResult(
        medical_record_id=rec2.id,
        test_name="Fasting Blood Sugar",
        value="104.0",
        unit="mg/dL",
        reference_min=70.0,
        reference_max=99.0,
        reference_text="70.0 - 99.0 mg/dL",
        result_status="Abnormal",
        verification_status="Extracted"
    )
    lab2_3 = LabResult(
        medical_record_id=rec2.id,
        test_name="Total Cholesterol",
        value="195.0",
        unit="mg/dL",
        reference_min=120.0,
        reference_max=200.0,
        reference_text="120.0 - 200.0 mg/dL",
        result_status="Normal",
        verification_status="Extracted"
    )
    db.add_all([lab2_1, lab2_2, lab2_3])

    sum2 = HealthSummary(
        medical_record_id=rec2.id,
        language="en",
        summary_json={
            "overview": "Follow-up laboratory report dated October 2, 2026. Shows positive trend in Hemoglobin (11.4 g/dL) and Total Cholesterol (195 mg/dL).",
            "important_findings": [
                "Hemoglobin improved from 10.2 to 11.4 g/dL.",
                "Fasting Blood Sugar improved to 104.0 mg/dL.",
                "Total Cholesterol returned to normal range at 195.0 mg/dL."
            ],
            "abnormal_results": [
                {
                    "test_name": "Hemoglobin",
                    "value": "11.4 g/dL",
                    "reference_range": "12.0 - 16.0 g/dL",
                    "explanation": "Hemoglobin has improved by +1.2 g/dL compared to September, approaching standard range."
                }
            ],
            "plain_language_explanations": ["Your lab values show encouraging progress across all tracked metrics."],
            "uncertainties": [],
            "questions_for_doctor": ["Should I continue my current dietary routine for another month?"],
            "disclaimer": "Personal Health Copilot helps organize medical records and explain health information."
        },
        model_identifier="gemini-2.0-flash"
    )
    db.add(sum2)

    event2 = DocumentEvent(
        patient_id=patient.id,
        medical_record_id=rec2.id,
        event_date="2026-10-02",
        event_type="Laboratory report",
        description="Follow-up Blood Panel - Hemoglobin improved to 11.4 g/dL"
    )
    db.add(event2)

    # 3. Prescription
    rec3 = MedicalRecord(
        id="demo_rec_003",
        patient_id=patient.id,
        record_type="Prescription",
        original_filename="Amoxicillin_Prescription.pdf",
        storage_reference="./uploads/demo_rx.pdf",
        document_date="2026-09-12",
        extracted_patient_name="Eleanor Vance",
        patient_mismatch_warning=0,
        patient_confirmation_status="Confirmed",
        processing_status="Completed",
        extraction_status="Completed",
        verification_status="User Verified",
        diagnoses=["Acute Respiratory Tract Infection", "Nutritional Iron Deficiency"],
        is_demo=1
    )
    db.add(rec3)
    db.commit()

    med3_1 = Medication(
        medical_record_id=rec3.id,
        medicine_name="Amoxicillin",
        strength="500mg",
        dosage_instructions="Take 1 capsule by mouth every 8 hours with water",
        frequency="Three times daily",
        duration="7 days",
        route="Oral",
        verification_status="User Verified"
    )
    med3_2 = Medication(
        medical_record_id=rec3.id,
        medicine_name="Ferrous Sulfate",
        strength="325mg",
        dosage_instructions="Take 1 tablet daily with food or orange juice",
        frequency="Once daily",
        duration="30 days",
        route="Oral",
        verification_status="User Verified"
    )
    db.add_all([med3_1, med3_2])

    event3 = DocumentEvent(
        patient_id=patient.id,
        medical_record_id=rec3.id,
        event_date="2026-09-12",
        event_type="Prescription",
        description="Prescription for Amoxicillin 500mg & Ferrous Sulfate 325mg"
    )
    db.add(event3)

    # 4. Diagnostic Report
    rec4 = MedicalRecord(
        id="demo_rec_004",
        patient_id=patient.id,
        record_type="Diagnostic report",
        original_filename="Chest_XRay_Report.pdf",
        storage_reference="./uploads/demo_xray.pdf",
        document_date="2026-09-15",
        extracted_patient_name="Eleanor Vance",
        patient_mismatch_warning=0,
        patient_confirmation_status="Confirmed",
        processing_status="Completed",
        extraction_status="Completed",
        verification_status="Extracted",
        diagnoses=["Normal Chest Radiograph", "Clear Lung Fields"],
        is_demo=1
    )
    db.add(rec4)
    db.commit()

    sum4 = HealthSummary(
        medical_record_id=rec4.id,
        language="en",
        summary_json={
            "overview": "Chest X-Ray Diagnostic Radiology Report dated September 15, 2026.",
            "important_findings": [
                "Lungs are clear bilaterally with no active focal consolidation or pleural effusion.",
                "Cardiac silhouette size is within normal limits.",
                "No bone fractures or acute abnormalities detected."
            ],
            "abnormal_results": [],
            "plain_language_explanations": ["The chest scan looks normal with clear lung fields and healthy heart size."],
            "uncertainties": [],
            "questions_for_doctor": ["Are any routine follow-up scans required?"],
            "disclaimer": "Personal Health Copilot helps organize medical records and explain health information."
        },
        model_identifier="gemini-2.0-flash"
    )
    db.add(sum4)

    event4 = DocumentEvent(
        patient_id=patient.id,
        medical_record_id=rec4.id,
        event_date="2026-09-15",
        event_type="Diagnostic report",
        description="Chest X-Ray Radiology Report - Clear Lungs"
    )
    db.add(event4)

    # 5. Discharge Summary
    rec5 = MedicalRecord(
        id="demo_rec_005",
        patient_id=patient.id,
        record_type="Discharge summary",
        original_filename="Hospital_Discharge_Summary.pdf",
        storage_reference="./uploads/demo_discharge.pdf",
        document_date="2026-08-20",
        extracted_patient_name="Eleanor Vance",
        patient_mismatch_warning=0,
        patient_confirmation_status="Confirmed",
        processing_status="Completed",
        extraction_status="Completed",
        verification_status="Extracted",
        diagnoses=["Acute Bronchitis (Resolved)", "Post-Infectious Recovery"],
        is_demo=1
    )
    db.add(rec5)
    db.commit()

    sum5 = HealthSummary(
        medical_record_id=rec5.id,
        language="en",
        summary_json={
            "overview": "Hospital Discharge Summary from City Healthcare Center (Admission: Aug 18, 2026, Discharge: Aug 20, 2026).",
            "important_findings": [
                "Admitted for acute bronchitis management.",
                "Treated with IV fluids, bronchodilators, and supportive care.",
                "Discharged in stable condition with clear discharge medication instructions."
            ],
            "abnormal_results": [],
            "plain_language_explanations": ["Patient successfully recovered from bronchitis and was safely discharged."],
            "uncertainties": [],
            "questions_for_doctor": ["When should I schedule my 2-week post-discharge follow-up visit?"],
            "disclaimer": "Personal Health Copilot helps organize medical records and explain health information."
        },
        model_identifier="gemini-2.0-flash"
    )
    db.add(sum5)

    event5 = DocumentEvent(
        patient_id=patient.id,
        medical_record_id=rec5.id,
        event_date="2026-08-20",
        event_type="Discharge summary",
        description="City Healthcare Hospital Discharge - Acute Bronchitis Recovery"
    )
    db.add(event5)

    _seed_niharika_lab_report(db, patient)

    db.commit()
    return patient

def _seed_niharika_lab_report(db: Session, patient: Patient):
    existing = db.query(MedicalRecord).filter(MedicalRecord.id == "demo_rec_006").first()
    if existing:
        return existing

    rec6 = MedicalRecord(
        id="demo_rec_006",
        patient_id=patient.id,
        record_type="Laboratory report",
        original_filename="HealthCare_Diagnostics_Complete_Health_Checkup.png",
        storage_reference="./uploads/8f42913d-114c-4d23-bf79-20cbff1c5861_a7e5c196-f18f-42b9-aa98-0eb73ae4d9ae.png",
        document_date="2026-10-08",
        extracted_patient_name="Niharika",
        patient_mismatch_warning=0,
        patient_confirmation_status="Confirmed",
        processing_status="Completed",
        extraction_status="Completed",
        verification_status="Extracted",
        diagnoses=["Mild Anemia (Hemoglobin 11.2 g/dL, Hematocrit 34.5%)", "Elevated Fasting Blood Glucose (104 mg/dL)", "Hypercholesterolemia (Total Cholesterol 210 mg/dL, LDL 134 mg/dL)"],
        is_demo=1
    )
    db.add(rec6)
    db.commit()

    niharika_labs = [
        # CBC
        LabResult(
            medical_record_id=rec6.id,
            test_name="Hemoglobin (Hb)",
            value="11.2",
            unit="g/dL",
            reference_min=12.0,
            reference_max=15.0,
            reference_text="12.0 - 15.0 g/dL",
            result_status="Abnormal",
            verification_status="Extracted"
        ),
        LabResult(
            medical_record_id=rec6.id,
            test_name="Total Leukocyte Count (TLC)",
            value="6.8",
            unit="x 10^3/uL",
            reference_min=4.0,
            reference_max=11.0,
            reference_text="4.0 - 11.0 x 10^3/uL",
            result_status="Normal",
            verification_status="Extracted"
        ),
        LabResult(
            medical_record_id=rec6.id,
            test_name="Red Blood Cell Count (RBC)",
            value="4.02",
            unit="x 10^6/uL",
            reference_min=3.8,
            reference_max=5.1,
            reference_text="3.8 - 5.1 x 10^6/uL",
            result_status="Normal",
            verification_status="Extracted"
        ),
        LabResult(
            medical_record_id=rec6.id,
            test_name="Hematocrit (HCT)",
            value="34.5",
            unit="%",
            reference_min=36.0,
            reference_max=46.0,
            reference_text="36.0 - 46.0 %",
            result_status="Abnormal",
            verification_status="Extracted"
        ),
        LabResult(
            medical_record_id=rec6.id,
            test_name="Mean Corpuscular Volume (MCV)",
            value="85.8",
            unit="fL",
            reference_min=80.0,
            reference_max=100.0,
            reference_text="80 - 100 fL",
            result_status="Normal",
            verification_status="Extracted"
        ),
        LabResult(
            medical_record_id=rec6.id,
            test_name="Platelet Count",
            value="248",
            unit="x 10^3/uL",
            reference_min=150.0,
            reference_max=450.0,
            reference_text="150 - 450 x 10^3/uL",
            result_status="Normal",
            verification_status="Extracted"
        ),
        # Blood Sugar
        LabResult(
            medical_record_id=rec6.id,
            test_name="Fasting Blood Glucose (FBS)",
            value="104",
            unit="mg/dL",
            reference_min=70.0,
            reference_max=99.0,
            reference_text="70 - 99 mg/dL",
            result_status="Abnormal",
            verification_status="Extracted"
        ),
        # Lipid Profile
        LabResult(
            medical_record_id=rec6.id,
            test_name="Total Cholesterol",
            value="210",
            unit="mg/dL",
            reference_min=125.0,
            reference_max=200.0,
            reference_text="< 200 mg/dL",
            result_status="Abnormal",
            verification_status="Extracted"
        ),
        LabResult(
            medical_record_id=rec6.id,
            test_name="Triglycerides",
            value="138",
            unit="mg/dL",
            reference_min=50.0,
            reference_max=150.0,
            reference_text="< 150 mg/dL",
            result_status="Normal",
            verification_status="Extracted"
        ),
        LabResult(
            medical_record_id=rec6.id,
            test_name="HDL Cholesterol",
            value="48",
            unit="mg/dL",
            reference_min=40.0,
            reference_max=100.0,
            reference_text="> 40 mg/dL",
            result_status="Normal",
            verification_status="Extracted"
        ),
        LabResult(
            medical_record_id=rec6.id,
            test_name="LDL Cholesterol",
            value="134",
            unit="mg/dL",
            reference_min=50.0,
            reference_max=100.0,
            reference_text="< 100 mg/dL",
            result_status="Abnormal",
            verification_status="Extracted"
        ),
        LabResult(
            medical_record_id=rec6.id,
            test_name="VLDL Cholesterol",
            value="28",
            unit="mg/dL",
            reference_min=5.0,
            reference_max=40.0,
            reference_text="5 - 40 mg/dL",
            result_status="Normal",
            verification_status="Extracted"
        ),
        # Kidney Function Test
        LabResult(
            medical_record_id=rec6.id,
            test_name="Serum Creatinine",
            value="0.71",
            unit="mg/dL",
            reference_min=0.6,
            reference_max=1.2,
            reference_text="0.6 - 1.2 mg/dL",
            result_status="Normal",
            verification_status="Extracted"
        ),
        LabResult(
            medical_record_id=rec6.id,
            test_name="Blood Urea Nitrogen (BUN)",
            value="14",
            unit="mg/dL",
            reference_min=7.0,
            reference_max=20.0,
            reference_text="7 - 20 mg/dL",
            result_status="Normal",
            verification_status="Extracted"
        ),
        # Thyroid Function Test
        LabResult(
            medical_record_id=rec6.id,
            test_name="TSH (Thyroid Stimulating Hormone)",
            value="2.1",
            unit="uIU/mL",
            reference_min=0.4,
            reference_max=4.0,
            reference_text="0.4 - 4.0 uIU/mL",
            result_status="Normal",
            verification_status="Extracted"
        )
    ]
    db.add_all(niharika_labs)

    sum6 = HealthSummary(
        medical_record_id=rec6.id,
        language="en",
        summary_json={
            "overview": "Laboratory Report from HealthCare Diagnostics (Date: October 8, 2026, Dr. S. Priya, Pathologist) for Niharika. The comprehensive panel evaluated Complete Blood Count, Blood Glucose, Lipid Profile, Kidney Function, and Thyroid Function. Key takeaways: mild anemia and slightly elevated glucose and LDL cholesterol, with normal kidney and thyroid functions.",
            "important_findings": [
                "Hemoglobin (11.2 g/dL) and Hematocrit (34.5%) are slightly below reference limits, indicating mild anemia.",
                "Fasting Blood Glucose (FBS) is mildly elevated at 104 mg/dL (Normal: 70 - 99 mg/dL).",
                "Total Cholesterol (210 mg/dL) and LDL Cholesterol (134 mg/dL) are elevated above standard limits.",
                "Kidney Function (Serum Creatinine 0.71 mg/dL, BUN 14 mg/dL) is healthy and normal.",
                "Thyroid Function (TSH 2.1 uIU/mL) is within the optimal reference range."
            ],
            "abnormal_results": [
                {
                    "test_name": "Hemoglobin (Hb) & Hematocrit (HCT)",
                    "value": "11.2 g/dL / 34.5%",
                    "reference_range": "12.0 - 15.0 g/dL / 36.0 - 46.0 %",
                    "explanation": "Hemoglobin and hematocrit measure your red blood cells' oxygen-carrying capacity. Mildly low levels suggest mild anemia, which can cause subtle tiredness or fatigue."
                },
                {
                    "test_name": "Fasting Blood Glucose (FBS)",
                    "value": "104 mg/dL",
                    "reference_range": "70 - 99 mg/dL",
                    "explanation": "Fasting glucose measures your body's resting sugar regulation. Being slightly above 99 mg/dL indicates impaired fasting glucose; dietary and lifestyle adjustments help restore it to normal."
                },
                {
                    "test_name": "Total Cholesterol & LDL Cholesterol",
                    "value": "210 mg/dL / 134 mg/dL",
                    "reference_range": "< 200 mg/dL / < 100 mg/dL",
                    "explanation": "LDL is the 'bad' cholesterol that can accumulate in blood vessels. Elevated LDL suggests eating more soluble fiber, reducing saturated fats, and regular physical activity."
                }
            ],
            "plain_language_explanations": [
                "Your red blood cell count is slightly lower than normal, which doctor comments note as mild anemia.",
                "Your fasting blood sugar is slightly higher than 99 mg/dL.",
                "Your bad cholesterol (LDL) is above 100 mg/dL, recommended for lifestyle follow-up."
            ],
            "uncertainties": [],
            "questions_for_doctor": [
                "Do you recommend dietary iron supplements or dietary changes for my 11.2 g/dL Hemoglobin?",
                "What nutritional guidelines should I follow to lower my LDL cholesterol (134 mg/dL) and Fasting Glucose (104 mg/dL)?",
                "When should I repeat this complete health checkup to check progress?"
            ],
            "disclaimer": "Personal Health Copilot helps organize medical records and explain health information. It does not diagnose diseases, replace professional medical advice, or prescribe treatment. AI-generated explanations and extracted information may contain errors. Verify important findings with a qualified healthcare professional."
        },
        model_identifier="gemini-3.1-flash-lite"
    )
    db.add(sum6)

    event6 = DocumentEvent(
        patient_id=patient.id,
        medical_record_id=rec6.id,
        event_date="2026-10-08",
        event_type="Laboratory report",
        description="HealthCare Diagnostics Complete Health Checkup - 15 Clinical Parameters (CBC, Glucose, Lipids, KFT, TFT)"
    )
    db.add(event6)
    db.commit()
    return rec6
