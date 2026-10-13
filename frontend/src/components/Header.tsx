import React, { useState } from 'react';
import { Menu, Activity, Users, LogOut, Plus, ChevronDown } from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import type { LanguageMeta } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  currentLanguage: string;
  onSelectLanguage: (lang: LanguageMeta) => void;
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentLanguage, onSelectLanguage, onOpenSidebar }) => {
  const { user, patients, activePatient, setActivePatient, createPatient, logout, personalProfile } = useAuth();
  const currentDisplayName = personalProfile?.name || activePatient?.display_name || user?.full_name || 'Patient';
  const navigate = useNavigate();
  const [showPatientMenu, setShowPatientMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newRelationship, setNewRelationship] = useState('Family Member');

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;
    try {
      await createPatient(newPatientName, newRelationship);
      setNewPatientName('');
      setShowNewPatientModal(false);
      setShowPatientMenu(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 h-16 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-xs">
        
        {/* Mobile Hamburger & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-900">Personal Health Copilot</span>
          </div>
        </div>

        {/* Right Controls: Patient Profile Selector, User Dropdown & Global Searchable Language Selector */}
        <div className="flex items-center gap-3 ml-auto">
          
          {/* PATIENT PROFILE SELECTOR */}
          {user && (
            <div className="relative">
              <button
                onClick={() => { setShowPatientMenu(!showPatientMenu); setShowUserMenu(false); }}
                className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 text-xs font-semibold transition"
              >
                <Users className="w-4 h-4 text-teal-600" />
                <span className="hidden sm:inline text-slate-500">Patient:</span>
                <span className="font-bold text-teal-700 max-w-[140px] truncate">
                  {activePatient?.relationship_type === 'Self' ? currentDisplayName : (activePatient?.display_name || currentDisplayName)}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
              </button>

              {showPatientMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Switch Patient Profile
                  </div>
                  {patients.map((pt) => (
                    <button
                      key={pt.id}
                      onClick={() => {
                        setActivePatient(pt);
                        setShowPatientMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                        activePatient?.id === pt.id ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-[10px]">
                          {pt.display_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{pt.display_name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 rounded bg-slate-100">
                        {pt.relationship_type || 'Self'}
                      </span>
                    </button>
                  ))}
                  <div className="border-t border-slate-100 mt-1 pt-1 px-2">
                    <button
                      onClick={() => setShowNewPatientModal(true)}
                      className="w-full text-left px-2 py-1.5 text-xs text-teal-600 font-semibold hover:bg-teal-50 rounded-lg flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Family Member Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* USER ACCOUNT DROPDOWN / LOGOUT */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => { setShowUserMenu(!showUserMenu); setShowPatientMenu(false); }}
                className="flex items-center gap-2 py-1.5 px-2.5 rounded-xl hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
              >
                <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                  {currentDisplayName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline max-w-[100px] truncate">{currentDisplayName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentDisplayName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                      navigate('/login');
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-2 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="py-1.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition"
            >
              Sign In
            </button>
          )}

          {/* Searchable Language Selector */}
          <LanguageSelector currentLanguage={currentLanguage} onSelectLanguage={onSelectLanguage} />
        </div>

      </header>

      {/* NEW PATIENT PROFILE MODAL */}
      {showNewPatientModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Create Patient Profile</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a new family member or profile to organize their medical records separately.
            </p>
            <form onSubmit={handleAddPatient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship</label>
                <select
                  value={newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Self">Self</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Parent">Parent</option>
                  <option value="Family Member">Family Member</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-bold text-white shadow-sm"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
