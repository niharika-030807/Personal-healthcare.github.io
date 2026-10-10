import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, CheckCircle2, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchTimeline } from '../services/api';
import type { DocumentEvent } from '../services/api';

export const TimelinePage: React.FC = () => {
  const { t } = useTranslation();
  const [events, setEvents] = useState<DocumentEvent[]>([]);
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [selectedType, searchTerm]);

  const loadTimeline = () => {
    setLoading(true);
    fetchTimeline(selectedType, searchTerm)
      .then((data) => {
        setEvents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('timeline.title')}</h1>
        <p className="text-slate-600 text-sm mt-1">
          {t('timeline.subtitle')}
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={t('timeline.searchPlaceholder')}
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
                selectedType === type ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="relative border-l-2 border-teal-200 ml-4 md:ml-8 space-y-8 py-2">
        {loading ? (
          <div className="pl-6 text-slate-400 text-sm">Loading medical timeline events...</div>
        ) : events.length === 0 ? (
          <div className="pl-6 text-slate-500 text-sm">No timeline events found matching your filter criteria.</div>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="relative pl-6 md:pl-8 group">
              
              <div className="absolute -left-2.5 top-1.5 w-5 h-5 rounded-full bg-teal-600 ring-4 ring-slate-50 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
                  <span className="text-xs font-extrabold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100">
                    {ev.event_date}
                  </span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    {ev.event_type}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1">{ev.description}</h3>
                
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Extracted & Archived
                  </span>

                  <Link
                    to={`/records/${ev.medical_record_id}`}
                    className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                  >
                    View Original Record <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};
