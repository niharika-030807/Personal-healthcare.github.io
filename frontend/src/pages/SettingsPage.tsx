import React, { useState, useEffect } from 'react';
import { RefreshCw, Key, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { seedDemo, fetchHealth } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [health, setHealth] = useState<any>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchHealth().then(setHealth).catch(console.error);
  }, []);

  const handleResetDemoData = async () => {
    setSeeding(true);
    try {
      await seedDemo();
      alert('Demo data successfully re-seeded cleanly!');
      setSeeding(false);
    } catch (err) {
      console.error(err);
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('settings.title')}</h1>
        <p className="text-slate-600 text-sm mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Key className="w-5 h-5 text-teal-600" /> {t('settings.credentialsTitle')}
        </h2>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Application Environment:</span>
            <span className="font-bold text-slate-900">{health?.environment || 'development'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Google Gemini API Key Configured:</span>
            {health?.gemini_api_configured ? (
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 font-bold text-xs rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Configured (Backend Secured)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold text-xs rounded-full">
                Demo Mode Fallback Active
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-teal-600" /> {t('settings.reseedTitle')}
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Demo mode preloads 2 laboratory reports with historical comparisons, 1 prescription, 1 diagnostic report, and 1 discharge summary.
        </p>

        <button
          onClick={handleResetDemoData}
          disabled={seeding}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} /> {t('settings.reseedBtn')}
        </button>
      </div>

    </div>
  );
};
