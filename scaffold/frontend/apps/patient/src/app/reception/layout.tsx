"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import RoleHeader from "@/components/RoleHeader";

const TABS = [
  { label: "Intake", href: "/reception" },
  { label: "Queue Board", href: "/reception/queue" },
  { label: "Appointments", href: "/reception/appointments" },
];

export default function ReceptionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#F8F7F4] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F9FAFB] flex flex-col font-sans">
      <RoleHeader currentRole="receptionist" badgeCode="01 // RECEPTION & TRIAGE" />
      {/* Sub-Navigation Tabs */}
      <div className="sticky top-16 z-30 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1F2937] px-6">
        <nav className="max-w-7xl mx-auto flex items-center gap-1">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-3 text-xs font-bold transition-colors border-b-2 ${
                  isActive
                    ? "border-[#0F172A] dark:border-white text-[#0F172A] dark:text-white"
                    : "border-transparent text-[#64748B] dark:text-gray-400 hover:text-[#0F172A] dark:hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}