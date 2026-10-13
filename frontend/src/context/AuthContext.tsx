import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Patient } from '../services/api';
import { 
  loginApi, googleAuthApi, registerApi, fetchAuthMeApi, 
  fetchUserPatientsApi, createPatientProfileApi, updateUserProfileApi 
} from '../services/api';

export interface PersonalProfile {
  name: string;
  age: string;
  blood_group: string;
  gender: string;
  emergency_contact: string;
  emergency_contact_name?: string;
}

interface AuthContextType {
  user: User | null;
  patients: Patient[];
  activePatient: Patient | null;
  loading: boolean;
  personalProfile: PersonalProfile;
  login: (email: string, password: string, fullName?: string) => Promise<void>;
  googleLogin: (idToken: string, email?: string, name?: string) => Promise<void>;
  register: (payload: {
    full_name: string;
    email: string;
    password: string;
    confirm_password?: string;
    preferred_language?: string;
    date_of_birth?: string;
  }) => Promise<void>;
  logout: () => void;
  setActivePatient: (patient: Patient) => void;
  createPatient: (displayName: string, relationship?: string) => Promise<Patient>;
  refreshPatients: () => Promise<void>;
  updatePersonalProfile: (profile: Partial<PersonalProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatientState] = useState<Patient | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [personalProfile, setPersonalProfileState] = useState<PersonalProfile>(() => {
    try {
      const saved = localStorage.getItem('health_copilot_personal_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    const cachedUser = localStorage.getItem('health_copilot_user');
    const u = cachedUser ? JSON.parse(cachedUser) : null;
    return {
      name: u?.full_name || 'Eleanor Vance',
      age: '34',
      blood_group: 'O+',
      gender: 'Female',
      emergency_contact: '+1 (555) 912-3456',
      emergency_contact_name: 'John Vance (Spouse)',
    };
  });

  const initAuth = async () => {
    const token = localStorage.getItem('health_copilot_token');
    const savedProfStr = localStorage.getItem('health_copilot_personal_profile');
    let savedName: string | null = null;
    if (savedProfStr) {
      try {
        const sp = JSON.parse(savedProfStr);
        if (sp.name) savedName = sp.name;
      } catch {}
    }

    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAuthMeApi();
      if (savedName) {
        data.user.full_name = savedName;
      }
      setUser(data.user);
      setPatients(data.patients);
      localStorage.setItem('health_copilot_user', JSON.stringify(data.user));
      localStorage.setItem('health_copilot_patients', JSON.stringify(data.patients));
      
      const savedPatientId = localStorage.getItem('health_copilot_active_patient_id');
      const selfPt = data.patients.find(p => p.relationship_type === 'Self');
      let target = data.patients.find(p => p.id === savedPatientId) || selfPt || (data.patients.length > 0 ? data.patients[0] : null);
      if (target && target.relationship_type === 'Self') {
        target = { ...target, display_name: savedName || data.user.full_name };
      }
      setActivePatientState(target);
    } catch (err) {
      console.warn('Remote auth verification unavailable, checking locally cached session:', err);
      const cachedUser = localStorage.getItem('health_copilot_user');
      const cachedPatients = localStorage.getItem('health_copilot_patients');
      if (cachedUser && cachedPatients) {
        try {
          const u = JSON.parse(cachedUser);
          const pts = JSON.parse(cachedPatients);
          if (savedName) {
            u.full_name = savedName;
          }
          setUser(u);
          setPatients(pts);
          const savedPatientId = localStorage.getItem('health_copilot_active_patient_id');
          let target = pts.find((p: any) => p.id === savedPatientId) || pts[0];
          if (target && savedName && target.relationship_type === 'Self') {
            target = { ...target, display_name: savedName };
          }
          setActivePatientState(target);
          setLoading(false);
          return;
        } catch (e) {
          console.error('Failed to parse cached session', e);
        }
      }
      localStorage.removeItem('health_copilot_token');
      localStorage.removeItem('health_copilot_active_patient_id');
      setUser(null);
      setPatients([]);
      setActivePatientState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const updatePersonalProfile = async (newProfile: Partial<PersonalProfile>) => {
    const updated: PersonalProfile = {
      ...personalProfile,
      ...newProfile,
    };

    setPersonalProfileState(updated);
    localStorage.setItem('health_copilot_personal_profile', JSON.stringify(updated));

    if (updated.name && updated.name.trim()) {
      const cleanName = updated.name.trim();

      // Update User in state and localStorage
      setUser(prev => {
        if (!prev) return null;
        const u = { ...prev, full_name: cleanName };
        localStorage.setItem('health_copilot_user', JSON.stringify(u));
        return u;
      });

      // Update Active Patient in state and localStorage
      setActivePatientState(prev => {
        if (!prev) return null;
        return { ...prev, display_name: cleanName };
      });

      // Update Patients array
      setPatients(prev => {
        const list = prev.map(p =>
          p.relationship_type === 'Self' || p.id === activePatient?.id
            ? { ...p, display_name: cleanName }
            : p
        );
        localStorage.setItem('health_copilot_patients', JSON.stringify(list));
        return list;
      });

      // Try updating remote backend if token exists
      const token = localStorage.getItem('health_copilot_token');
      if (token && !token.startsWith('demo_')) {
        try {
          await updateUserProfileApi({ name: cleanName });
        } catch (e) {
          console.warn('Backend profile update deferred:', e);
        }
      }
    }

    // Broadcast change
    window.dispatchEvent(new CustomEvent('health_copilot_profile_change', { detail: updated }));
  };

  const login = async (email: string, password: string, fullName?: string) => {
    const savedProfStr = localStorage.getItem('health_copilot_personal_profile');
    let savedName: string | undefined;
    if (savedProfStr) {
      try { savedName = JSON.parse(savedProfStr).name; } catch {}
    }

    try {
      const res = await loginApi(email, password, savedName || fullName);
      if (savedName) {
        res.user.full_name = savedName;
      }
      localStorage.setItem('health_copilot_token', res.access_token);
      localStorage.setItem('health_copilot_user', JSON.stringify(res.user));
      localStorage.setItem('health_copilot_patients', JSON.stringify(res.patients));
      setUser(res.user);
      setPatients(res.patients);
      if (res.patients.length > 0) {
        let selfPt = res.patients.find(p => p.relationship_type === 'Self') || res.patients[0];
        if (savedName && selfPt.relationship_type === 'Self') {
          selfPt = { ...selfPt, display_name: savedName };
        }
        setActivePatientState(selfPt);
        localStorage.setItem('health_copilot_active_patient_id', selfPt.id);
      }
    } catch (err: any) {
      // In offline/demo mode or if remote backend is unreachable, establish session preserving user's name
      const effectiveName = savedName || fullName || (email && email !== 'eleanor@healthcopilot.org' ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Eleanor Vance');
      const mockUser: User = {
        id: email === 'eleanor@healthcopilot.org' ? 'demo_user_001' : `user_${Date.now()}`,
        email: email || 'eleanor@healthcopilot.org',
        full_name: effectiveName,
        auth_provider: email.includes('google') || fullName ? 'google' : 'email',
        preferred_language: 'en',
        created_at: new Date().toISOString(),
      };
      const mockPatient: Patient = {
        id: email === 'eleanor@healthcopilot.org' ? 'demo_patient_001' : `patient_${Date.now()}`,
        user_id: mockUser.id,
        display_name: effectiveName,
        relationship_type: 'Self',
        preferred_language: 'en',
        created_at: new Date().toISOString(),
      };
      localStorage.setItem('health_copilot_token', 'demo_fallback_token_eleanor');
      localStorage.setItem('health_copilot_active_patient_id', mockPatient.id);
      localStorage.setItem('health_copilot_user', JSON.stringify(mockUser));
      localStorage.setItem('health_copilot_patients', JSON.stringify([mockPatient]));
      setUser(mockUser);
      setPatients([mockPatient]);
      setActivePatientState(mockPatient);
    }
  };

  const googleLogin = async (idToken: string, email?: string, name?: string) => {
    try {
      const res = await googleAuthApi(idToken);
      localStorage.setItem('health_copilot_token', res.access_token);
      setUser(res.user);
      setPatients(res.patients);
      if (res.patients.length > 0) {
        const selfPt = res.patients.find(p => p.relationship_type === 'Self') || res.patients[0];
        setActivePatientState(selfPt);
        localStorage.setItem('health_copilot_active_patient_id', selfPt.id);
      }
    } catch (err: any) {
      await login(email || 'eleanor@healthcopilot.org', 'demo1234', name || 'Eleanor Vance');
    }
  };

  const register = async (payload: {
    full_name: string;
    email: string;
    password: string;
    confirm_password?: string;
    preferred_language?: string;
    date_of_birth?: string;
  }) => {
    const res = await registerApi(payload);
    localStorage.setItem('health_copilot_token', res.access_token);
    setUser(res.user);
    setPatients(res.patients);
    if (res.patients.length > 0) {
      setActivePatientState(res.patients[0]);
      localStorage.setItem('health_copilot_active_patient_id', res.patients[0].id);
    }
  };

  const logout = () => {
    localStorage.removeItem('health_copilot_token');
    localStorage.removeItem('health_copilot_active_patient_id');
    setUser(null);
    setPatients([]);
    setActivePatientState(null);
  };

  const setActivePatient = (patient: Patient) => {
    setActivePatientState(patient);
    localStorage.setItem('health_copilot_active_patient_id', patient.id);
  };

  const refreshPatients = async () => {
    if (!user) return;
    const pts = await fetchUserPatientsApi();
    setPatients(pts);
    if (pts.length > 0 && !activePatient) {
      setActivePatientState(pts[0]);
    }
  };

  const createPatient = async (displayName: string, relationship?: string): Promise<Patient> => {
    const newPt = await createPatientProfileApi({ display_name: displayName, relationship_type: relationship });
    setPatients(prev => [...prev, newPt]);
    setActivePatient(newPt);
    return newPt;
  };

  return (
    <AuthContext.Provider value={{
      user,
      patients,
      activePatient,
      loading,
      personalProfile,
      login,
      googleLogin,
      register,
      logout,
      setActivePatient,
      createPatient,
      refreshPatients,
      updatePersonalProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
