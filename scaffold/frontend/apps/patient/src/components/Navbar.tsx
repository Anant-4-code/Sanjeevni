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
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";


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
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("sanjeevani_theme") : null;
    const current = (saved as "light" | "dark") || (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
    setTheme(current);
    document.documentElement.setAttribute("data-theme", current);
    if (current === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
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
    pathname.startsWith("/auth") ||
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
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try { localStorage.setItem("sanjeevani_theme", nextTheme); } catch {}
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1F2937] px-4 sm:px-6 h-16 flex items-center justify-between shadow-xs transition-colors">
      {/* Brand & Badge */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-[#0F172A] dark:text-white">
          <span className="w-8 h-8 rounded-lg bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] flex items-center justify-center font-bold text-sm">
            S
          </span>
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
        {/* Mobile Menu Toggle (BUG-NAV-02) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 border border-[#E2E8F0] dark:border-[#1F2937] rounded-lg bg-white dark:bg-[#1F2937] hover:bg-gray-50 dark:hover:bg-gray-800 text-[#64748B] dark:text-gray-300 transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

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
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              {user?.full_name?.charAt(0) || "P"}
            </span>
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
              <Link
                href="/settings"
                onClick={() => setProfileOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#0F172A] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left mb-1"
              >
                <Settings className="w-4 h-4 text-[#64748B]" />
                <span>Settings &amp; Account</span>
              </Link>
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

      {/* BUG-NAV-02 FIX: Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white/98 dark:bg-[#111827]/98 border-b border-[#E2E8F0] dark:border-[#1F2937] shadow-xl px-4 py-3 lg:hidden z-50 animate-in slide-in-from-top-2">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] mb-2 px-1">All Patient Features</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A]"
                      : "text-[#64748B] hover:text-[#0F172A] hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white border border-[#E2E8F0] dark:border-gray-800"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>

    {/* BUG-NAV-02 FIX: Mobile PWA Bottom Quick Navigation Bar */}
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#111827]/95 border-t border-[#E2E8F0] dark:border-[#1F2937] backdrop-blur-md px-2 py-1 flex items-center justify-around shadow-lg">
      {[
        { href: "/dashboard", label: "Home", icon: LayoutGrid },
        { href: "/vault", label: "Vault", icon: FolderArchive },
        { href: "/copilot", label: "Copilot", icon: MessageCircle },
        { href: "/scan-otc", label: "Scan OTC", icon: Camera },
        { href: "/passport", label: "Passport", icon: QrCode },
      ].map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
              isActive
                ? "text-blue-600 dark:text-blue-400 font-bold"
                : "text-[#64748B] hover:text-[#0F172A] dark:hover:text-white"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
    </>
  );
}