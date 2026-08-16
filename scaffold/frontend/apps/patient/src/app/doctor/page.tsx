"use client";

import { useEffect } from "react";

export default function DoctorRedirectPage() {
  useEffect(() => {
    window.location.href = "http://localhost:5174";
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0A0B0D] text-[#E8EAED]">
      <div className="p-8 max-w-md text-center border border-[#252830] bg-[#161920] rounded-xl space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-[#6C8AFF]/10 text-[#6C8AFF] flex items-center justify-center mx-auto text-xl font-bold">
          DR
        </div>
        <h1 className="text-xl font-bold font-sans">Redirecting to Doctor Portal...</h1>
        <p className="text-sm text-gray-400">
          The Physician Command Workspace runs on port <span className="font-mono text-white font-semibold">5174</span>.
        </p>
        <a
          href="http://localhost:5174"
          className="inline-block px-5 py-2.5 rounded-lg bg-[#6C8AFF] text-white font-semibold text-sm hover:bg-[#8BA4FF] transition-colors"
        >
          Open Doctor Portal (Port 5174) &rarr;
        </a>
      </div>
    </div>
  );
}
