import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Activity, Upload, FileText, Clock, TrendingUp, UserCheck, 
  ShieldCheck, Settings, X, LogIn, LogOut 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, logout } = useAuth();

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
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Left Sidebar container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-slate-300 z-50 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <Link to="/dashboard" onClick={onClose} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-teal-500/20 group-hover:bg-teal-400 transition-colors">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight block leading-tight">
                {t('appTitle')}
              </span>
              <span className="text-[10px] text-teal-400 font-medium tracking-wide">
                Your Health Records
              </span>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white font-bold shadow-sm shadow-teal-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Account / Sign In / Sign Out Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          {user ? (
            <div className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-bold text-slate-100 truncate">{user.full_name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={() => logout()}
                title="Sign Out"
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-900/30 transition"
            >
              <LogIn className="w-4 h-4" />
              Sign In / Register
            </Link>
          )}

          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/40 text-center">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-300">{t('demoBadge')}</span>
          </div>
        </div>
      </aside>
    </>
  );
};
