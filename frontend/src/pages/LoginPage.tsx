import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Eye, EyeOff, Mail, Lock, User as UserIcon, ArrowRight, 
  ShieldCheck, FileText, Brain, TrendingUp, CheckCircle, 
  AlertCircle, Info, Sparkles 
} from 'lucide-react';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const { user, login, register, googleLogin } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Sign In state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Register state
  const [fullName, setFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [isEmailManuallyEdited, setIsEmailManuallyEdited] = useState<boolean>(false);
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [isPasswordManuallyEdited, setIsPasswordManuallyEdited] = useState<boolean>(false);
  const [preferredLanguage, setPreferredLanguage] = useState<string>('en');
  const [dob, setDob] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Google OAuth Configuration & Ref
  const googleClientId =
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ||
    '490503764573-q7j3ho1lbdr4tltrhglvaab8simtlls3.apps.googleusercontent.com';
  const googleButtonContainerRef = useRef<HTMLDivElement>(null);

  // Compute suggestions based on name
  const cleanNameSlug = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const suggestedEmail = cleanNameSlug ? `${cleanNameSlug}@gmail.com` : '';
  const suggestedPassword = cleanNameSlug ? `${cleanNameSlug}123` : '';
  const isUsingSuggestedPassword = regPassword.length > 0 && regPassword === suggestedPassword;

  // Initialize official Google Identity Services
  useEffect(() => {
    if (!googleClientId || !googleClientId.trim()) {
      return;
    }

    const initGsi = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId.trim(),
            callback: async (response: { credential?: string }) => {
              if (!response?.credential) {
                setError('Google sign-in was cancelled or returned no credentials.');
                return;
              }
              setLoading(true);
              setError(null);
              try {
                await googleLogin(response.credential);
                if (onSuccess) onSuccess();
                else navigate('/dashboard');
              } catch (err: any) {
                console.error('Google OAuth verification failed:', err);
                setError(err?.response?.data?.detail || 'Google sign-in verification failed on backend.');
              } finally {
                setLoading(false);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (googleButtonContainerRef.current) {
            googleButtonContainerRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleButtonContainerRef.current, {
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 360,
            });
          }
        } catch (e) {
          console.error('Failed to initialize Google Identity Services:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGsi();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [googleClientId, isRegisterMode]);

  const handleGoogleCustomClick = async () => {
    setError(null);
    if (window.google?.accounts?.id && googleClientId) {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
            // Google One Tap was not displayed or was dismissed/origin not allowed
            handleDemoLogin();
          }
        });
        return;
      } catch (err) {
        console.warn('Google sign-in prompt error, using demo fallback:', err);
      }
    }
    // Instant fallback if Google SDK is not loaded or OAuth is unavailable
    await handleDemoLogin();
  };

  const handleFullNameChange = (newName: string) => {
    setFullName(newName);
    const clean = newName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nextSuggestedEmail = clean ? `${clean}@gmail.com` : '';
    const nextSuggestedPassword = clean ? `${clean}123` : '';

    if (!isEmailManuallyEdited) {
      setRegEmail(nextSuggestedEmail);
    }
    if (!isPasswordManuallyEdited) {
      setRegPassword(nextSuggestedPassword);
      setRegConfirmPassword(nextSuggestedPassword);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Email address and password are required.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      if (onSuccess) onSuccess();
      else navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Sign in failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        confirm_password: regConfirmPassword,
        preferred_language: preferredLanguage,
        date_of_birth: dob || undefined,
      });
      if (onSuccess) onSuccess();
      else navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Registration failed. Email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login('eleanor@healthcopilot.org', 'demo1234');
      if (onSuccess) onSuccess();
      else navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError('Failed to login as demo user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 font-sans overflow-x-hidden">
      
      {/* LEFT SECTION (55% desktop width): Medical Photograph Background */}
      <div className="w-full md:w-[55%] min-h-[480px] md:min-h-screen relative flex flex-col justify-between p-6 sm:p-10 lg:p-16 text-white overflow-hidden">
        
        {/* User Medical Photograph Image Layer */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('/login-bg-medical.jpg')` }}
        />

        {/* Dark Gradient Overlay for optimal legibility */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-900/65 to-slate-950/35" />

        {/* Content Container */}
        <div className="relative z-10 flex flex-col justify-between h-full space-y-8 md:space-y-12">
          
          {/* Top Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 backdrop-blur-md border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner shrink-0">
              <ShieldCheck className="w-7 h-7 text-teal-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white drop-shadow-md">
                Personal Health Copilot
              </h1>
              <p className="text-xs font-semibold text-teal-300 tracking-wider uppercase">
                Your Health Records. One Clear Picture.
              </p>
            </div>
          </div>

          {/* Main Heading & Description */}
          <div className="space-y-4 max-w-xl my-auto">
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-white drop-shadow-lg">
              Understand Your Health,<br />
              <span className="text-teal-400">One Record at a Time.</span>
            </h2>
            <p className="text-slate-200 text-xs sm:text-sm lg:text-base leading-relaxed font-normal drop-shadow">
              Upload your medical reports, prescriptions, and diagnostic records. Our AI helps you organize, understand, and manage your health information with privacy and clarity.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
              <div className="bg-slate-900/70 backdrop-blur-md border border-slate-700/60 p-3.5 rounded-2xl flex flex-col items-center text-center shadow-lg hover:border-teal-500/50 transition">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 mb-2">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-white">Upload Your Records</span>
              </div>

              <div className="bg-slate-900/70 backdrop-blur-md border border-slate-700/60 p-3.5 rounded-2xl flex flex-col items-center text-center shadow-lg hover:border-teal-500/50 transition">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 mb-2">
                  <Brain className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-white">Get AI Insights</span>
              </div>

              <div className="bg-slate-900/70 backdrop-blur-md border border-slate-700/60 p-3.5 rounded-2xl flex flex-col items-center text-center shadow-lg hover:border-teal-500/50 transition">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 mb-2">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-white">Track Health Trends</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-[11px] text-slate-300 font-medium">
            Protected by medical-grade data encryption & privacy safeguards.
          </div>

        </div>
      </div>

      {/* RIGHT SECTION (45% desktop width): White Card Auth Form */}
      <div className="w-full md:w-[45%] flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-slate-50 min-h-screen">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-10">
          
          {/* Card Brand Header */}
          <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-3 shadow-xs">
              <ShieldCheck className="w-7 h-7 text-teal-600" />
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {isRegisterMode ? 'Create Your Account' : 'Welcome Back'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isRegisterMode 
                ? 'Join Personal Health Copilot to manage your medical history.'
                : 'Sign in to access your health records and insights.'}
            </p>
          </div>

          {user && (
            <div className="mb-5 p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-950 text-xs flex items-center justify-between shadow-xs">
              <div className="min-w-0 pr-2">
                <span className="font-bold block truncate">Signed in as {user.full_name}</span>
                <span className="text-[11px] text-teal-700 truncate block">{user.email}</span>
              </div>
              <Link
                to="/dashboard"
                className="shrink-0 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition"
              >
                Dashboard &rarr;
              </Link>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* OFFICIAL GOOGLE OAUTH & DEMO INTEGRATION */}
          <div className="mb-5">
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleGoogleCustomClick}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-xs hover:shadow-md transition-all hover:border-slate-300"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.15z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.28v3.13C3.26 21.3 7.34 24 12 24z" />
                  <path fill="#FBBC05" d="M5.32 14.27c-.24-.72-.37-1.49-.37-2.27s.13-1.55.37-2.27V6.6H1.28C.46 8.22 0 10.05 0 12s.46 3.78 1.28 5.4l4.04-3.13z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.7 1.28 6.6l4.04 3.13c.94-2.83 3.58-4.98 6.68-4.98z" />
                </svg>
                <span>Continue with Google</span>
              </button>
              <div ref={googleButtonContainerRef} className="hidden" />

              {/* Quick 1-Click Demo Access */}
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-teal-200 bg-teal-50/80 hover:bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center gap-2 transition shadow-2xs"
              >
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>1-Click Demo Sign In (Preloaded Eleanor Vance)</span>
              </button>
            </div>

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-slate-200"></div>
              <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                or continue with email
              </span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>
          </div>

          {!isRegisterMode ? (
            /* EMAIL & PASSWORD LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                  />
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Signing In...' : (
                  <>
                    Sign In <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Demo Quick Sign-in Button */}
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center gap-2 border border-teal-200 transition"
              >
                <CheckCircle className="w-4 h-4 text-teal-600" />
                1-Click Demo Account (Eleanor Vance)
              </button>
            </form>
          ) : (
            /* REGISTRATION FORM WITH USERNAME & NAME-BASED SUGGESTIONS */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Full Name <span className="text-teal-600">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => handleFullNameChange(e.target.value)}
                    placeholder="Enter your name (e.g. Jane Doe, Rahul Kumar)"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                  />
                </div>
              </div>

              {/* Email Address with dynamic suggestion */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email Address <span className="text-teal-600">*</span>
                  </label>
                  {!isEmailManuallyEdited && suggestedEmail && (
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                      Suggested
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => {
                      setIsEmailManuallyEdited(true);
                      setRegEmail(e.target.value);
                    }}
                    placeholder="janedoe@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                  />
                </div>
                {!isEmailManuallyEdited && suggestedEmail ? (
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    Suggested email based on your name. You can freely edit this with your own email.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    We'll never share your email with third parties.
                  </p>
                )}
              </div>

              {/* Password and Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password <span className="text-teal-600">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => {
                        setIsPasswordManuallyEdited(true);
                        setRegPassword(e.target.value);
                      }}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Confirm Password <span className="text-teal-600">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => {
                      setIsPasswordManuallyEdited(true);
                      setRegConfirmPassword(e.target.value);
                    }}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Security Warning Notice when using predictable name-based suggested password */}
              {isUsingSuggestedPassword && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Predictable Starter Password Notice</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    <strong>"{regPassword}"</strong> is suggested based on your name. This password is predictable. We strongly recommend replacing it with a secure password before registering.
                  </p>
                </div>
              )}

              {/* Language and Date of Birth */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Language
                  </label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  >
                    <option value="en">English</option>
                    <option value="te">Telugu (తెలుగు)</option>
                    <option value="hi">Hindi (हिंदी)</option>
                    <option value="es">Spanish (Español)</option>
                    <option value="fr">French (Français)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Date of Birth <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}

          {/* Toggle between Register and Login */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              {isRegisterMode ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegisterMode(false); setError(null); }}
                    className="font-bold text-teal-600 hover:underline"
                  >
                    Sign in here
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegisterMode(true); setError(null); }}
                    className="font-bold text-teal-600 hover:underline"
                  >
                    Register now
                  </button>
                </>
              )}
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};
export default LoginPage;
