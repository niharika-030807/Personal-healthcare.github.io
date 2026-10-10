# Personal Health Copilot - 3-Minute Hackathon Demo Script

## Minute 0:00 - 0:45 | Problem Statement & Hero Presentation
- **Presenter**: "Hello judges! Healthcare records are fragmented across prescriptions, lab reports, and hospital summaries. Patients struggle to spot out-of-range lab numbers, track changes over time, or understand medical jargon. Meet **Personal Health Copilot**: 'Your Health Records. One Clear Picture.'"
- **Action**: Open Landing Page (`http://localhost:5173`). Click "Open My Dashboard".

## Minute 0:45 - 1:30 | Live Dashboard, Lab Trends & Out-of-Range Alerts
- **Presenter**: "Here on the Dashboard, all statistics are powered live by our database. Notice the **Out-of-Range Results** banner flagging Hemoglobin at 10.2 g/dL and Fasting Glucose at 118 mg/dL. Our system compares extracted test values directly against document reference bounds."
- **Action**: Click "View Health Trends" -> Select "Hemoglobin". Point out the Recharts interactive graph showing the progression from September (10.2 g/dL) to October (11.4 g/dL).

## Minute 1:30 - 2:15 | Document Upload & Multi-Stage Processing Pipeline
- **Presenter**: "Let's upload a new report."
- **Action**: Navigate to Upload Records. Upload a lab report or prescription PDF/image.
- **Presenter**: "Watch our multi-stage pipeline: Uploading -> Extracting text -> Classifying document -> Extracting medical data via Google Gemini API -> Validating reference bounds -> Generating plain-language summary."
- **Action**: Click on the uploaded record to reveal the extracted lab measurements, plain-language overview, and questions to ask a doctor.

## Minute 2:15 - 2:45 | Global Searchable Language Selector & Telugu/Hindi Translation
- **Presenter**: "Accessibility is key. Watch our global language selector supporting 80+ living languages."
- **Action**: Click the 🌐 Language Selector dropdown. Search for "Telugu" or "తెలుగు". Switch interface language.
- **Action**: On the report page, click "తెలుగు (Telugu)" AI summary translation button. Show that prose is translated into Telugu while preserving numbers (10.2 g/dL), medication names (Amoxicillin 500mg), and reference ranges intact!

## Minute 2:45 - 3:00 | FHIR R4 Interoperability & Medical Safety Wrap-up
- **Presenter**: "Finally, we support healthcare interoperability. Click 'Export FHIR JSON' to export standard HL7 FHIR R4 Bundle resources ready for EHR integration. We prominently display medical disclaimers to ensure safe, responsible AI usage."
- **Action**: Click "Export FHIR JSON". Show the downloaded FHIR JSON bundle.
