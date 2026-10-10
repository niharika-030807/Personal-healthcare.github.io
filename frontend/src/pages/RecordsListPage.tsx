import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, AlertTriangle, CheckCircle2, ChevronRight, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchRecords, deleteRecord } from '../services/api';
import type { MedicalRecord } from '../services/api';

import { useAuth } from '../context/AuthContext';

export const RecordsListPage: React.FC = () => {
  const { t } = useTranslation();
  const { activePatient } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, [activePatient?.id]);

  const loadRecords = () => {
    setLoading(true);
    fetchRecords(undefined, activePatient?.id)
      .then((data) => {
        setRecords(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this medical record?')) {
      await deleteRecord(id);
      loadRecords();
    }
  };

  const filtered = records.filter((r) => {
    const matchesSearch =
      r.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.record_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'All' || r.record_type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('history.title')}</h1>
          <p className="text-slate-600 text-sm mt-1">
            {t('history.subtitle')}
          </p>
        </div>

        <Link
          to="/upload"
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition-colors"
        >
          {t('buttons.uploadRecord')}
        </Link>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={t('history.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {['All', 'Laboratory report', 'Prescription', 'Diagnostic report', 'Discharge summary'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                selectedType === type
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No medical records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">{t('history.colFilename')}</th>
                  <th className="px-6 py-3.5">{t('history.colType')}</th>
                  <th className="px-6 py-3.5">{t('history.colDate')}</th>
                  <th className="px-6 py-3.5">{t('history.colLabs')}</th>
                  <th className="px-6 py-3.5">{t('history.colMeds')}</th>
                  <th className="px-6 py-3.5">{t('history.colStatus')}</th>
                  <th className="px-6 py-3.5 text-right">{t('history.colAction')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <Link to={`/records/${rec.id}`} className="hover:text-teal-600 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                        <span className="truncate max-w-xs">{rec.original_filename}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-800">
                        {rec.record_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{rec.document_date || 'N/A'}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">{rec.lab_results.length} tests</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">{rec.medications.length} meds</td>
                    <td className="px-6 py-4">
                      {rec.verification_status === 'Needs Review' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> Needs Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Extracted
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/records/${rec.id}`}
                          className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          {t('buttons.viewReport')} <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={(e) => handleDelete(rec.id, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title={t('buttons.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
