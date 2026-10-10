# Personal Health Copilot 🏥

> **"Your Health Records. One Clear Picture."**

Personal Health Copilot is a complete, production-minded AI-powered healthcare application designed to help patients organize, extract, understand, track, translate, and export their medical records (prescriptions, laboratory reports, diagnostic reports, discharge summaries).

---

## 🚀 Key Features

1. **Smart Medical Document Upload & Processing**:
   - Supports PDF, JPG, JPEG, and PNG files.
   - Text extraction via PyMuPDF and layout-aware OCR.
   - Automatic classification into *Prescription*, *Laboratory report*, *Diagnostic report*, *Discharge summary*, or *Medical history*.

2. **AI Entity Extraction & Reference Range Validation**:
   - Google Gemini API structured model extraction (`google-genai` / HTTP integration).
   - Validates lab values against reference min/max bounds and flags abnormal results.
   - Allows users to review, correct, and verify extracted data.

3. **Plain-Language AI Health Summaries**:
   - Plain-language document overview and important findings.
   - Out-of-range lab explanations and tailored questions to ask a doctor.
   - Prominent medical safety disclaimers.

4. **Interactive Laboratory Trends (Recharts)**:
   - Historical comparison of lab parameters (e.g. Hemoglobin, Fasting Glucose) across dates.
   - Reference range bounds overlay.

5. **Chronological Medical Timeline & Unified Health Profile**:
   - Complete event stream filtered by type and date.
   - Patient profile distinguishing auto-extracted vs user-confirmed data.

6. **Searchable Global Language Selector (80+ Languages)**:
   - Comprehensive ISO 639 / BCP 47 language dataset.
   - Interface localization using `i18next` for English, Telugu (`te`), and Hindi (`hi`).
   - AI Medical summary translation preserving numbers, units, drug names, and dates.

7. **FHIR R4 Interoperability**:
   - Export standard HL7 FHIR R4 Bundle JSON containing `Patient`, `Observation`, `MedicationRequest`, and `DocumentReference` resources.

8. **Hackathon Demo Mode**:
   - Preloaded synthetic records (2 lab reports, 1 prescription, 1 diagnostic report, 1 discharge summary).
   - Full offline/fallback functionality when external AI API credentials are missing.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS v4, React Router v6, Lucide React, Recharts, Axios, i18next / react-i18next.
- **Backend**: Python 3.11, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2.0, PyMuPDF (`fitz`), Pillow.
- **AI Engine**: Google Gemini API (Model: `gemini-2.5-flash`).
- **Database**: SQLite (Local Dev / Demo) / PostgreSQL (Production).

---

## 💻 Local Quickstart

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
python -m pip install -r requirements.txt

# (Optional) Set your Gemini API key in environment
# export GEMINI_API_KEY="your-gemini-api-key"

# Run FastAPI backend server (starts on http://localhost:8000)
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server (starts on http://localhost:5173)
npm run dev
```

---

## 🧪 Running Backend Unit Tests

```bash
# Run the automated backend test suite
python backend/tests/run_tests.py
```
*Result: 7/7 tests pass cleanly.*

---

## 🌐 Deployment Guidelines

### Frontend Deployment (Vercel)
1. Push project repository to GitHub.
2. Connect repository on Vercel.
3. Set **Root Directory** to `frontend`.
4. Add Environment Variable:
   ```env
   VITE_API_BASE_URL=https://your-backend-render-app.onrender.com
   ```
5. Deploy.

### Backend Deployment (Render)
1. Create a **Web Service** on Render pointing to your repository.
2. Set **Root Directory** to `backend`.
3. Set **Build Command**: `pip install -r requirements.txt`
4. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   CORS_ORIGINS=https://your-frontend-vercel-app.vercel.app
   ```
6. Deploy.

---

## ⚖️ Medical Safety & Privacy Disclaimer
*Personal Health Copilot helps organize medical records and explain health information. It does not diagnose diseases, replace professional medical advice, or prescribe treatment. AI-generated explanations and extracted information may contain errors. Verify important findings with a qualified healthcare professional.*
