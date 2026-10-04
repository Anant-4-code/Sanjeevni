"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Status = "verifying" | "success" | "error";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus]   = useState<Status>("verifying");
  const [message, setMessage] = useState("Authenticating your verification token…");

  useEffect(() => {
    const supabase = createClient();

    async function handleCallback() {
      try {
        // Supabase puts the token in the URL hash (#access_token=…&type=signup)
        // getSession() automatically exchanges the hash token on first call.
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error.message);
          setStatus("error");
          setMessage(error.message || "Verification failed. The link may be expired or already used.");
          return;
        }

        if (data?.session) {
          const userMeta = data.session.user?.user_metadata || {};
          const role = userMeta.role || "patient";
          const homeMap: Record<string, string> = {
            patient: "/dashboard",
            doctor: "/doctor",
            receptionist: "/reception",
            pharmacist: "/pharmacy",
            lab_tech: "/lab",
            admin: "/doctor",
          };
          const targetUrl = homeMap[role] || "/dashboard";

          // Sync session to localStorage and Edge middleware cookie
          try {
            document.cookie = `sanjeevani_session_role=${role}; path=/; SameSite=Strict`;
            localStorage.setItem(
              "sanjeevani_user_session",
              JSON.stringify({
                id: data.session.user.id,
                full_name: userMeta.full_name || data.session.user.email?.split("@")[0] || "User",
                email: data.session.user.email,
                phone: userMeta.phone || "",
                role: role,
                is_verified: true,
              })
            );
          } catch {}

          setStatus("success");
          setMessage(`Your email has been verified! Redirecting to your ${role.replace("_", " ")} workspace…`);
          setTimeout(() => router.replace(targetUrl), 1500);
        } else {
          // No session yet — might be an offline/dev-mode redirect
          const params = new URLSearchParams(window.location.search);
          if (params.get("mode") === "offline") {
            setStatus("success");
            setMessage("Running in offline development mode. Redirecting to dashboard…");
            setTimeout(() => router.replace("/dashboard"), 1500);
          } else {
            setStatus("error");
            setMessage("No active session found. The link may be expired or already used. Please register again or request a new link.");
          }
        }
      } catch (err: any) {
        console.error("Unexpected callback error:", err);
        setStatus("error");
        setMessage("An unexpected error occurred while verifying your email.");
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F7F5F0] text-[#0A0A0A] px-4 py-12">
      <div className="w-full max-w-md border border-[#D8D5CC] bg-white p-8 space-y-6 shadow-sm text-center">

        {/* Index label */}
        <div className="text-[10px] font-mono tracking-[0.2em] text-[#64748B] uppercase">
          04 — Email Verification
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
            status === "verifying" ? "border-[#D8D5CC] bg-[#F7F5F0]" :
            status === "success"   ? "border-emerald-400 bg-emerald-50" :
                                     "border-red-400 bg-red-50"
          }`}>
            {status === "verifying" && (
              <span className="w-7 h-7 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin block" />
            )}
            {status === "success" && (
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === "error" && (
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="font-display text-xl font-black uppercase tracking-tight">
            {status === "verifying" ? "Verifying…" :
             status === "success"   ? "Email Verified!" :
                                      "Verification Failed"}
          </h1>
          <p className="text-xs text-[#64748B] leading-relaxed max-w-xs mx-auto">
            {message}
          </p>
        </div>

        {/* Error actions */}
        {status === "error" && (
          <div className="space-y-3 pt-2">
            <a
              href="/register"
              className="block w-full py-3 text-xs font-bold uppercase tracking-widest rounded-full bg-[#0A0A0A] text-[#F7F5F0] hover:opacity-90 transition-opacity"
            >
              Register Again
            </a>
            <a
              href="/login"
              className="block text-xs font-bold uppercase tracking-widest text-[#64748B] hover:text-[#0A0A0A] underline underline-offset-2 transition-colors"
            >
              ← Back to Sign In
            </a>
          </div>
        )}

        {/* Success auto-redirect indicator */}
        {status === "success" && (
          <div className="pt-2">
            <div className="h-1 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full animate-[grow_1.8s_linear_forwards]" style={{ width: "0%" }} />
            </div>
            <p className="text-[10px] font-mono text-[#64748B] mt-2">Redirecting to dashboard…</p>
          </div>
        )}
      </div>
    </div>
  );
}
