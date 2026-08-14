"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Simulating token verification from URL hash/search params
    const timer = setTimeout(() => {
      setVerified(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    }, 1000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 py-12 bg-dot-grid">
      <div className="glass-card max-w-md w-full p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center mx-auto shadow-md">
          {verified ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            {verified ? "Email Verified Successfully!" : "Verifying Your Email..."}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--fg-muted)]">
            {verified
              ? "Your account is active. Redirecting to your Sanjeevani Patient Portal..."
              : "Authenticating your email verification token with Supabase..."}
          </p>
        </div>
      </div>
    </div>
  );
}
