import React, { useState, useEffect, useRef } from 'react';
import { Globe, Search, Check, AlertCircle } from 'lucide-react';
import { fetchLanguages } from '../services/api';
import type { LanguageMeta } from '../services/api';

interface LanguageSelectorProps {
  currentLanguage: string;
  onSelectLanguage: (lang: LanguageMeta) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentLanguage, onSelectLanguage }) => {
  const [languages, setLanguages] = useState<LanguageMeta[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLanguages()
      .then((data) => setLanguages(data))
      .catch(() => {
        setLanguages([
          { code: 'en', name: 'English', native_name: 'English', dir: 'ltr', interface_supported: true, ai_translation_supported: true, ocr_supported: true },
          { code: 'te', name: 'Telugu', native_name: 'తెలుగు', dir: 'ltr', interface_supported: true, ai_translation_supported: true, ocr_supported: true },
          { code: 'hi', name: 'Hindi', native_name: 'हिन्दी', dir: 'ltr', interface_supported: true, ai_translation_supported: true, ocr_supported: true },
          { code: 'ta', name: 'Tamil', native_name: 'தமிழ்', dir: 'ltr', interface_supported: true, ai_translation_supported: true, ocr_supported: true },
          { code: 'bn', name: 'Bengali', native_name: 'বাংলা', dir: 'ltr', interface_supported: false, ai_translation_supported: true, ocr_supported: true },
          { code: 'ar', name: 'Arabic', native_name: 'العربية', dir: 'rtl', interface_supported: false, ai_translation_supported: true, ocr_supported: true },
          { code: 'ja', name: 'Japanese', native_name: '日本語', dir: 'ltr', interface_supported: false, ai_translation_supported: true, ocr_supported: true },
          { code: 'zh-CN', name: 'Chinese (Simplified)', native_name: '简体中文', dir: 'ltr', interface_supported: false, ai_translation_supported: true, ocr_supported: true },
        ]);
      });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLang = languages.find((l) => l.code === currentLanguage) || {
    code: 'en',
    name: 'English',
    native_name: 'English',
    dir: 'ltr',
    interface_supported: true,
    ai_translation_supported: true,
    ocr_supported: true
  };

  const filteredLanguages = languages.filter((l) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.native_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
      >
        <Globe className="w-4 h-4 text-teal-600" />
        <span>{activeLang.native_name}</span>
        <span className="text-xs text-slate-400 font-normal">| {activeLang.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search 80+ languages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 placeholder-slate-400"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
            {filteredLanguages.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">No language found</div>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = lang.code === currentLanguage;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onSelectLanguage(lang);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50/60 transition-colors flex items-center justify-between group ${
                      isSelected ? 'bg-teal-50/80 font-semibold text-teal-900' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{lang.native_name}</span>
                        <span className="text-xs text-slate-500 font-normal">({lang.name})</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 bg-slate-100 rounded text-slate-500 font-mono">
                          {lang.code}
                        </span>
                        {lang.interface_supported ? (
                          <span className="text-[10px] text-teal-700 font-medium">UI Translated</span>
                        ) : (
                          <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                            <AlertCircle className="w-2.5 h-2.5" /> AI Content Only
                          </span>
                        )}
                        {lang.dir === 'rtl' && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded">RTL</span>
                        )}
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
