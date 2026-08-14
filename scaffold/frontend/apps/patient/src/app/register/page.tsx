"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function Signup() {
  const router = useRouter();
  const supabase = createClient();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("patient");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            phone: phone,
            role: role,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        router.push(`/auth/verify-email?email=${encodeURIComponent(cleanEmail)}`);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F7F5F0] text-[#0A0A0A] px-4 py-12">
      <div className="w-full max-w-md border border-[#D8D5CC] bg-white p-8 space-y-6">
        
        {/* Eyebrow eyebrow index label */}
        <div className="text-[10px] font-mono tracking-[0.2em] text-[#64748B] uppercase">
          02 // USER REGISTRATION
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            Create Account
          </h1>
          <p className="text-xs text-[#64748B]">
            Register credentials for the Sanjeevani Clinical Operations platform.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.15em] text-[#64748B] font-bold block">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              required
              className="w-full border border-[#D8D5CC] bg-transparent px-3 py-2.5 text-sm rounded-none focus:outline-none focus:border-[#0A0A0A]"
            />
          </div>

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
            <label className="text-xs uppercase tracking-[0.15em] text-[#64748B] font-bold block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full border border-[#D8D5CC] bg-transparent px-3 py-2.5 text-sm rounded-none focus:outline-none focus:border-[#0A0A0A]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.15em] text-[#64748B] font-bold block">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              required
              className="w-full border border-[#D8D5CC] bg-transparent px-3 py-2.5 text-sm rounded-none focus:outline-none focus:border-[#0A0A0A]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.15em] text-[#64748B] font-bold block">
              Platform Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-[#D8D5CC] bg-transparent px-3 py-2.5 text-sm rounded-none focus:outline-none focus:border-[#0A0A0A]"
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="receptionist">Receptionist</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="lab_tech">Lab Technician</option>
              <option value="admin">Administrator</option>
            </select>
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
            {loading ? "Registering..." : "Create Account"}
            <span className="text-sm">→</span>
          </button>
        </form>

        <div className="border-t border-[#D8D5CC] pt-4 text-center">
          <p className="text-xs text-[#64748B]">
            Already registered?{" "}
            <Link href="/login" className="font-bold text-[#0A0A0A] underline">
              Sign In Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
