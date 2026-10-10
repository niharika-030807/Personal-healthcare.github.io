import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchTrendTests, fetchLabTrend } from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';

export const TrendsPage: React.FC = () => {
  const { t } = useTranslation();
  const [testNames, setTestNames] = useState<string[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>('Hemoglobin');
  const [trendData, setTrendData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendTests().then((list) => {
      setTestNames(list);
      if (list.length > 0 && !list.includes(selectedTest)) {
        setSelectedTest(list[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedTest) {
      setLoading(true);
      fetchLabTrend(selectedTest)
        .then((data) => {
          setTrendData(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [selectedTest]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('trends.title')}</h1>
        <p className="text-slate-600 text-sm mt-1">
          {t('trends.subtitle')}
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-2">{t('trends.selectParameter')}</span>
        {testNames.map((name) => (
          <button
            key={name}
            onClick={() => setSelectedTest(name)}
            className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors ${
              selectedTest === name
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600" /> {selectedTest} {t('trends.trendTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Unit: <strong>{trendData?.unit || 'N/A'}</strong> • Standard Reference Bounds: {trendData?.reference_min && trendData?.reference_max ? `${trendData.reference_min} - ${trendData.reference_max} ${trendData.unit}` : 'Provided per report'}
            </p>
          </div>

          {trendData?.data_points?.length >= 2 && (
            <div className="bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-xl text-xs text-teal-900 font-semibold">
              Historical Change: {trendData.data_points[0].raw_value} → {trendData.data_points[trendData.data_points.length - 1].raw_value} {trendData.unit}
            </div>
          )}
        </div>

        <div className="h-80 w-full pt-4">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">Loading trend data...</div>
          ) : !trendData || trendData.data_points?.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">No historical data recorded for {selectedTest}.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData.data_points} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px' }}
                  formatter={(val: any) => [`${val} ${trendData.unit}`, selectedTest]}
                />
                {trendData.reference_min && (
                  <ReferenceLine y={trendData.reference_min} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `Min: ${trendData.reference_min}`, fill: '#b45309', fontSize: 10 }} />
                )}
                {trendData.reference_max && (
                  <ReferenceLine y={trendData.reference_max} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `Max: ${trendData.reference_max}`, fill: '#b45309', fontSize: 10 }} />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0d9488"
                  strokeWidth={4}
                  dot={{ r: 7, fill: '#0d9488', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 font-bold text-slate-900">
          {t('trends.sourceBreakdown')}
        </div>
        <div className="divide-y divide-slate-100">
          {trendData?.data_points?.map((dp: any, idx: number) => (
            <div key={idx} className="p-4 sm:p-6 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{dp.filename}</span>
                  <span className="text-xs text-slate-400 font-mono">({dp.date})</span>
                </div>
                <span className="text-xs text-slate-500 block mt-0.5">
                  Reference range stated in source report: {dp.ref_min && dp.ref_max ? `${dp.ref_min} - ${dp.ref_max} ${dp.unit}` : 'Standard'}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                  dp.status === 'Abnormal' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                }`}>
                  {dp.raw_value} {dp.unit}
                </span>

                <Link
                  to={`/records/${dp.record_id}`}
                  className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                >
                  {t('buttons.viewReport')} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
