import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { RecordsListPage } from './pages/RecordsListPage';
import { RecordDetailPage } from './pages/RecordDetailPage';
import { TimelinePage } from './pages/TimelinePage';
import { TrendsPage } from './pages/TrendsPage';
import { ProfilePage } from './pages/ProfilePage';
import { InteroperabilityPage } from './pages/InteroperabilityPage';
import { SettingsPage } from './pages/SettingsPage';
import type { LanguageMeta } from './services/api';
import i18n from './i18n';

const ProtectedLayout: React.FC<{
  currentLanguage: string;
  onSelectLanguage: (lang: LanguageMeta) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}> = ({ currentLanguage, onSelectLanguage, sidebarOpen, setSidebarOpen }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-300">Loading Personal Health Copilot...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated: default landing page is the Login Page
  if (!user) {
    // Allow viewing promotional overview if user explicitly requests /landing
    if (location.pathname === '/landing') {
      return <LandingPage />;
    }
    // Default entrypoint '/' and '/login' (plus any other unauthenticated routes) present the Login page
    return <LoginPage />;
  }

  // If authenticated and visiting '/login', redirect directly to dashboard
  if (location.pathname === '/login') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100 selection:bg-teal-500 selection:text-white transition-colors duration-200">
      {/* Left Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <DisclaimerBanner />
        <Header
          currentLanguage={currentLanguage}
          onSelectLanguage={handleSelectLanguageStatic(onSelectLanguage)}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/records" element={<RecordsListPage />} />
            <Route path="/records/:id" element={<RecordDetailPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/interop" element={<InteroperabilityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const handleSelectLanguageStatic = (fn: (lang: LanguageMeta) => void) => fn;

export const AppContent: React.FC = () => {
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
    return localStorage.getItem('health_copilot_lang') || 'en';
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('health_copilot_lang') || 'en';
    if (savedLang) {
      i18n.changeLanguage(savedLang);
    }
  }, []);

  const handleSelectLanguage = (lang: LanguageMeta) => {
    setCurrentLanguage(lang.code);
    localStorage.setItem('health_copilot_lang', lang.code);
    
    document.documentElement.dir = lang.dir || 'ltr';
    document.documentElement.lang = lang.code;

    if (lang.interface_supported) {
      i18n.changeLanguage(lang.code);
    }
  };

  return (
    <BrowserRouter>
      <ProtectedLayout
        currentLanguage={currentLanguage}
        onSelectLanguage={handleSelectLanguage}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
    </BrowserRouter>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
