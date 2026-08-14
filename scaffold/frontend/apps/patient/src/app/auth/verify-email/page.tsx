"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function VerifyEmail() {
  const searchParams = useSearchParams();
  const email = searchParams?.get("email") || "your registered email address";
  const supabase = createClient();
  
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleResend() {
    setLoading(true);
    setError("");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (resendError) {
        setError(resendError.message);
      } else {
        setResent(true);
      }
    } catch (err: any) {
      setError(err.message || "Could not resend email link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F7F5F0] text-[#0A0A0A] px-4 py-12">
      <div className="w-full max-w-md border border-[#D8D5CC] bg-white p-8 space-y-6">
        
        {/* Eyebrow eyebrow index label */}
        <div className="text-[10px] font-mono tracking-[0.2em] text-[#64748B] uppercase">
          03 // VERIFICATION INSTRUCTIONS
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            Check Your Email
          </h1>
          <p className="text-xs text-[#64748B] leading-relaxed">
            We sent a verification link to <strong className="text-[#0A0A0A] font-bold">{email}</strong>.
            Please access your email inbox and click the verification link to activate your Sanjeevani credentials.
          </p>
        </div>

        {resent && (
          <div className="p-3 border border-emerald-500 bg-emerald-50 text-emerald-800 text-xs font-mono">
            STATUS // Verification link resent successfully. Check your spam folder if you do not receive it shortly.
          </div>
        )}

        {error && (
          <div className="p-3 border border-red-500 bg-red-50 text-red-800 text-xs font-mono font-bold">
            ERROR // {error}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button
            onClick={handleResend}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-[#0A0A0A] py-3 text-xs font-bold uppercase tracking-wider hover:bg-[#0A0A0A] hover:text-[#F7F5F0] transition-colors"
          >
            {loading ? "Requesting..." : "Resend Link"}
          </button>

          <Link
            href="/login"
            className="block text-center text-xs font-bold uppercase tracking-wider text-[#64748B] hover:text-[#0A0A0A] pt-2 underline"
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
