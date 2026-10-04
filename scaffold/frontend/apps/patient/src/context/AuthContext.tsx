"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { DoctorInfo, AVAILABLE_DOCTORS } from "@/constants/doctors";
export { AVAILABLE_DOCTORS };
export type { DoctorInfo };

export type UserRole = "patient" | "doctor" | "receptionist" | "pharmacist" | "lab_tech" | "admin";

export type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  is_verified: boolean;
  avatar_url?: string;
  specialty?: string;
  department?: string;
  primary_doctor?: DoctorInfo;
  care_team?: DoctorInfo[];
};

type AuthContextType = {
  user: UserProfile | null;
  login: (profile: Partial<UserProfile>) => void;
  logout: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  switchRole: (role: UserRole) => void;
};

const DEFAULT_USERS: Record<UserRole, UserProfile> = {
  patient: {
    id: "patient-ramesh",
    full_name: "Ramesh Kumar",
    email: "ramesh@example.com",
    phone: "+91 98765 43210",
    role: "patient",
    is_verified: true,
    avatar_url: "",
    primary_doctor: AVAILABLE_DOCTORS[0],
    care_team: [AVAILABLE_DOCTORS[0], AVAILABLE_DOCTORS[2], AVAILABLE_DOCTORS[3]],
  },
  doctor: {
    id: "doc-sharma-1",
    full_name: "Dr. Nitin Sharma",
    email: "doctor@sanjeevani.com",
    phone: "+91 98765 11223",
    role: "doctor",
    specialty: "Internal Medicine & Endocrinology",
    department: "OPD - Room 402",
    is_verified: true,
    avatar_url: "",
  },
  receptionist: {
    id: "rec-priya-1",
    full_name: "Priya Desk",
    email: "receptionist@sanjeevani.com",
    phone: "+91 98765 33445",
    role: "receptionist",
    department: "Main Reception & Triage",
    is_verified: true,
    avatar_url: "",
  },
  pharmacist: {
    id: "pharm-anil-1",
    full_name: "Anil Verma, RPh",
    email: "pharmacy@sanjeevani.com",
    phone: "+91 98765 55667",
    role: "pharmacist",
    department: "Central Pharmacy Counter",
    is_verified: true,
    avatar_url: "",
  },
  lab_tech: {
    id: "lab-suresh-1",
    full_name: "Suresh Pathak",
    email: "lab@sanjeevani.com",
    phone: "+91 98765 77889",
    role: "lab_tech",
    department: "Pathology & Diagnostics Wing",
    is_verified: true,
    avatar_url: "",
  },
  admin: {
    id: "admin-1",
    full_name: "Hospital Administrator",
    email: "admin@sanjeevani.com",
    phone: "+91 98765 99999",
    role: "admin",
    is_verified: true,
    avatar_url: "",
  },
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  updateProfile: () => {},
  switchRole: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // BUG-RBAC-01 FIX: Start as null — never auto-assign any role to unauthenticated visitors
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sanjeevani_user_session");
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate the stored session has a valid role before trusting it
        if (!parsed || !parsed.role || !parsed.id) {
          localStorage.removeItem("sanjeevani_user_session");
          setUser(null);
          return;
        }
        if (!parsed.primary_doctor && parsed.role === "patient") {
          parsed.primary_doctor = AVAILABLE_DOCTORS[0];
        }
        setUser(parsed);
      } else {
        // BUG-RBAC-01 FIX: No stored session → stay null, do NOT seed a doctor session
        setUser(null);
      }
    } catch {
      // Corrupted storage → clear it and stay null
      localStorage.removeItem("sanjeevani_user_session");
      setUser(null);
    }
  }, []);

  // Syncs role to a cookie so Edge middleware can read it (localStorage is not
  // available in the Edge runtime that runs middleware.ts).
  function syncRoleCookie(role: string | null) {
    if (role) {
      document.cookie = `sanjeevani_session_role=${role}; path=/; SameSite=Strict`;
    } else {
      document.cookie = 'sanjeevani_session_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  }

  const login = (profile: Partial<UserProfile>) => {
    const role = profile.role || "patient";
    const template = DEFAULT_USERS[role];
    const nextUser: UserProfile = {
      ...template,
      ...profile,
      id: profile.id || template.id,
      full_name: profile.full_name || template.full_name,
      email: profile.email || template.email,
      role: role,
      is_verified: true,
    };
    setUser(nextUser);
    syncRoleCookie(role);
    try {
      localStorage.setItem("sanjeevani_user_session", JSON.stringify(nextUser));
    } catch {}
  };

  // NOTE: switchRole kept for internal demo use only — will be removed in Sequence 1 middleware step
  const switchRole = (role: UserRole) => {
    const nextUser = DEFAULT_USERS[role];
    setUser(nextUser);
    try {
      localStorage.setItem("sanjeevani_user_session", JSON.stringify(nextUser));
    } catch {}
  };

  // BUG-RBAC-02 FIX: logout truly destroys session, sets user to null, never re-seeds doctor
  const logout = () => {
    setUser(null);
    syncRoleCookie(null);
    try {
      localStorage.removeItem("sanjeevani_user_session");
    } catch {}
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null; // BUG-RBAC-02 FIX: no silent fallback to doctor
      const updated = { ...prev, ...profile };
      try {
        localStorage.setItem("sanjeevani_user_session", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

