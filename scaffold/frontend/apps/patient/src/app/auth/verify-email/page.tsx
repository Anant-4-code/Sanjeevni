"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

// ── Role display helper ───────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  patient:      "Patient",
  doctor:       "Doctor",
  receptionist: "Receptionist",
  pharmacist:   "Pharmacist",
  lab_tech:     "Lab Technician",
  admin:        "Administrator",
};

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email      = searchParams?.get("email") || "your registered email address";
  const role       = searchParams?.get("role")  || "patient";
  const isOffline  = searchParams?.get("mode")  === "offline";

  const supabase   = createClient();
  const [resent, setResent]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleResend() {
    setLoading(true);
    setError("");
    setResent(false);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (resendError) {
        if (resendError.message.includes("Failed to fetch") || resendError.message.includes("NetworkError")) {
          setError("Unable to reach server. Check your internet connection and try again.");
        } else {
          setError(resendError.message);
        }
      } else {
        setResent(true);
      }
    } catch (err: any) {
      if (err?.message?.includes("Failed to fetch") || err?.name === "TypeError") {
        setError("Network unavailable. Please check your connection.");
      } else {
        setError(err.message || "Could not resend verification email.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F7F5F0] text-[#0A0A0A] px-4 py-12">
      <div className="w-full max-w-md border border-[#D8D5CC] bg-white p-8 space-y-6 shadow-sm">

        {/* Index label */}
        <div className="text-[10px] font-mono tracking-[0.2em] text-[#64748B] uppercase">
          03 // Verification Instructions
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
            isOffline ? "border-amber-400 bg-amber-50" : "border-[#D8D5CC] bg-[#F7F5F0]"
          }`}>
            {isOffline ? (
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )}
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            {isOffline ? "Offline Mode" : "Check Your Email"}
          </h1>

          {isOffline ? (
            <div className="text-xs text-[#64748B] leading-relaxed space-y-2">
              <p>
                <strong className="text-amber-700">Network unreachable</strong> — Supabase could not be contacted.
                Your form data was received, but the account may not have been created in the database.
              </p>
              <p>
                Registered as: <strong className="text-[#0A0A0A]">{email}</strong> ({ROLE_LABELS[role] || role})
              </p>
              <p>Once you're back online, you can try registering again or sign in if the account was created.</p>
            </div>
          ) : (
            <p className="text-xs text-[#64748B] leading-relaxed">
              We sent a verification link to{" "}
              <strong className="text-[#0A0A0A] font-bold">{email}</strong>.{" "}
              Check your inbox (and spam folder) and click the link to activate your{" "}
              <strong className="text-[#0A0A0A]">{ROLE_LABELS[role] || role}</strong> account.
            </p>
          )}
        </div>

        {/* Role notice for staff */}
        {!isOffline && role !== "patient" && (
          <div className="p-3 border border-amber-300 bg-amber-50 text-amber-800 text-[10px] font-mono leading-relaxed">
            NOTICE // Staff role <strong>{ROLE_LABELS[role] || role}</strong> requires administrator approval before portal access is granted.
            You will receive a second email once your credentials are approved.
          </div>
        )}

        {/* Success banner */}
        {resent && (
          <div className="p-3 border border-emerald-400 bg-emerald-50 text-emerald-800 text-[10px] font-mono">
            STATUS // Verification link resent. Check your inbox — if it doesn't arrive within 2 minutes, check your spam folder.
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="p-3 border border-red-400 bg-red-50 text-red-800 text-[10px] font-mono">
            ERROR // {error}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-1">
          {!isOffline && (
            <button
              id="resend-link-btn"
              onClick={handleResend}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#0A0A0A] py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#0A0A0A] hover:text-[#F7F5F0] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Sending…
                </>
              ) : "Resend Verification Link"}
            </button>
          )}

          {isOffline && (
            <Link
              href="/register"
              className="block text-center w-full py-3 text-xs font-bold uppercase tracking-widest rounded-full bg-[#0A0A0A] text-[#F7F5F0] hover:opacity-90 transition-opacity"
            >
              Try Registering Again
            </Link>
          )}

          <Link
            href="/login"
            id="back-to-login-link"
            className="block text-center text-xs font-bold uppercase tracking-widest text-[#64748B] hover:text-[#0A0A0A] underline underline-offset-2 pt-1 transition-colors"
          >
            ← Back to Sign In
          </Link>
        </div>

        {/* Help text */}
        {!isOffline && (
          <p className="text-[10px] text-[#94A3B8] font-mono text-center">
            Didn't receive it? Check your spam folder, or wait 2–3 minutes before requesting a new link.
          </p>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0]">
        <p className="text-[10px] font-mono text-[#64748B] uppercase tracking-widest">Loading…</p>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
