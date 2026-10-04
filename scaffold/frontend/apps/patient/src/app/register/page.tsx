"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

// ── Password strength helper ──────────────────────────────────────────────────
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 3) return { score, label: "Fair", color: "bg-yellow-500" };
  return { score, label: "Strong", color: "bg-emerald-500" };
}

// ── Eye icon SVG (no extra dependency) ───────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

// ── Validation helpers ────────────────────────────────────────────────────────
function validatePhone(ph: string): boolean {
  const cleaned = ph.replace(/[\s\-().+]/g, "");
  return /^\d{10,13}$/.test(cleaned);
}

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  // Form fields
  const [fullName, setFullName]       = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [phone, setPhone]             = useState("");
  const [role, setRole]               = useState("patient");

  // UI state
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const pwStrength = getPasswordStrength(password);

  // ── Client-side validation ────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (fullName.trim().length < 2)
      errs.fullName = "Full name must be at least 2 characters.";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = "Enter a valid email address.";

    if (password.length < 8)
      errs.password = "Password must be at least 8 characters.";

    if (password !== confirmPw)
      errs.confirmPw = "Passwords do not match.";

    if (!validatePhone(phone))
      errs.phone = "Enter a valid 10–13 digit phone number (e.g. +91 98765 43210).";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit handler ─────────────────────────────────────────────────────────
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role,
          },
        },
      });

      if (signUpError) {
        // Map common Supabase error codes to friendly messages
        if (signUpError.message.includes("already registered") || signUpError.message.includes("User already registered")) {
          setError("An account with this email already exists. Please sign in instead.");
        } else if (signUpError.message.includes("Password should be")) {
          setError("Password is too weak — use at least 8 characters with a mix of letters and numbers.");
        } else if (signUpError.message.includes("rate limit") || signUpError.message.includes("too many")) {
          setError("Too many signup attempts. Please wait a few minutes and try again.");
        } else {
          setError(signUpError.message);
        }
      } else {
        // Success → verification page
        router.push(`/auth/verify-email?email=${encodeURIComponent(cleanEmail)}&role=${encodeURIComponent(role)}`);
      }
    } catch (err: any) {
      // Network error (no internet / Supabase unreachable) → offline dev mode
      if (
        err?.message?.includes("Failed to fetch") ||
        err?.name === "TypeError" ||
        err?.message?.includes("NetworkError")
      ) {
        router.push(
          `/auth/verify-email?email=${encodeURIComponent(cleanEmail)}&role=${encodeURIComponent(role)}&mode=offline`
        );
        return;
      }
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Field class helpers ────────────────────────────────────────────────────
  const inputBase =
    "w-full border bg-white px-3 py-2.5 text-sm rounded-none focus:outline-none transition-colors";
  const inputClass = (field: string) =>
    fieldErrors[field]
      ? `${inputBase} border-red-400 focus:border-red-600`
      : `${inputBase} border-[#D8D5CC] focus:border-[#0A0A0A]`;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F7F5F0] text-[#0A0A0A] px-4 py-12">
      <div className="w-full max-w-md border border-[#D8D5CC] bg-white p-8 space-y-6 shadow-sm">

        {/* Index label */}
        <div className="text-[10px] font-mono tracking-[0.2em] text-[#64748B] uppercase">
          02 // User Registration
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            Create Account
          </h1>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Register your credentials for the Sanjeevani Clinical Operations platform.
          </p>
        </div>

        {/* Form-level error */}
        {error && (
          <div className="flex items-start gap-2 p-3 border border-red-400 bg-red-50 rounded-sm">
            <span className="text-red-500 mt-0.5 text-sm">⚠</span>
            <p className="text-xs font-mono text-red-700 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignup} noValidate className="space-y-4">

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-[0.15em] text-[#64748B] font-bold block">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="reg-fullname"
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setFieldErrors(p => ({ ...p, fullName: "" })); }}
              placeholder="e.g. Ramesh Kumar"
              autoComplete="name"
              className={inputClass("fullName")}
            />
            {fieldErrors.fullName && (
              <p className="text-[10px] text-red-600 font-mono">{fieldErrors.fullName}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-[0.15em] text-[#64748B] font-bold block">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: "" })); }}
              placeholder="e.g. ramesh@sanjeevani.health"
              autoComplete="email"
              className={inputClass("email")}
            />
            {fieldErrors.email && (
              <p className="text-[10px] text-red-600 font-mono">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-[0.15em] text-[#64748B] font-bold block">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: "" })); }}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                className={`${inputClass("password")} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0A0A0A] transition-colors"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPw} />
              </button>
            </div>
            {/* Strength bar */}
            {password.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i <= pwStrength.score ? pwStrength.color : "bg-[#E2E8F0]"
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-[10px] font-mono ${
                  pwStrength.score <= 1 ? "text-red-600" :
                  pwStrength.score <= 3 ? "text-yellow-700" : "text-emerald-700"
                }`}>
                  Strength: {pwStrength.label}
                  {pwStrength.score < 3 && " — add numbers, uppercase & symbols"}
                </p>
              </div>
            )}
            {fieldErrors.password && (
              <p className="text-[10px] text-red-600 font-mono">{fieldErrors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-[0.15em] text-[#64748B] font-bold block">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="reg-confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => { setConfirmPw(e.target.value); setFieldErrors(p => ({ ...p, confirmPw: "" })); }}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className={`${inputClass("confirmPw")} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0A0A0A] transition-colors"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {/* Match indicator */}
            {confirmPw.length > 0 && (
              <p className={`text-[10px] font-mono ${password === confirmPw ? "text-emerald-700" : "text-red-600"}`}>
                {password === confirmPw ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}
            {fieldErrors.confirmPw && (
              <p className="text-[10px] text-red-600 font-mono">{fieldErrors.confirmPw}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-[0.15em] text-[#64748B] font-bold block">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              id="reg-phone"
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setFieldErrors(p => ({ ...p, phone: "" })); }}
              placeholder="e.g. +91 98765 43210"
              autoComplete="tel"
              className={inputClass("phone")}
            />
            {fieldErrors.phone && (
              <p className="text-[10px] text-red-600 font-mono">{fieldErrors.phone}</p>
            )}
          </div>

          {/* Platform Role */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-[0.15em] text-[#64748B] font-bold block">
              Platform Role <span className="text-red-500">*</span>
            </label>
            <select
              id="reg-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-[#D8D5CC] bg-white px-3 py-2.5 text-sm rounded-none focus:outline-none focus:border-[#0A0A0A] transition-colors appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="receptionist">Receptionist</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="lab_tech">Lab Technician</option>
              <option value="admin">Administrator</option>
            </select>
            <p className="text-[10px] text-[#94A3B8] font-mono">
              Staff roles (Doctor, Pharmacist, etc.) require admin approval before activation.
            </p>
          </div>

          {/* Submit */}
          <button
            id="reg-submit"
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0A0A0A] text-[#F7F5F0] py-3 text-xs font-bold uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[#F7F5F0] border-t-transparent rounded-full animate-spin" />
                Registering...
              </>
            ) : (
              <>Create Account <span className="text-base">→</span></>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="border-t border-[#D8D5CC] pt-4 text-center space-y-2">
          <p className="text-xs text-[#64748B]">
            Already registered?{" "}
            <Link href="/login" className="font-bold text-[#0A0A0A] underline underline-offset-2 hover:opacity-70 transition-opacity">
              Sign In Here
            </Link>
          </p>
          <p className="text-[10px] text-[#94A3B8] font-mono">
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
