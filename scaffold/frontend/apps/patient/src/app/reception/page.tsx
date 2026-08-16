"use client";

import { useEffect } from "react";

export default function ReceptionRedirectPage() {
  useEffect(() => {
    window.location.href = "http://localhost:5173";
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0A0B0D] text-[#E8EAED]">
      <div className="p-8 max-w-md text-center border border-[#252830] bg-[#161920] rounded-xl space-y-4 shadow-xl">
        <h1 className="text-xl font-bold font-sans">Redirecting to Reception Portal...</h1>
        <p className="text-sm text-gray-400">
          The Reception Portal runs on port <span className="font-mono text-white font-semibold">5173</span>.
        </p>
        <a
          href="http://localhost:5173"
          className="inline-block px-5 py-2.5 rounded-lg bg-[#6C8AFF] text-white font-semibold text-sm hover:bg-[#8BA4FF] transition-colors"
        >
          Open Reception Portal (Port 5173) &rarr;
        </a>
      </div>
    </div>
  );
}
