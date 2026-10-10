import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  FileText, AlertTriangle, CheckCircle2, Globe, ShieldCheck, 
  Edit3, Save, ArrowLeft, User, UserCheck, AlertOctagon, Sparkles, RefreshCw,
  Activity, Stethoscope 
} from 'lucide-react';
import { fetchRecordDetail, translateSummary, exportRecordFhir, updateRecord, confirmPatientMismatchApi, reprocessRecordApi } from '../services/api';
import type { MedicalRecord } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const RecordDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, activePatient, patients, createPatient, refreshPatients } = useAuth();
  const { t, i18n } = useTranslation();

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'labs' | 'meds' | 'edit'>('summary');
  const [selectedLanguage, setSelectedLanguage] = useState<string>(i18n.language || 'en');
  const [translatedSummary, setTranslatedSummary] = useState<any | null>(null);
  const [translating, setTranslating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmingMismatch, setConfirmingMismatch] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  // Editable states
  const [editDocDate, setEditDocDate] = useState('');
  const [editLabs, setEditLabs] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchRecordDetail(id)
        .then((data) => {
          setRecord(data);
          setEditDocDate(data.document_date || '');
          setEditLabs(data.lab_results || []);
          setLoading(false);
          // If user current language is not English, immediately translate document overview
          if (i18n.language && i18n.language !== 'en') {
            handleTranslateForRecord(data.id, i18n.language);
          }
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [id]);

  // Sync translation whenever global language changes
  useEffect(() => {
    if (record) {
      handleTranslate(i18n.language || 'en');
    }
  }, [i18n.language]);

  const handleTranslateForRecord = async (recordId: string, langCode: string) => {
    setSelectedLanguage(langCode);
    if (langCode === 'en') {
      setTranslatedSummary(null);
      return;
    }
    setTranslating(true);
    try {
      const res = await translateSummary(recordId, langCode);
      if (res && res.translated_summary) {
        setTranslatedSummary(res.translated_summary);
      }
    } catch (err) {
      console.error('Failed to translate summary:', err);
    } finally {
      setTranslating(false);
    }
  };

  const handleTranslate = async (langCode: string) => {
    if (!record) return;
    await handleTranslateForRecord(record.id, langCode);
  };

  const handleExportFhir = async () => {
    if (!record) return;
    try {
      const fhirData = await exportRecordFhir(record.id);
      const jsonStr = JSON.stringify(fhirData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FHIR_${record.original_filename.replace('.pdf', '')}.json`;
      a.click();
    } catch (err) {
      console.error('FHIR export failed', err);
    }
  };

  const handleSaveCorrections = async () => {
    if (!record) return;
    try {
      const updated = await updateRecord(record.id, {
        document_date: editDocDate,
        verification_status: 'User Verified',
        lab_results: editLabs
      });
      setRecord(updated);
      alert('Data corrections saved and verified cleanly.');
      setActiveTab('summary');
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmCurrentPatient = async () => {
    if (!record) return;
    setConfirmingMismatch(true);
    try {
      const updated = await confirmPatientMismatchApi(record.id, record.patient_id);
      setRecord(updated);
      alert(`Record patient confirmed for profile: ${activePatient?.display_name || 'Selected Patient'}`);
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmingMismatch(false);
    }
  };

  const handleAssignExtractedPatient = async () => {
    if (!record || !record.extracted_patient_name) return;
    setConfirmingMismatch(true);
    try {
      // Check if patient profile already exists for extracted name
      let matchingPt = patients.find(p => p.display_name.toLowerCase() === record.extracted_patient_name?.toLowerCase());
      if (!matchingPt) {
        matchingPt = await createPatient(record.extracted_patient_name, 'Family Member');
      }
      const updated = await confirmPatientMismatchApi(record.id, matchingPt.id);
      setRecord(updated);
      await refreshPatients();
      alert(`Record reassigned cleanly to ${matchingPt.display_name}.`);
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmingMismatch(false);
    }
  };

  const handleReprocessRecord = async () => {
    if (!record) return;
    setReprocessing(true);
    try {
      const updated = await reprocessRecordApi(record.id);
      setRecord(updated);
      setSelectedLanguage('en');
      setTranslatedSummary(null);
      setEditDocDate(updated.document_date || '');
      setEditLabs(updated.lab_results || []);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reprocess medical record.');
    } finally {
      setReprocessing(false);
    }
  };

  if (loading || !record) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading document report details...
      </div>
    );
  }

  const defaultSummary = record.summaries[0]?.summary_json || {
    overview: `Summary of ${record.record_type}.`,
    important_findings: [],
    abnormal_results: [],
    plain_language_explanations: [],
    uncertainties: [],
    questions_for_doctor: [],
    disclaimer: 'Personal Health Copilot helps organize medical records and explain health information.'
  };

  const activeSummary = translatedSummary || defaultSummary;

  // Patient Name from Document
  const documentPatientName = record.extracted_patient_name || 'Patient name not identified.';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/records')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Medical History
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReprocessRecord}
            disabled={reprocessing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            title="Re-analyze document with AI multimodal vision and summarization"
          >
            <RefreshCw className={`w-4 h-4 ${reprocessing ? 'animate-spin' : ''}`} />
            {reprocessing ? 'Analyzing Record...' : 'Re-analyze with AI'}
          </button>
          <button
            onClick={handleExportFhir}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Export FHIR JSON
          </button>
        </div>
      </div>

      {/* PATIENT MISMATCH WARNING BANNER */}
      {record.patient_mismatch_warning === 1 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-7 h-7" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-lg font-bold text-amber-950">
                Patient Identity Confirmation Warning
              </h3>
              <p className="text-xs sm:text-sm text-amber-900">
                The name extracted from this document (<strong className="underline">{documentPatientName}</strong>) does not match the active patient profile. Please confirm who this record belongs to before locking it into patient history.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/80 p-4 rounded-2xl border border-amber-200 text-xs">
            <div>
              <span className="text-slate-400 block font-semibold uppercase text-[10px]">Logged-In Account User</span>
              <span className="font-bold text-slate-800">{user?.full_name || 'Account Holder'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold uppercase text-[10px]">Selected Patient Profile</span>
              <span className="font-bold text-teal-700">{activePatient?.display_name || 'Current Profile'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold uppercase text-[10px]">Name Extracted from Document</span>
              <span className="font-bold text-rose-700">{documentPatientName}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handleConfirmCurrentPatient}
              disabled={confirmingMismatch}
              className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" /> Keep Associated with {activePatient?.display_name || 'Selected Patient'}
            </button>
            {record.extracted_patient_name && (
              <button
                onClick={handleAssignExtractedPatient}
                disabled={confirmingMismatch}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
              >
                <User className="w-4 h-4 text-teal-400" /> Assign & Create Profile for "{record.extracted_patient_name}"
              </button>
            )}
          </div>
        </div>
      )}

      {/* HEADER CARD & DOCUMENT METADATA */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-slate-900">{record.original_filename}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                  {record.record_type}
                </span>
                {record.verification_status === 'Needs Review' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Needs Review
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Uploaded: {new Date(record.upload_date).toLocaleDateString()} • Processing Status: <strong className="text-slate-800">{record.processing_status}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* EXPLICIT METADATA BREAKDOWN PER REQUIREMENT #7 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">Document Type</span>
            <span className="font-bold text-slate-800">{record.record_type}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">Document Date</span>
            <span className="font-bold text-slate-800">{record.document_date || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">Document Patient Name</span>
            <span className={`font-bold ${record.extracted_patient_name ? 'text-teal-700' : 'text-slate-500 font-normal italic'}`}>
              {documentPatientName}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">Associated Patient Profile</span>
            <span className="font-bold text-slate-800">{activePatient?.display_name || 'Assigned Patient'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'summary'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          {t('recordDetail.tabSummary', 'AI Health Summary')}
        </button>
        <button
          onClick={() => setActiveTab('labs')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'labs'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          {t('recordDetail.tabLabs', 'Lab Measurements')} ({record.lab_results.length})
        </button>
        <button
          onClick={() => setActiveTab('meds')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'meds'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          {t('recordDetail.tabMeds', 'Medications')} ({record.medications.length})
        </button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'edit'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Edit3 className="w-4 h-4" /> {t('recordDetail.tabEdit', 'Correct Data')}
        </button>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="bg-teal-50/70 p-4 rounded-2xl border border-teal-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-teal-700" />
              <div>
                <span className="text-sm font-bold text-teal-950">AI Content Translation</span>
                <span className="text-xs text-teal-700 block">Translate explanations and document overview according to your language.</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { code: 'en', label: 'English' },
                { code: 'te', label: 'తెలుగు (Telugu)' },
                { code: 'hi', label: 'हिन्दी (Hindi)' },
                { code: 'es', label: 'Español' },
                { code: 'fr', label: 'Français' }
              ].map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    i18n.changeLanguage(lang.code);
                    handleTranslate(lang.code);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    selectedLanguage === lang.code ? 'bg-teal-700 text-white border-teal-700 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI KEY HIGHLIGHTS */}
          {activeSummary.key_highlights && activeSummary.key_highlights.length > 0 && (
            <div className="bg-gradient-to-br from-teal-50 via-emerald-50/60 to-white p-6 rounded-2xl border border-teal-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-700" />
                  <h2 className="text-lg font-bold text-teal-950">{t('recordDetail.keyHighlights', 'AI Key Highlights & Takeaways')}</h2>
                </div>
                <span className="px-2.5 py-0.5 bg-teal-100 text-teal-900 text-[11px] font-extrabold uppercase tracking-wide rounded-full">
                  {t('recordDetail.keyPointsBadge', 'Key Points')}
                </span>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {activeSummary.key_highlights.map((h: string, idx: number) => (
                  <li key={idx} className="bg-white/90 p-3.5 rounded-xl border border-teal-100 flex items-start gap-2.5 text-sm text-slate-800 font-medium shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* EXTRACTED CLINICAL DIAGNOSES */}
          {((record.diagnoses && record.diagnoses.length > 0) || (activeSummary.diagnoses && activeSummary.diagnoses.length > 0)) && (
            <div className="bg-indigo-50/70 p-6 rounded-2xl border border-indigo-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-indigo-700" />
                  <h2 className="text-lg font-bold text-indigo-950">
                    {t('recordDetail.diagnosesTitle', 'Extracted Diagnoses & Clinical Conditions')}
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-900 text-[11px] font-extrabold uppercase tracking-wide rounded-full">
                  Clinical Diagnoses
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {(record.diagnoses && record.diagnoses.length > 0 ? record.diagnoses : (activeSummary.diagnoses || [])).map((diag: string, idx: number) => (
                  <div key={idx} className="bg-white px-4 py-2.5 rounded-xl border border-indigo-200 flex items-center gap-2.5 text-sm text-slate-800 font-bold shadow-2xs">
                    <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{diag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DOCUMENT OVERVIEW - ALWAYS TRANSLATED ACCORDING TO USER'S LANGUAGE */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {t('recordDetail.documentOverview', 'Document Overview')}
                {selectedLanguage !== 'en' && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                    {selectedLanguage.toUpperCase()}
                  </span>
                )}
              </h2>
              {translating && (
                <span className="text-xs text-teal-600 font-semibold flex items-center gap-1.5 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {t('recordDetail.translatingStatus', 'Translating document...')}
                </span>
              )}
            </div>
            {translating ? (
              <div className="py-4 space-y-2.5 animate-pulse">
                <div className="h-4 bg-teal-100/70 rounded w-full"></div>
                <div className="h-4 bg-teal-100/60 rounded w-11/12"></div>
                <div className="h-4 bg-teal-100/40 rounded w-4/6"></div>
              </div>
            ) : (
              <p className="text-sm text-slate-700 leading-relaxed font-normal">{activeSummary.overview}</p>
            )}
          </div>

          {activeSummary.abnormal_results && activeSummary.abnormal_results.length > 0 && (
            <div className="bg-amber-50/60 p-6 rounded-2xl border border-amber-200 space-y-4">
              <h2 className="text-lg font-bold text-amber-950 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" /> {t('recordDetail.abnormalResults', 'Results Outside Provided Reference Ranges')}
              </h2>
              <div className="space-y-3">
                {activeSummary.abnormal_results.map((ab: any, idx: number) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{ab.test_name}</span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold text-xs rounded-md">
                        {ab.value} (Ref: {ab.reference_range})
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{ab.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSummary.important_findings && activeSummary.important_findings.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h2 className="text-lg font-bold text-slate-900">{t('recordDetail.importantFindings', 'Important Findings')}</h2>
              <ul className="space-y-2 text-sm text-slate-700">
                {activeSummary.important_findings.map((f: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeSummary.plain_language_explanations && activeSummary.plain_language_explanations.length > 0 && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h2 className="text-lg font-bold text-slate-900">{t('recordDetail.plainExplanations', 'Plain-Language Explanations')}</h2>
              <ul className="space-y-2 text-sm text-slate-700">
                {activeSummary.plain_language_explanations.map((exp: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">•</span>
                    <span>{exp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeSummary.questions_for_doctor && activeSummary.questions_for_doctor.length > 0 && (
            <div className="bg-teal-900 text-white p-6 rounded-2xl shadow-md space-y-3">
              <h2 className="text-lg font-bold text-teal-200">{t('recordDetail.questionsForDoctor', 'Questions to Ask Your Doctor')}</h2>
              <ul className="space-y-2 text-sm text-slate-200">
                {activeSummary.questions_for_doctor.map((q: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold text-teal-400">•</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'labs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Test Name</th>
                  <th className="px-6 py-3.5">Measured Value</th>
                  <th className="px-6 py-3.5">Unit</th>
                  <th className="px-6 py-3.5">Reference Range</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {record.lab_results.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No lab results extracted from this document.
                    </td>
                  </tr>
                ) : (
                  record.lab_results.map((lab) => (
                    <tr key={lab.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{lab.test_name}</td>
                      <td className="px-6 py-4 font-extrabold text-slate-900">{lab.value}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{lab.unit || '-'}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {lab.reference_text || (lab.reference_min && lab.reference_max ? `${lab.reference_min} - ${lab.reference_max}` : '-')}
                      </td>
                      <td className="px-6 py-4">
                        {lab.result_status === 'Abnormal' ? (
                          <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-900 rounded-md">
                            Abnormal
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-900 rounded-md">
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'meds' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {record.medications.length === 0 ? (
            <div className="col-span-2 bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
              No prescribed medications extracted from this document.
            </div>
          ) : (
            record.medications.map((med) => (
              <div key={med.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900">{med.medicine_name}</h3>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 text-xs font-bold rounded">
                    {med.strength || 'Dose as directed'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">Instructions: <strong>{med.dosage_instructions || 'Take per prescription'}</strong></p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <span>Frequency: {med.frequency || 'N/A'}</span>
                  <span>Duration: {med.duration || 'N/A'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'edit' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Review & Correct Extracted Fields</h2>
            <p className="text-xs text-slate-500">Correct any OCR ambiguities before treating extracted values as user confirmed.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Document Date</label>
              <input
                type="date"
                value={editDocDate}
                onChange={(e) => setEditDocDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Lab Result Fields</h3>
            {editLabs.map((lab, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="text"
                  value={lab.test_name}
                  onChange={(e) => {
                    const newLabs = [...editLabs];
                    newLabs[idx].test_name = e.target.value;
                    setEditLabs(newLabs);
                  }}
                  className="px-3 py-1.5 text-xs border rounded-lg bg-white"
                  placeholder="Test Name"
                />
                <input
                  type="text"
                  value={lab.value}
                  onChange={(e) => {
                    const newLabs = [...editLabs];
                    newLabs[idx].value = e.target.value;
                    setEditLabs(newLabs);
                  }}
                  className="px-3 py-1.5 text-xs border rounded-lg bg-white"
                  placeholder="Value"
                />
                <input
                  type="text"
                  value={lab.unit || ''}
                  onChange={(e) => {
                    const newLabs = [...editLabs];
                    newLabs[idx].unit = e.target.value;
                    setEditLabs(newLabs);
                  }}
                  className="px-3 py-1.5 text-xs border rounded-lg bg-white"
                  placeholder="Unit"
                />
                <select
                  value={lab.result_status || 'Normal'}
                  onChange={(e) => {
                    const newLabs = [...editLabs];
                    newLabs[idx].result_status = e.target.value;
                    setEditLabs(newLabs);
                  }}
                  className="px-3 py-1.5 text-xs border rounded-lg bg-white font-bold"
                >
                  <option value="Normal">Normal</option>
                  <option value="Abnormal">Abnormal</option>
                </select>
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveCorrections}
            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Corrections & Verify Data
          </button>
        </div>
      )}

    </div>
  );
};
