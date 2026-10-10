import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { uploadRecordFile } from '../services/api';
import type { MedicalRecord } from '../services/api';

import { useAuth } from '../context/AuthContext';

const STAGES = [
  'Uploading',
  'Extracting text',
  'Classifying document',
  'Extracting medical information',
  'Validating extracted data',
  'Generating summary',
  'Saving record'
];

export const UploadPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activePatient } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processedRecord, setProcessedRecord] = useState<MedicalRecord | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
        setErrorMsg('Invalid file format. Please upload PDF, JPG, JPEG, or PNG files.');
        return;
      }
      if (selected.size > 10 * 1024 * 1024) {
        setErrorMsg('File size exceeds 10MB limit.');
        return;
      }
      setErrorMsg(null);
      setFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
        setErrorMsg('Invalid file format. Please upload PDF, JPG, JPEG, or PNG files.');
        return;
      }
      if (selected.size > 10 * 1024 * 1024) {
        setErrorMsg('File size exceeds 10MB limit.');
        return;
      }
      setErrorMsg(null);
      setFile(selected);
    }
  };

  const handleUploadSubmit = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setCurrentStageIdx(0);

    const interval = setInterval(() => {
      setCurrentStageIdx((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 600);

    try {
      const record = await uploadRecordFile(file, activePatient?.id);
      clearInterval(interval);
      setCurrentStageIdx(STAGES.length - 1);
      setTimeout(() => {
        setIsProcessing(false);
        setProcessedRecord(record);
      }, 500);
    } catch (err: any) {
      clearInterval(interval);
      setIsProcessing(false);
      setErrorMsg(err.response?.data?.detail || 'An error occurred during document processing.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('upload.title')}</h1>
        <p className="text-slate-600 text-sm mt-1">
          {t('upload.subtitle')}
        </p>
      </div>

      {!processedRecord ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${
              file ? 'border-teal-500 bg-teal-50/30' : 'border-slate-300 hover:border-teal-500 bg-slate-50/50'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Upload className="w-8 h-8" />
            </div>

            {file ? (
              <div className="space-y-2">
                <p className="text-base font-bold text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500 font-mono">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'Medical Document'}
                </p>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs text-rose-600 hover:underline font-semibold mt-2"
                >
                  {t('upload.differentFile')}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-base font-bold text-slate-800 mb-1">
                  {t('upload.dragDrop')}{' '}
                  <label className="text-teal-700 underline cursor-pointer hover:text-teal-800">
                    {t('upload.browse')}
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                    />
                  </label>
                </p>
                <p className="text-xs text-slate-400 mt-2">{t('upload.supports')}</p>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isProcessing && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" /> {t('upload.processing')}
                </span>
                <span className="text-xs text-teal-700 font-mono">{STAGES[currentStageIdx]}</span>
              </div>

              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-teal-600 h-full transition-all duration-300"
                  style={{ width: `${((currentStageIdx + 1) / STAGES.length) * 100}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {STAGES.map((stage, idx) => (
                  <div
                    key={stage}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      idx < currentStageIdx
                        ? 'text-emerald-700 font-semibold'
                        : idx === currentStageIdx
                        ? 'bg-teal-100 text-teal-900 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {idx < currentStageIdx ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="w-3.5 h-3.5 text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                    )}
                    <span>{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isProcessing && file && (
            <button
              onClick={handleUploadSubmit}
              className="w-full py-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-base shadow-md transition-colors flex items-center justify-center gap-2"
            >
              {t('upload.btnAnalyze')} <ArrowRight className="w-5 h-5" />
            </button>
          )}

        </div>
      ) : (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h2 className="text-base font-bold text-emerald-950">{t('upload.completed')}</h2>
                <p className="text-xs text-emerald-800">
                  Document classified as <strong>{processedRecord.record_type}</strong>. Extracted {processedRecord.lab_results.length} lab results, {processedRecord.medications.length} medications, and {processedRecord.diagnoses?.length || 0} diagnoses.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/records/${processedRecord.id}`)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
            >
              {t('upload.btnViewSummary')}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
