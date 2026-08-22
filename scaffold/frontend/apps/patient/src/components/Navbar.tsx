"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  FolderArchive,
  Calendar,
  Bell,
  MessageCircle,
  Camera,
  QrCode,
  History,
  Settings,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Layers,
} from "lucide-react";
import { useAuth, UserRole } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutGrid },
  { href: "/vault", label: "Vault", icon: FolderArchive },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/copilot", label: "Copilot", icon: MessageCircle },
  { href: "/scan-otc", label: "OTC Scan", icon: Camera },
  { href: "/passport", label: "Passport", icon: QrCode },
  { href: "/logs", label: "Logs", icon: History },
];

export function Navbar() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user, logout, switchRole } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
    setTheme(current);

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setRoleSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if non-patient route
  const isNonPatientRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/doctor") ||
    pathname.startsWith("/reception") ||
    pathname.startsWith("/pharmacy") ||
    pathname.startsWith("/lab");

  if (isNonPatientRoute) {
    return null;
  }

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }

  const handleRoleSwitch = (role: UserRole) => {
    switchRole(role);
    setRoleSwitcherOpen(false);
    if (role === "doctor") router.push("/doctor");
    else if (role === "receptionist") router.push("/reception");
    else if (role === "pharmacist") router.push("/pharmacy");
    else if (role === "lab_tech") router.push("/lab");
    else router.push("/dashboard");
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1F2937] px-4 sm:px-6 h-16 flex items-center justify-between shadow-xs transition-colors">
      {/* Brand & Badge */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-[#0F172A] dark:text-white">
          <div className="w-8 h-8 rounded-lg bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] flex items-center justify-center font-bold text-sm">
            S
          </div>
          <span className="hidden sm:inline">SANJEEVANI</span>
        </Link>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-bold border border-blue-200 dark:border-blue-800">
          PATIENT CARE PWA
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="hidden lg:flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A]"
                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Switch Portal Dropdown */}
        <div className="relative" ref={roleDropdownRef}>
          <button
            onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#1F2937] hover:bg-gray-50 dark:hover:bg-gray-800 text-[#0F172A] dark:text-white transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="hidden md:inline">Switch Portal</span>
            <ChevronDown className="w-3 h-3 text-[#64748B]" />
          </button>

          {roleSwitcherOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
                Clinical Portals
              </div>
              <div className="space-y-1 mt-1">
                {[
                  { role: "patient", label: "Patient Care Portal", href: "/dashboard" },
                  { role: "doctor", label: "Doctor Workspace", href: "/doctor" },
                  { role: "receptionist", label: "Reception & Triage", href: "/reception" },
                  { role: "pharmacist", label: "Pharmacy Console", href: "/pharmacy" },
                  { role: "lab_tech", label: "Lab Workbench", href: "/lab" },
                ].map((item) => (
                  <button
                    key={item.role}
                    onClick={() => handleRoleSwitch(item.role as UserRole)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 border border-[#E2E8F0] dark:border-[#1F2937] rounded-lg bg-white dark:bg-[#1F2937] hover:bg-gray-50 dark:hover:bg-gray-800 text-[#64748B] dark:text-gray-300 transition-colors"
          title="Toggle light / dark mode"
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 pl-2 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#1F2937] hover:bg-gray-50 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              {user?.full_name?.charAt(0) || "P"}
            </div>
            <span className="text-xs font-bold text-[#0F172A] dark:text-white hidden sm:inline">
              {user?.full_name || "Patient"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] shadow-xl p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="border-b border-[#E2E8F0] dark:border-[#1F2937] pb-2 mb-2">
                <div className="text-xs font-bold text-[#0F172A] dark:text-white">{user?.full_name}</div>
                <div className="text-[11px] text-[#64748B]">{user?.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}