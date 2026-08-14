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
  FlaskConical,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  Activity,
  User,
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

const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutGrid },
  { href: "/vault", label: "Vault", icon: FolderArchive },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/logs", label: "Logs", icon: History },
  { href: "/copilot", label: "Copilot", icon: MessageCircle },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (pathname === "/login" || pathname === "/register" || pathname === "/" || pathname?.startsWith("/auth/")) return null;

  const displayUser = mounted ? user : null;
  const firstName = displayUser?.full_name ? displayUser.full_name.split(" ")[0] : "Patient";

  function handleSignOut() {
    logout();
    setProfileOpen(false);
    router.push("/login");
  }

  return (
    <>
      {/* DESKTOP TOP HEADER */}
      <header className="hidden md:block sticky top-0 z-40 px-3 pt-2.5 pb-1" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto glass-panel rounded-2xl px-4 h-14 flex items-center justify-between shadow-sm">
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight flex-shrink-0">
            <span className="w-3 h-3 bg-[var(--fg)] rounded-full shadow-sm" />
            Sanjeevani
          </Link>

          {/* All 8 Main Nav Tabs */}
          <nav className="flex items-center gap-1 xl:gap-1.5 mx-2">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-full transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? "bg-[var(--fg)] text-[var(--bg)] shadow-sm"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-muted)]"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="relative" ref={dropdownRef}>
            {mounted ? (
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-[var(--bg-muted)] transition-colors"
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || "User"}
                    className="w-7 h-7 rounded-full object-cover border border-[var(--border)]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[var(--bg-muted)] flex items-center justify-center font-bold text-[10px]">
                    {user?.full_name ? user.full_name[0].toUpperCase() : "P"}
                  </div>
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
              </button>
            ) : (
              <div className="w-9 h-7 rounded-full bg-[var(--bg-muted)] animate-pulse" />
            )}

            {/* Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 glass-card p-2 rounded-2xl shadow-xl z-50 border border-[var(--border)] space-y-1">
                <div className="px-3 py-2.5 border-b border-[var(--border)] space-y-1">
                  <div className="flex items-center gap-2.5">
                    {displayUser?.avatar_url ? (
                      <img
                        src={displayUser.avatar_url}
                        alt={displayUser.full_name || "User"}
                        className="w-8 h-8 rounded-full object-cover border border-[var(--border)]"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--bg-muted)] flex items-center justify-center font-bold text-xs">
                        {displayUser?.full_name ? displayUser.full_name[0].toUpperCase() : "P"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate">{displayUser?.full_name || "Patient"}</p>
                      <p className="text-[10px] text-[var(--fg-muted)] font-mono truncate">{displayUser?.email || ""}</p>
                    </div>
                  </div>

                  {displayUser?.primary_doctor && (
                    <div className="pt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-[var(--fg-muted)] bg-[var(--bg-muted)]/50 p-1.5 rounded-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="truncate">Dr: <strong>{displayUser.primary_doctor.name}</strong></span>
                    </div>
                  )}
                </div>

                <Link
                  href="/labs"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-[var(--bg-muted)] transition-colors"
                >
                  <FlaskConical className="w-4 h-4 text-[var(--fg-muted)]" />
                  <span>Lab Results</span>
                </Link>

                <Link
                  href="/records"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-[var(--bg-muted)] transition-colors"
                >
                  <FileText className="w-4 h-4 text-[var(--fg-muted)]" />
                  <span>Records Export</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-[var(--bg-muted)] transition-colors"
                >
                  <Settings className="w-4 h-4 text-[var(--fg-muted)]" />
                  <span>Account Settings</span>
                </Link>

                <div className="pt-1 border-t border-[var(--border)]">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAV BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-[var(--border)] flex items-center justify-around z-50 py-1 shadow-lg">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] transition-all ${
                isActive
                  ? "text-[var(--fg)] font-bold scale-105"
                  : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
              }`}
              aria-label={item.label}
            >
              <item.icon className="w-4.5 h-4.5" strokeWidth={isActive ? 2.2 : 1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
