import React, { createContext, useContext, useState, useEffect } from "react";

export interface DoctorUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  specialty?: string;
  department?: string;
  access_token: string;
}

interface DoctorAuthContextType {
  user: DoctorUser | null;
  doctorId: string;
  doctorName: string;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
}

const DEFAULT_DOCTOR: DoctorUser = {
  id: "doc-sharma-1",
  full_name: "Dr. Nitin Sharma",
  email: "dr.sharma@sanjeevani.com",
  role: "doctor",
  specialty: "Internal Medicine & Endocrinology",
  department: "Clinical Operations",
  access_token: "doc-jwt-session-token",
};

const DoctorAuthContext = createContext<DoctorAuthContextType>({
  user: DEFAULT_DOCTOR,
  doctorId: DEFAULT_DOCTOR.id,
  doctorName: DEFAULT_DOCTOR.full_name,
  isAuthenticated: true,
  login: async () => true,
  logout: () => {},
});

export const DoctorAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DoctorUser | null>(() => {
    try {
      const saved = localStorage.getItem("sanjeevani_doctor_session");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return DEFAULT_DOCTOR;
  });

  const login = async (email: string, password: string = "doctor123"): Promise<boolean> => {
    const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      const docUser: DoctorUser = {
        id: data.user_id && data.user_id !== "demo-patient" ? data.user_id : (email.includes("rai") ? "doc-rai-1" : "doc-sharma-1"),
        full_name: email.includes("rai") ? "Dr. V. K. Rai" : (email.includes("patel") ? "Dr. S. K. Patel" : "Dr. Nitin Sharma"),
        email: email,
        role: "doctor",
        specialty: email.includes("rai") ? "Cardiology" : "Internal Medicine",
        department: "Clinical Operations",
        access_token: data.access_token || "session-token",
      };

      setUser(docUser);
      localStorage.setItem("sanjeevani_doctor_session", JSON.stringify(docUser));
      return true;
    } catch (e) {
      console.error("Login failed, using offline doctor session:", e);
      setUser(DEFAULT_DOCTOR);
      localStorage.setItem("sanjeevani_doctor_session", JSON.stringify(DEFAULT_DOCTOR));
      return true;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("sanjeevani_doctor_session");
  };

  const doctorId = user?.id || DEFAULT_DOCTOR.id;
  const doctorName = user?.full_name || DEFAULT_DOCTOR.full_name;
  const isAuthenticated = !!user;

  return (
    <DoctorAuthContext.Provider
      value={{
        user,
        doctorId,
        doctorName,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </DoctorAuthContext.Provider>
  );
};

export const useDoctorAuth = () => useContext(DoctorAuthContext);
