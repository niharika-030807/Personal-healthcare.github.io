import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Patient } from '../services/api';
import { loginApi, googleAuthApi, registerApi, fetchAuthMeApi, fetchUserPatientsApi, createPatientProfileApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  patients: Patient[];
  activePatient: Patient | null;
  loading: boolean;
  login: (email: string, password: string, fullName?: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatientState] = useState<Patient | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const initAuth = async () => {
    const token = localStorage.getItem('health_copilot_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAuthMeApi();
      setUser(data.user);
      setPatients(data.patients);
      
      const savedPatientId = localStorage.getItem('health_copilot_active_patient_id');
      const found = data.patients.find(p => p.id === savedPatientId);
      if (found) {
        setActivePatientState(found);
      } else if (data.patients.length > 0) {
        setActivePatientState(data.patients[0]);
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
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

  const login = async (email: string, password: string, fullName?: string) => {
    const res = await loginApi(email, password, fullName);
    localStorage.setItem('health_copilot_token', res.access_token);
    setUser(res.user);
    setPatients(res.patients);
    if (res.patients.length > 0) {
      setActivePatientState(res.patients[0]);
      localStorage.setItem('health_copilot_active_patient_id', res.patients[0].id);
    }
  };

  const googleLogin = async (idToken: string) => {
    const res = await googleAuthApi(idToken);
    localStorage.setItem('health_copilot_token', res.access_token);
    setUser(res.user);
    setPatients(res.patients);
    if (res.patients.length > 0) {
      setActivePatientState(res.patients[0]);
      localStorage.setItem('health_copilot_active_patient_id', res.patients[0].id);
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
      login,
      googleLogin,
      register,
      logout,
      setActivePatient,
      createPatient,
      refreshPatients,
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
