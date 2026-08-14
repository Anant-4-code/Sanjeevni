"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const router = useRouter();
  const supabase = createClient();
  const { login } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      const user = data.user;
      if (user && !user.email_confirmed_at) {
        setError("Email verification required. Please check your inbox and verify your email address.");
        setLoading(false);
        return;
      }

      // Fetch user metadata role
      const userRole = user?.user_metadata?.role || "patient";
      const fullName = user?.user_metadata?.full_name || "User";
      const phone = user?.user_metadata?.phone || "";

      // Sync local app auth context session
      login({
        id: user?.id || "demo-patient",
        full_name: fullName,
        email: cleanEmail,
        phone: phone,
        role: userRole,
        is_verified: true,
      });

      // Role-based routing as specified in guidelines
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
          router.push("/admin");
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

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F7F5F0] text-[#0A0A0A] px-4 py-12">
      <div className="w-full max-w-md border border-[#D8D5CC] bg-white p-8 space-y-6">
        
        {/* Eyebrow eyebrow index label */}
        <div className="text-[10px] font-mono tracking-[0.2em] text-[#64748B] uppercase">
          01 // SYSTEM ACCESS
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            Sign In
          </h1>
          <p className="text-xs text-[#64748B]">
            Provide credentials to enter the Sanjeevani Operations Portal.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.15em] text-[#64748B] font-bold block">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ramesh@sanjeevani.health"
              required
              className="w-full border border-[#D8D5CC] bg-transparent px-3 py-2.5 text-sm rounded-none focus:outline-none focus:border-[#0A0A0A]"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-[0.15em] text-[#64748B] font-bold block">
                Password
              </label>
              <a href="#" className="text-xs text-[#64748B] hover:text-[#0A0A0A] underline">
                Forgot?
              </a>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full border border-[#D8D5CC] bg-transparent px-3 py-2.5 text-sm rounded-none focus:outline-none focus:border-[#0A0A0A]"
            />
          </div>

          {error && (
            <p className="text-xs font-mono text-red-600 font-bold">
              ERROR // {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0A0A0A] text-[#F7F5F0] py-3 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In"}
            <span className="text-sm">→</span>
          </button>
        </form>

        <div className="border-t border-[#D8D5CC] pt-4 text-center">
          <p className="text-xs text-[#64748B]">
            No account yet?{" "}
            <Link href="/register" className="font-bold text-[#0A0A0A] underline">
              Register Credentials
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
