"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: "patient" | "doctor" | "receptionist";
  is_verified: boolean;
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
