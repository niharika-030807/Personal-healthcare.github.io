import React, { useState, useEffect } from 'react';
import { 
  User, Calendar, Droplet, Users, Phone, Heart, 
  Save, CheckCircle2, Sun, Moon, Laptop, Shield, Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme, type Theme } from '../context/ThemeContext';

export interface PersonalProfileData {
  name: string;
  age: string;
  blood_group: string;
  gender: string;
  emergency_contact: string;
  emergency_contact_name?: string;
}

const STORAGE_KEY = 'health_copilot_personal_profile';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, activePatient, setActivePatient } = useAuth();
  const { theme, actualTheme, setTheme } = useTheme();

  // Personal Profile Form States
  const [profile, setProfile] = useState<PersonalProfileData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved personal profile:', e);
    }
    return {
      name: activePatient?.display_name || user?.full_name || 'Eleanor Vance',
      age: '34',
      blood_group: 'O+',
      gender: 'Female',
      emergency_contact: '+1 (555) 912-3456',
      emergency_contact_name: 'John Vance (Spouse)',
    };
  });

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync if active user changes and no custom profile was saved
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved && (activePatient || user)) {
      setProfile(prev => ({
        ...prev,
        name: activePatient?.display_name || user?.full_name || prev.name,
      }));
    }
  }, [activePatient, user]);

  const handleInputChange = (field: keyof PersonalProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));

      // Propagate name change to active patient in localStorage and UI
      if (activePatient) {
        const updatedPatient = { ...activePatient, display_name: profile.name };
        setActivePatient(updatedPatient);

        try {
          const cachedPatientsStr = localStorage.getItem('health_copilot_patients');
          if (cachedPatientsStr) {
            const cachedPatients = JSON.parse(cachedPatientsStr);
            const updatedList = cachedPatients.map((p: any) => 
              p.id === activePatient.id ? { ...p, display_name: profile.name } : p
            );
            localStorage.setItem('health_copilot_patients', JSON.stringify(updatedList));
          }
        } catch (err) {
          console.warn('Could not update cached patients:', err);
        }
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to save personal profile:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const bloodGroupOptions = [
    { value: 'A+', label: 'A+ (A Positive)' },
    { value: 'A-', label: 'A- (A Negative)' },
    { value: 'B+', label: 'B+ (B Positive)' },
    { value: 'B-', label: 'B- (B Negative)' },
    { value: 'AB+', label: 'AB+ (AB Positive)' },
    { value: 'AB-', label: 'AB- (AB Negative)' },
    { value: 'O+', label: 'O+ (O Positive)' },
    { value: 'O-', label: 'O- (O Negative)' },
    { value: 'Unknown', label: 'Unknown / Not Tested' },
  ];

  const genderOptions = [
    { value: 'Female', label: 'Female' },
    { value: 'Male', label: 'Male' },
    { value: 'Non-binary', label: 'Non-binary' },
    { value: 'Other', label: 'Other' },
    { value: 'Prefer not to say', label: 'Prefer not to say' },
  ];

  const appearanceOptions: {
    id: Theme;
    title: string;
    description: string;
    icon: typeof Sun;
    activeGradient: string;
  }[] = [
    {
      id: 'light',
      title: 'Light',
      description: 'Clean, high-clarity bright aesthetic for day use.',
      icon: Sun,
      activeGradient: 'from-amber-500 to-orange-500',
    },
    {
      id: 'dark',
      title: 'Dark',
      description: 'Low-glare dark palette with reduced eye strain.',
      icon: Moon,
      activeGradient: 'from-indigo-500 to-purple-600',
    },
    {
      id: 'system',
      title: 'System Default',
      description: 'Automatically synchronizes with your device appearance.',
      icon: Laptop,
      activeGradient: 'from-teal-500 to-emerald-600',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
          Manage your personal medical profile, emergency contacts, and application appearance.
        </p>
      </div>

      {/* Success Notification Banner */}
      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-emerald-900 dark:text-emerald-200 text-sm shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Personal profile updated successfully!</span>
          </div>
          <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Saved to device</span>
        </div>
      )}

      {/* 1. PERSONAL PROFILE SECTION */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 transition-colors">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Personal Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Primary patient demographics, blood type, and emergency information.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-full text-xs font-bold flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Active Health Record
          </span>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Name */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Age */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Age (Years) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  required
                  min="0"
                  max="130"
                  value={profile.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  placeholder="e.g. 34"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Blood Group */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Blood Group <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Droplet className="w-4 h-4 text-rose-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={profile.blood_group}
                  onChange={(e) => handleInputChange('blood_group', e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none cursor-pointer"
                >
                  {bloodGroupOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Gender <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={profile.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none cursor-pointer"
                >
                  {genderOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Emergency Contact Number */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Emergency Contact Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={profile.emergency_contact}
                  onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                  placeholder="e.g. +1 (555) 912-3456 or +91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Emergency Contact Name / Relationship */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Emergency Contact Name & Relation
              </label>
              <div className="relative">
                <Heart className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={profile.emergency_contact_name || ''}
                  onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                  placeholder="e.g. John Vance (Spouse) or Family Physician"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
            </div>

          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Profile...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. APPEARANCE & THEME SECTION */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 transition-colors">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Appearance
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose light, dark, or automatic system appearance for the copilot interface.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
            Currently Active: <strong className="text-slate-900 dark:text-white capitalize">{actualTheme} Mode</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {appearanceOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/30 shadow-md ring-2 ring-teal-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                }`}
              >
                {/* Top: Icon & Checkmark */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${opt.activeGradient} text-white flex items-center justify-center shadow-xs`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h3 className={`text-sm font-bold ${
                    isSelected ? 'text-teal-900 dark:text-teal-200' : 'text-slate-900 dark:text-white'
                  }`}>
                    {opt.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
