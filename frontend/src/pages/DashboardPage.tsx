import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, Activity, AlertTriangle, Upload, Clock, TrendingUp, UserCheck, 
  ArrowUpRight, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchRecords, fetchLabTrend } from '../services/api';
import type { MedicalRecord } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, activePatient } = useAuth();
  const displayName = activePatient?.display_name || user?.full_name || 'User';
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetchRecords(),
      fetchLabTrend('Hemoglobin')
    ]).then(([recData, trendRes]) => {
      setRecords(recData);
      setTrendData(trendRes.data_points || []);
    }).catch(err => {
      console.error(err);
    });
  }, []);

  const totalRecords = records.length;
  const labCount = records.filter(r => r.record_type === 'Laboratory report').length;
  const rxCount = records.filter(r => r.record_type === 'Prescription').length;
  const needsReviewCount = records.filter(r => r.verification_status === 'Needs Review').length;

  const abnormalResultsList = records.flatMap(r => 
    r.lab_results
      .filter(l => l.result_status === 'Abnormal')
      .map(l => ({ ...l, document_date: r.document_date, record_id: r.id, filename: r.original_filename }))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-3 border border-teal-500/30">
            Patient Portal • {t('demoBadge')}
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Welcome back, {displayName}</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            {t('dashboard.subtitle')}
          </p>
        </div>

        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all shrink-0"
        >
          <Upload className="w-4 h-4" /> {t('buttons.uploadRecord')}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('dashboard.totalRecords')}</span>
            <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalRecords}</span>
            <span className="text-xs text-slate-500">{t('dashboard.totalSub')}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('dashboard.labReports')}</span>
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{labCount}</span>
            <span className="text-xs text-teal-700 font-medium">{t('dashboard.labSub')}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('dashboard.prescriptions')}</span>
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{rxCount}</span>
            <span className="text-xs text-slate-500">{t('dashboard.rxSub')}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">{t('dashboard.needsReview')}</span>
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-950">{needsReviewCount}</span>
            <span className="text-xs text-amber-800 font-medium">{t('dashboard.needsReviewSub')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t('dashboard.chartTitle')}</h2>
              <p className="text-xs text-slate-500">{t('dashboard.chartSub')}</p>
            </div>
            <Link to="/trends" className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1">
              {t('buttons.viewTrends')} <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="h-64 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis domain={[9, 14]} stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px' }}
                    formatter={(val: any) => [`${val} g/dL`, 'Hemoglobin']}
                  />
                  <Line type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={3} dot={{ r: 6, fill: '#0d9488' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No historical trend measurements recorded
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> {t('dashboard.abnormalTitle')}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
              {abnormalResultsList.length} Flagged
            </span>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-72">
            {abnormalResultsList.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">All laboratory measurements within normal reference bounds.</div>
            ) : (
              abnormalResultsList.map((ab, idx) => (
                <div key={idx} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{ab.test_name}</span>
                    <span className="text-xs text-slate-500 block">Ref: {ab.reference_text || 'Standard Range'}</span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">{ab.filename} ({ab.document_date})</span>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-lg">
                      {ab.value} {ab.unit}
                    </span>
                    <Link to={`/records/${ab.record_id}`} className="text-[11px] text-teal-700 hover:underline block mt-1 font-medium">
                      Review & Confirm
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">{t('dashboard.recentUploads')}</h2>
            <Link to="/records" className="text-xs font-bold text-teal-700 hover:underline">
              {t('buttons.viewHistory')}
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3">Document Name</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Document Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {records.slice(0, 4).map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="truncate max-w-xs">{rec.original_filename}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-800">
                        {rec.record_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{rec.document_date || 'N/A'}</td>
                    <td className="px-6 py-4">
                      {rec.verification_status === 'Needs Review' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Needs Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Extracted
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/records/${rec.id}`} className="text-teal-700 hover:text-teal-800 font-bold text-xs flex items-center gap-1">
                        View <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">{t('dashboard.quickActions')}</h2>
            <div className="space-y-3">
              <Link
                to="/upload"
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-100 text-teal-700 rounded-lg group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900">{t('buttons.uploadRecord')}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
              </Link>

              <Link
                to="/records"
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900">{t('buttons.viewHistory')}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
              </Link>

              <Link
                to="/timeline"
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900">{t('buttons.viewTimeline')}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
              </Link>

              <Link
                to="/trends"
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900">{t('buttons.viewTrends')}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
              </Link>

              <Link
                to="/profile"
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900">{t('buttons.viewProfile')}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
