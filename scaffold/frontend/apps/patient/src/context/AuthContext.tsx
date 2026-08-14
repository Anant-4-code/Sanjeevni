"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type DoctorInfo = {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  phone?: string;
  available_hours?: string;
  avatar_url?: string;
};

export type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: "patient" | "doctor" | "receptionist";
  is_verified: boolean;
  avatar_url?: string;
  primary_doctor?: DoctorInfo;
};

type AuthContextType = {
  user: UserProfile | null;
  login: (profile: Partial<UserProfile>) => void;
  logout: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  updateProfile: () => {},
});

export const AVAILABLE_DOCTORS: DoctorInfo[] = [
  {
    id: "doc-1",
    name: "Dr. G. Mithun",
    specialty: "Consultant Neuro Surgeon",
    hospital: "Manikanta Neuro Centre, Kakaji Colony",
    phone: "+91 99899 85777",
    available_hours: "Mon - Sat: 10:00 AM - 02:00 PM, 06:00 PM - 09:00 PM",
    avatar_url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&q=80",
  },
  {
    id: "doc-2",
    name: "Dr. Rajesh Rai",
    specialty: "Chief Neurologist & Stroke Specialist",
    hospital: "Yogana Super Speciality Hospital",
    phone: "+91 98450 12345",
    available_hours: "Mon - Fri: 09:00 AM - 01:00 PM",
    avatar_url: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&q=80",
  },
  {
    id: "doc-3",
    name: "Dr. Ananya Sharma",
    specialty: "Senior Physician & Internal Medicine",
    hospital: "Apollo Clinics & Diagnostic Desk",
    phone: "+91 91234 56780",
    available_hours: "Mon - Sat: 08:30 AM - 04:00 PM",
    avatar_url: "https://images.unsplash.com/photo-1594824813629-d04b9eb970b8?w=150&q=80",
  },
  {
    id: "doc-4",
    name: "Dr. Vikram Patel",
    specialty: "Cardiologist & Preventive Health",
    hospital: "Fortis Escorts Heart Institute",
    phone: "+91 97890 54321",
    available_hours: "Tue - Sun: 11:00 AM - 05:00 PM",
    avatar_url: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&q=80",
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sanjeevani_user_session");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.id === "demo-patient") {
          localStorage.removeItem("sanjeevani_user_session");
          setUser(null);
        } else {
          if (!parsed.primary_doctor) {
            parsed.primary_doctor = AVAILABLE_DOCTORS[0];
          }
          setUser(parsed);
        }
      }
    } catch {}
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
    };
    setUser(nextUser);
    try {
      localStorage.setItem("sanjeevani_user_session", JSON.stringify(nextUser));
    } catch {}
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem("sanjeevani_user_session");
    } catch {}
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
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
