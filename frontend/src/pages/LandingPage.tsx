import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Shield, FileText, TrendingUp, Globe, Database, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-900 via-slate-900 to-slate-900 text-white pt-20 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-6">
            <Activity className="w-4 h-4 text-teal-400" /> {t('landing.badge')}
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight text-white mb-6">
            {t('landing.heroTitle1')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-teal-200 to-emerald-400">
              {t('landing.heroTitle2')}
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            {t('landing.heroDescription')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-base shadow-lg shadow-teal-500/25 transition-all transform hover:-translate-y-0.5"
            >
              {t('buttons.openDashboard')} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-teal-900/60 hover:bg-teal-800 text-teal-200 font-bold text-base border border-teal-500/30 transition-colors"
            >
              Sign In / Register
            </Link>
            <Link
              to="/upload"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-base border border-slate-700 transition-colors"
            >
              {t('buttons.uploadShort')}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-2">{t('landing.workflowTitle')}</h2>
            <p className="text-3xl font-bold text-slate-900">{t('landing.workflowSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200/80 relative">
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl font-extrabold mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t('landing.step1Title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('landing.step1Desc')}
              </p>
            </div>

            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200/80 relative">
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl font-extrabold mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t('landing.step2Title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('landing.step2Desc')}
              </p>
            </div>

            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200/80 relative">
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl font-extrabold mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t('landing.step3Title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('landing.step3Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900">{t('landing.featuresTitle')}</h2>
            <p className="text-slate-600 mt-2">{t('landing.featuresSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <FileText className="w-8 h-8 text-teal-600 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t('landing.f1Title')}</h3>
              <p className="text-sm text-slate-600">{t('landing.f1Desc')}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <Activity className="w-8 h-8 text-teal-600 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t('landing.f2Title')}</h3>
              <p className="text-sm text-slate-600">{t('landing.f2Desc')}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <TrendingUp className="w-8 h-8 text-teal-600 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t('landing.f3Title')}</h3>
              <p className="text-sm text-slate-600">{t('landing.f3Desc')}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <Globe className="w-8 h-8 text-teal-600 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t('landing.f4Title')}</h3>
              <p className="text-sm text-slate-600">{t('landing.f4Desc')}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <Database className="w-8 h-8 text-teal-600 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t('landing.f5Title')}</h3>
              <p className="text-sm text-slate-600">{t('landing.f5Desc')}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <Shield className="w-8 h-8 text-teal-600 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t('landing.f6Title')}</h3>
              <p className="text-sm text-slate-600">{t('landing.f6Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-auto bg-slate-900 text-slate-400 py-8 px-4 border-t border-slate-800 text-center text-xs">
        <p>© 2026 Personal Health Copilot. Hackathon Demonstration Project. All rights reserved.</p>
      </footer>
    </div>
  );
};
