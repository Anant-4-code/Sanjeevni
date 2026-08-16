"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

import { DoctorInfo, AVAILABLE_DOCTORS } from "@/constants/doctors";
export { AVAILABLE_DOCTORS };
export type { DoctorInfo };

export type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: "patient" | "doctor" | "receptionist";
  is_verified: boolean;
  avatar_url?: string;
  primary_doctor?: DoctorInfo;
  care_team?: DoctorInfo[];
};

type AuthContextType = {
  user: UserProfile | null;
  login: (profile: Partial<UserProfile>) => void;
  logout: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
};

const DEFAULT_PATIENT: UserProfile = {
  id: "demo-patient",
  full_name: "Anant",
  email: "anant@example.com",
  phone: "+91 98765 43210",
  role: "patient",
  is_verified: true,
  avatar_url: "",
  primary_doctor: AVAILABLE_DOCTORS[0],
  care_team: [AVAILABLE_DOCTORS[0], AVAILABLE_DOCTORS[2], AVAILABLE_DOCTORS[3]],
};

const AuthContext = createContext<AuthContextType>({
  user: DEFAULT_PATIENT,
  login: () => {},
  logout: () => {},
  updateProfile: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(DEFAULT_PATIENT);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sanjeevani_user_session");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.primary_doctor) {
          parsed.primary_doctor = AVAILABLE_DOCTORS[0];
        }
        if (!parsed.care_team || !Array.isArray(parsed.care_team) || parsed.care_team.length === 0) {
          parsed.care_team = [AVAILABLE_DOCTORS[0], AVAILABLE_DOCTORS[2], AVAILABLE_DOCTORS[3]];
        }
        setUser(parsed);
      } else {
        setUser(DEFAULT_PATIENT);
        localStorage.setItem("sanjeevani_user_session", JSON.stringify(DEFAULT_PATIENT));
      }
    } catch {
      setUser(DEFAULT_PATIENT);
    }
  }, []);

  const login = (profile: Partial<UserProfile>) => {
    const nextUser: UserProfile = {
      id: profile.id || "user-" + Math.random().toString(36).substring(2, 9),
      full_name: profile.full_name || "Patient",
      email: profile.email || "",
      phone: profile.phone || "",
      role: profile.role || "patient",
      is_verified: profile.is_verified ?? true,
      avatar_url: profile.avatar_url || "",
      primary_doctor: profile.primary_doctor || AVAILABLE_DOCTORS[0],
      care_team: profile.care_team || [AVAILABLE_DOCTORS[0], AVAILABLE_DOCTORS[2], AVAILABLE_DOCTORS[3]],
    };
    setUser(nextUser);
    try {
      localStorage.setItem("sanjeevani_user_session", JSON.stringify(nextUser));
    } catch {}
  };

  const logout = () => {
    setUser(DEFAULT_PATIENT);
    try {
      localStorage.setItem("sanjeevani_user_session", JSON.stringify(DEFAULT_PATIENT));
    } catch {}
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return DEFAULT_PATIENT;
      const updated = { ...prev, ...profile };
      try {
        localStorage.setItem("sanjeevani_user_session", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
