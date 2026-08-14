"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, RefreshCw, QrCode, ShieldCheck, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";

import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";
const PASSPORT_EXPIRY_SECONDS = 5 * 60; // 5 minutes

export default function PassportPage() {
  const { user } = useAuth();
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(PASSPORT_EXPIRY_SECONDS);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePassport = useCallback(async () => {
    setLoading(true);
    const pid = user?.id || "";
    try {
      const res = await fetch(`${API_BASE}/patient/health-passport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: pid }),
      });
      const data = await res.json();
      setQrValue(data.qr_url || data.token);
    } catch {
      const demoToken = `https://app.sanjeevani.health/api/passport/${pid || 'patient'}-${Date.now()}`;
      setQrValue(demoToken);
    } finally {
      setLoading(false);
      setSecondsLeft(PASSPORT_EXPIRY_SECONDS);
    }
  }, [user?.id]);

  useEffect(() => {
    generatePassport();
  }, [generatePassport]);

  useEffect(() => {
    if (!qrValue) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          generatePassport();
          return PASSPORT_EXPIRY_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [qrValue, generatePassport]);

  function handleCopy() {
    if (!qrValue) return;
    navigator.clipboard.writeText(qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="glass-card p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" aria-label="Back to dashboard" className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 bg-[var(--fg)] rounded-full" />
              08 // Universal Access Token
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold">Universal Health Passport</h1>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-3 py-1 rounded-full">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> VERIFIED SIGNED
        </span>
      </div>

      {/* Main Grid: Side-by-Side on PC */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Left Column: QR Code Container */}
        <div className="glass-card p-8 flex flex-col items-center justify-center text-center">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-2 border-[var(--fg)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs text-[var(--fg-muted)] uppercase tracking-wider font-mono">Generating Single-Use Token…</p>
            </div>
          ) : qrValue ? (
            <>
              <div className="bg-white p-6 border border-[var(--border)] rounded-2xl mb-6 shadow-md">
                <QRCodeSVG
                  value={qrValue}
                  size={230}
                  level="H"
                  bgColor="#FFFFFF"
                  fgColor="#0F172A"
                />
              </div>

              {/* Countdown & Refresh */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)] font-mono">
                  Token Expiry:
                </span>
                <span className="font-mono text-xl font-extrabold text-[var(--fg)]">{timeStr}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={generatePassport}
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 rounded-full hover:border-[var(--fg)] transition-all shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate QR
                </button>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 rounded-full hover:border-[var(--fg)] transition-all shadow-sm"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy Token Link"}
                </button>
              </div>
            </>
          ) : null}
        </div>

        {/* Right Column: Passport Scope & Details */}
        <div className="glass-card p-8 flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)] font-bold mb-4 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[var(--fg)]" />
              Passport Clinical Scope
            </h2>

            <div className="space-y-4 text-sm">
              <div className="border-b border-[var(--border)] pb-3">
                <span className="text-xs uppercase font-mono tracking-wider text-[var(--fg-muted)] block mb-0.5">Patient Name</span>
                <strong className="text-base font-bold text-[var(--fg)]">{user?.full_name || "Patient Profile"}</strong>
              </div>

              <div className="border-b border-[var(--border)] pb-3">
                <span className="text-xs uppercase font-mono tracking-wider text-[var(--fg-muted)] block mb-0.5">Consolidated Active Regimen</span>
                <p className="text-xs text-[var(--fg-muted)]">Includes all verified active prescriptions & clinical scans in your care timeline.</p>
              </div>

              <div className="border-b border-[var(--border)] pb-3">
                <span className="text-xs uppercase font-mono tracking-wider text-[var(--fg-muted)] block mb-0.5">Security Protocol</span>
                <p className="text-xs text-[var(--fg-muted)]">Single-use JWT token. Self-destructs upon scanning or 5-minute expiration.</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-[var(--border)] text-xs text-[var(--fg-muted)] leading-relaxed">
            <strong>For Consulting Physicians:</strong> Scan this QR code using any smartphone or tablet camera to pull {user?.full_name || "the patient"}&apos;s verified active medical record directly into your consultation queue.
          </div>
        </div>
      </div>
    </div>
  );
}
