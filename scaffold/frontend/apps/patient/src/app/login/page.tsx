"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Stethoscope, User, Activity, Pill, FlaskConical, Shield, ArrowRight, Zap } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const supabase = createClient();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const QUICK_ROLES = [
    {
      role: "doctor",
      label: "Doctor / Physician",
      email: "doctor@sanjeevani.com",
      password: "Sanjeevani@123",
      icon: Stethoscope,
      href: "/doctor",
      color: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
    },
    {
      role: "patient",
      label: "Patient Portal",
      email: "patient@sanjeevani.com",
      password: "Sanjeevani@123",
      icon: Activity,
      href: "/dashboard",
      color: "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100",
    },
    {
      role: "receptionist",
      label: "Reception / Intake",
      email: "receptionist@sanjeevani.com",
      password: "Sanjeevani@123",
      icon: User,
      href: "/reception",
      color: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
    },
    {
      role: "pharmacist",
      label: "Pharmacy Desk",
      email: "pharmacist@sanjeevani.com",
      password: "Sanjeevani@123",
      icon: Pill,
      href: "/pharmacy",
      color: "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100",
    },
    {
      role: "lab_tech",
      label: "Lab Technician",
      email: "lab_tech@sanjeevani.com",
      password: "Sanjeevani@123",
      icon: FlaskConical,
      href: "/lab",
      color: "bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100",
    },
    {
      role: "admin",
      label: "Administrator",
      email: "admin@sanjeevani.com",
      password: "Sanjeevani@123",
      icon: Shield,
      href: "/doctor",
      color: "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200",
    },
  ];

  async function performLogin(targetEmail: string, targetPass: string, forceRole?: string) {
    setError("");
    setLoading(true);

    const cleanEmail = targetEmail.trim().toLowerCase();

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: targetPass,
      });

      let user = data?.user;
      let userRole = forceRole || user?.user_metadata?.role || "patient";
      let fullName = user?.user_metadata?.full_name || (userRole === "doctor" ? "Dr. Nitin Sharma" : "Ramesh Kumar");
      let phone = user?.user_metadata?.phone || "+91 98765 43210";

      // If backend mock mode is needed when offline
      if (authError && cleanEmail.includes("@sanjeevani.com")) {
        // Fallback for fast demo
        const matched = QUICK_ROLES.find((r) => r.email === cleanEmail);
        if (matched) {
          userRole = matched.role;
        }
      } else if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Sync local app auth context session
      login({
        id: user?.id || `user-${userRole}`,
        full_name: fullName,
        email: cleanEmail,
        phone: phone,
        role: userRole as any,
        is_verified: true,
      });

      // Role-based routing within the unified Next.js web application
      switch (userRole) {
        case "doctor":
          router.push("/doctor");
          break;
        case "receptionist":
          router.push("/reception");
          break;
        case "pharmacist":
          router.push("/pharmacy");
          break;
        case "lab_tech":
          router.push("/lab");
          break;
        case "admin":
          router.push("/doctor");
          break;
        case "patient":
        default:
          router.push("/dashboard");
          break;
      }
    } catch (err: any) {
      setError(err.message || "Login authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    await performLogin(email, password);
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F8F7F4] text-[#0F172A] px-4 py-12">
      <div className="w-full max-w-lg border border-[#E2E8F0] bg-white p-8 sm:p-10 rounded-2xl shadow-sm space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <div className="w-7 h-7 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">
              S
            </div>
            <span>SANJEEVANI</span>
          </Link>
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#64748B] uppercase">
            01 // UNIFIED ACCESS
          </span>
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-[#0F172A]">
            Unified Portal Sign In
          </h1>
          <p className="text-xs text-[#64748B]">
            One secure login for Doctors, Patients, Reception, Pharmacy, and Lab Technicians.
          </p>
        </div>

        {/* ── 1-CLICK ROLE QUICK ACCESS ── */}
        <div className="space-y-2.5 p-4 rounded-xl bg-[#F8F7F4] border border-[#E2E8F0]">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#0F172A] font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            1-Click Role Quick Login (Demo Access)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {QUICK_ROLES.map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => {
                  setEmail(r.email);
                  setPassword(r.password);
                  performLogin(r.email, r.password, r.role);
                }}
                disabled={loading}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${r.color}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <r.icon className="w-4 h-4" />
                  <ArrowRight className="w-3 h-3 opacity-60" />
                </div>
                <span className="text-[11px] font-bold leading-tight">{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#E2E8F0]" />
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Or enter email</span>
          <div className="h-px flex-1 bg-[#E2E8F0]" />
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.15em] text-[#64748B] font-bold block">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. doctor@sanjeevani.com"
              required
              className="w-full border border-[#E2E8F0] bg-[#F8F7F4] px-3.5 py-2.5 text-sm rounded-xl focus:outline-none focus:border-[#0F172A] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-[0.15em] text-[#64748B] font-bold block">
                Password
              </label>
              <span className="text-[11px] text-[#64748B] font-mono">
                Default: Sanjeevani@123
              </span>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full border border-[#E2E8F0] bg-[#F8F7F4] px-3.5 py-2.5 text-sm rounded-xl focus:outline-none focus:border-[#0F172A] transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs font-mono text-red-600 font-bold bg-red-50 p-2.5 rounded-lg border border-red-200">
              ERROR // {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F172A] text-white py-3 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
          >
            {loading ? "Authenticating..." : "Sign In to Operations Portal"}
            <span className="text-sm">→</span>
          </button>
        </form>

        <div className="border-t border-[#E2E8F0] pt-4 text-center">
          <p className="text-xs text-[#64748B]">
            Need a patient account?{" "}
            <Link href="/register" className="font-bold text-[#0F172A] underline">
              Register Credentials
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
