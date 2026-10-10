import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Upload, Clock, TrendingUp, UserCheck, ShieldCheck, Settings, FileText } from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import type { LanguageMeta } from '../services/api';
import { useTranslation } from 'react-i18next';

interface NavbarProps {
  currentLanguage: string;
  onSelectLanguage: (lang: LanguageMeta) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentLanguage, onSelectLanguage }) => {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: t('nav.dashboard'), icon: Activity },
    { path: '/upload', label: t('nav.upload'), icon: Upload },
    { path: '/records', label: t('nav.history'), icon: FileText },
    { path: '/timeline', label: t('nav.timeline'), icon: Clock },
    { path: '/trends', label: t('nav.trends'), icon: TrendingUp },
    { path: '/profile', label: t('nav.profile'), icon: UserCheck },
    { path: '/interop', label: t('nav.interop'), icon: ShieldCheck },
    { path: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-md shadow-teal-600/20 group-hover:bg-teal-700 transition-colors">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight block leading-tight">
                Personal Health Copilot
              </span>
              <span className="text-[11px] text-teal-700 font-medium tracking-wide">
                Your Health Records. One Clear Picture.
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden lg:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
              Demo Mode Active
            </span>
            <LanguageSelector currentLanguage={currentLanguage} onSelectLanguage={onSelectLanguage} />
          </div>

        </div>
      </div>

      <div className="md:hidden border-t border-slate-100 px-2 py-2 flex items-center gap-1 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs whitespace-nowrap rounded-md ${
                isActive ? 'bg-teal-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
