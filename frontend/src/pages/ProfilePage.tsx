import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, Activity, Pill, TrendingUp, 
  ArrowRight, ShieldCheck, Clock, HeartPulse, 
  Stethoscope, Download, Upload 
} from 'lucide-react';
import { fetchPatientMe, fetchRecords, fetchTimeline } from '../services/api';
import type { Patient, MedicalRecord, DocumentEvent } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ProfilePage: React.FC = () => {
  const { user, activePatient } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [events, setEvents] = useState<DocumentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchPatientMe(), 
      fetchRecords(undefined, activePatient?.id),
      fetchTimeline()
    ])
      .then(([pData, rData, evData]) => {
        setPatient(pData);
        setRecords(rData);
        setEvents(evData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load profile data:', err);
        setLoading(false);
      });
  }, [activePatient]);

  const effectiveDisplayName = activePatient?.display_name || patient?.display_name || user?.full_name || 'Patient';

  // 1. Unified Diagnoses & Conditions (deduplicated across all records)
  const allDiagnosesMap = new Map<string, { diagnosis: string; date?: string; recordId: string; recordType: string }>();
  
  records.forEach((rec) => {
    // Check record.diagnoses
    if (rec.diagnoses && Array.isArray(rec.diagnoses)) {
      rec.diagnoses.forEach((d) => {
        const key = d.trim().toLowerCase();
        if (key && !allDiagnosesMap.has(key)) {
          allDiagnosesMap.set(key, {
            diagnosis: d.trim(),
            date: rec.document_date,
            recordId: rec.id,
            recordType: rec.record_type
          });
        }
      });
    }
    // Also check summary important findings for legacy records
    if (rec.summaries && rec.summaries.length > 0) {
      const sum = rec.summaries[0].summary_json;
      if (sum && sum.diagnoses && Array.isArray(sum.diagnoses)) {
        sum.diagnoses.forEach((d: string) => {
          const key = d.trim().toLowerCase();
          if (key && !allDiagnosesMap.has(key)) {
            allDiagnosesMap.set(key, {
              diagnosis: d.trim(),
              date: rec.document_date,
              recordId: rec.id,
              recordType: rec.record_type
            });
          }
        });
      }
    }
  });

  const unifiedDiagnoses = Array.from(allDiagnosesMap.values());

  // 2. Unified Medications (split by User Confirmed vs Extracted)
  const allMeds = records.flatMap((r) => 
    r.medications.map((m) => ({
      ...m,
      documentDate: r.document_date,
      recordId: r.id,
      recordType: r.record_type
    }))
  );

  const confirmedMeds = allMeds.filter((m) => m.verification_status === 'User Verified');
  const extractedMeds = allMeds.filter((m) => m.verification_status !== 'User Verified');

  // 3. Latest Lab Biomarkers & Vitals (grouped by test_name)
  const latestLabMap = new Map<string, any>();
  records.forEach((rec) => {
    rec.lab_results.forEach((lab) => {
      const key = lab.test_name.trim().toLowerCase();
      const existing = latestLabMap.get(key);
      const currentDate = rec.document_date || '2026-01-01';
      if (!existing || currentDate >= (existing.date || '')) {
        latestLabMap.set(key, {
          ...lab,
          date: rec.document_date,
          recordId: rec.id
        });
      }
    });
  });

  const latestLabs = Array.from(latestLabMap.values());
  const abnormalLabsCount = latestLabs.filter((l) => l.result_status === 'Abnormal').length;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold text-slate-500">Loading Unified Health Profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* HERO UNIFIED HEALTH PROFILE CARD */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center text-3xl font-extrabold shadow-lg shadow-teal-500/30">
              {effectiveDisplayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-black tracking-tight">{effectiveDisplayName}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> Unified Profile
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300">
                  {activePatient?.relationship_type || 'Self'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 flex flex-wrap items-center gap-3">
                <span>DOB: <strong>{activePatient?.date_of_birth || patient?.date_of_birth || user?.date_of_birth || '1988-04-12'}</strong></span>
                <span>•</span>
                <span>Language: <strong>{(activePatient?.preferred_language || patient?.preferred_language || user?.preferred_language || 'EN').toUpperCase()}</strong></span>
                <span>•</span>
                <span>Account: <strong>{user?.email || 'Active User'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/upload"
              className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Upload Record
            </Link>
            <Link
              to="/trends"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/15 transition flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4 text-teal-300" /> View Trends
            </Link>
            <Link
              to="/interoperability"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/15 transition flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-teal-300" /> Export FHIR
            </Link>
          </div>
        </div>

        {/* METRICS COUNTER BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider block">Medical Records</span>
            <div className="text-2xl font-black mt-1">{records.length}</div>
            <span className="text-[10px] text-slate-400">Prescriptions, labs, summaries</span>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider block">Diagnosed Conditions</span>
            <div className="text-2xl font-black mt-1 text-teal-400">{unifiedDiagnoses.length}</div>
            <span className="text-[10px] text-slate-400">Extracted across records</span>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider block">Tracked Medications</span>
            <div className="text-2xl font-black mt-1">{allMeds.length}</div>
            <span className="text-[10px] text-emerald-400 font-semibold">{confirmedMeds.length} confirmed</span>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider block">Lab Biomarkers</span>
            <div className="text-2xl font-black mt-1">{latestLabs.length}</div>
            <span className="text-[10px] text-amber-300 font-semibold">{abnormalLabsCount} outside range</span>
          </div>
        </div>
      </div>

      {/* MAIN PROFILE SECTIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT 2 COLUMNS: CLINICAL CONDITIONS & MEDICATIONS */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. UNIFIED CLINICAL DIAGNOSES & CONDITIONS */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Documented Conditions & Diagnoses</h2>
                  <p className="text-xs text-slate-500">Organized from physician notes, discharge summaries, and lab findings.</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-100">
                {unifiedDiagnoses.length} Identified
              </span>
            </div>

            {unifiedDiagnoses.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-sm">
                No clinical diagnoses identified in uploaded records yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {unifiedDiagnoses.map((diag, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-200 transition-colors space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-extrabold text-slate-900 text-sm leading-snug">{diag.diagnosis}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 shrink-0">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <span>{diag.recordType}</span>
                      <Link 
                        to={`/records/${diag.recordId}`}
                        className="font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                      >
                        {diag.date || 'View Record'} <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. UNIFIED MEDICATIONS CABINET */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Prescribed Medications & Regimens</h2>
                  <p className="text-xs text-slate-500">Cross-document active prescriptions, strengths, and dosages.</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold bg-teal-50 text-teal-800 rounded-lg border border-teal-100">
                {allMeds.length} Total Prescriptions
              </span>
            </div>

            {/* CONFIRMED MEDICATIONS */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">User-Verified Medications ({confirmedMeds.length})</h3>
              </div>
              {confirmedMeds.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  No medications marked as user-verified yet. Correct or confirm prescriptions in record details.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {confirmedMeds.map((med, idx) => (
                    <div key={idx} className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 text-sm">{med.medicine_name}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-900">
                          {med.strength || 'Standard Dose'}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-900 font-medium">{med.dosage_instructions}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-emerald-100">
                        <span>Freq: <strong>{med.frequency || 'Daily'}</strong></span>
                        <Link to={`/records/${med.recordId}`} className="text-emerald-700 font-bold hover:underline">
                          {med.documentDate || 'Record'}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AUTO-EXTRACTED MEDICATIONS */}
            {extractedMeds.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">AI-Extracted Medications ({extractedMeds.length})</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {extractedMeds.map((med, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{med.medicine_name}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-800">
                          {med.strength || 'As Directed'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{med.dosage_instructions}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Status: <strong>Extracted</strong></span>
                        <Link to={`/records/${med.recordId}`} className="text-teal-700 font-bold hover:underline">
                          Review & Verify
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: LATEST LABS & TIMELINE SNAPSHOT */}
        <div className="space-y-8">
          
          {/* 3. LATEST BIOMARKERS & LAB RESULTS */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Latest Biomarkers</h2>
                  <p className="text-xs text-slate-500">Most recent lab results across panels.</p>
                </div>
              </div>
              <Link 
                to="/trends" 
                className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
              >
                Trends <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {latestLabs.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl text-slate-400 text-xs">
                No lab measurements extracted yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {latestLabs.map((lab, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3.5 rounded-2xl border transition-colors ${
                      lab.result_status === 'Abnormal'
                        ? 'bg-amber-50/60 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 text-xs">{lab.test_name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-slate-900">{lab.value}</span>
                        <span className="text-[10px] text-slate-500">{lab.unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                      <span>Ref: {lab.reference_text || (lab.reference_min && lab.reference_max ? `${lab.reference_min} - ${lab.reference_max}` : 'Standard')}</span>
                      {lab.result_status === 'Abnormal' ? (
                        <span className="px-1.5 py-0.5 rounded font-bold bg-amber-200 text-amber-900">
                          Abnormal
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-900">
                          Normal
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. RECENT TIMELINE SNAPSHOT */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Health Timeline</h2>
                  <p className="text-xs text-slate-500">Recent chronological events.</p>
                </div>
              </div>
              <Link 
                to="/timeline" 
                className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
              >
                All Events <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {events.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl text-slate-400 text-xs">
                No events recorded. Upload a document to create an event.
              </div>
            ) : (
              <div className="relative border-l-2 border-teal-200 ml-3 space-y-4 py-1">
                {events.slice(0, 4).map((ev) => (
                  <div key={ev.id} className="relative pl-5">
                    <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-teal-600 ring-4 ring-white"></div>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-teal-700">{ev.event_date}</span>
                        <span>{ev.event_type}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{ev.description}</p>
                      <Link 
                        to={`/records/${ev.medical_record_id}`}
                        className="text-[11px] font-semibold text-teal-600 hover:underline inline-block pt-0.5"
                      >
                        Inspect Record →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
