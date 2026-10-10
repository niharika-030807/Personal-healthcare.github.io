import React, { useState, useEffect } from 'react';
import { Download, FileJson } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchFhirObservation } from '../services/api';

export const InteroperabilityPage: React.FC = () => {
  const { t } = useTranslation();
  const [fhirData, setFhirData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFhirObservation()
      .then((data) => {
        setFhirData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleDownloadJson = () => {
    if (!fhirData) return;
    const jsonStr = JSON.stringify(fhirData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FHIR_R4_Bundle_Export.json`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('interop.title')}</h1>
        <p className="text-slate-600 text-sm mt-1">
          {t('interop.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-900 text-sm">Patient</span>
            <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-mono">FHIR R4</span>
          </div>
          <p className="text-xs text-slate-500">Demographic & BCP47 language attributes.</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-900 text-sm">Observation</span>
            <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-mono">FHIR R4</span>
          </div>
          <p className="text-xs text-slate-500">Laboratory test values & LOINC coding.</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-900 text-sm">MedicationRequest</span>
            <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-mono">FHIR R4</span>
          </div>
          <p className="text-xs text-slate-500">Prescription dosage & RxNorm codes.</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-900 text-sm">DocumentReference</span>
            <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-mono">FHIR R4</span>
          </div>
          <p className="text-xs text-slate-500">Source PDF attachment references.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <FileJson className="w-6 h-6 text-teal-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t('interop.livePreview')}</h2>
              <span className="text-xs text-slate-500">Validated HL7 FHIR Specification Version v4.0.1</span>
            </div>
          </div>

          <button
            onClick={handleDownloadJson}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> {t('interop.downloadBtn')}
          </button>
        </div>

        <div className="bg-slate-950 p-6 rounded-2xl overflow-x-auto text-xs font-mono text-emerald-400 max-h-96">
          {loading ? (
            <span className="text-slate-400">Generating FHIR R4 JSON bundle...</span>
          ) : (
            <pre>{JSON.stringify(fhirData, null, 2)}</pre>
          )}
        </div>
      </div>

    </div>
  );
};
