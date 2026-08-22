"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Stethoscope,
  Activity,
  User,
  Pill,
  FlaskConical,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Shield,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useAuth, UserRole } from "@/context/AuthContext";

interface RoleHeaderProps {
  currentRole: "doctor" | "patient" | "receptionist" | "pharmacist" | "lab_tech";
  badgeLabel?: string;
  badgeCode?: string;
}

const ROLE_NAV: Record<string, { label: string; href: string; icon: any; color: string; badge: string }> = {
  doctor: {
    label: "Doctor Portal",
    href: "/doctor",
    icon: Stethoscope,
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    badge: "PHYSICIAN // COMMAND",
  },
  patient: {
    label: "Patient Portal",
    href: "/dashboard",
    icon: Activity,
    color: "bg-blue-50 text-blue-800 border-blue-200",
    badge: "PATIENT // CARE PWA",
  },
  receptionist: {
    label: "Reception Desk",
    href: "/reception",
    icon: User,
    color: "bg-amber-50 text-amber-800 border-amber-200",
    badge: "RECEPTION // TRIAGE",
  },
  pharmacist: {
    label: "Pharmacy Console",
    href: "/pharmacy",
    icon: Pill,
    color: "bg-purple-50 text-purple-800 border-purple-200",
    badge: "PHARMACY // DISPENSARY",
  },
  lab_tech: {
    label: "Lab Workbench",
    href: "/lab",
    icon: FlaskConical,
    color: "bg-cyan-50 text-cyan-800 border-cyan-200",
    badge: "LAB // DIAGNOSTICS",
  },
};

export default function RoleHeader({ currentRole, badgeLabel, badgeCode }: RoleHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
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

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }

  const roleMeta = ROLE_NAV[currentRole] || ROLE_NAV.doctor;

  const handleRoleChange = (role: UserRole) => {
    switchRole(role);
    setRoleSwitcherOpen(false);
    const targetHref = ROLE_NAV[role]?.href || "/";
    router.push(targetHref);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1F2937] px-6 h-16 flex items-center justify-between shadow-xs transition-colors">
      {/* Brand & Active Badge */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-[#0F172A] dark:text-white">
          <div className="w-8 h-8 rounded-lg bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] flex items-center justify-center font-bold text-sm">
            S
          </div>
          <span className="hidden sm:inline">SANJEEVANI</span>
        </Link>
        <div className="h-4 w-px bg-[#E2E8F0] dark:bg-[#1F2937]" />
        
        {/* Role Badge */}
        <span className={`text-[10px] font-mono uppercase tracking-[0.2em] px-3 py-1 rounded-full font-bold border ${roleMeta.color}`}>
          {badgeCode || roleMeta.badge}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Quick Role Switcher Dropdown */}
        <div className="relative" ref={roleDropdownRef}>
          <button
            onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#1F2937] hover:bg-gray-50 dark:hover:bg-gray-800 text-[#0F172A] dark:text-white transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="hidden md:inline">Switch Portal</span>
            <ChevronDown className="w-3 h-3 text-[#64748B]" />
          </button>

          {roleSwitcherOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#64748B] dark:text-gray-400">
                Active Clinical Portals
              </div>
              <div className="space-y-1 mt-1">
                {Object.entries(ROLE_NAV).map(([rKey, rItem]) => {
                  const Icon = rItem.icon;
                  const isActive = currentRole === rKey;
                  return (
                    <button
                      key={rKey}
                      onClick={() => handleRoleChange(rKey as UserRole)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-gray-100 dark:bg-gray-800 text-[#0F172A] dark:text-white font-bold"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50 text-[#64748B] dark:text-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{rItem.label}</span>
                      </div>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                    </button>
                  );
                })}
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

        {/* Account Menu Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 pl-2 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#1F2937] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] flex items-center justify-center font-bold text-xs">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-[#0F172A] dark:text-white leading-tight">
                {user?.full_name || "Doctor"}
              </div>
              <div className="text-[10px] text-[#64748B] dark:text-gray-400 capitalize">
                {user?.role || currentRole}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] shadow-xl p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3 mb-2">
                <div className="text-sm font-bold text-[#0F172A] dark:text-white">{user?.full_name}</div>
                <div className="text-xs text-[#64748B] dark:text-gray-400">{user?.email}</div>
                {user?.specialty && (
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                    {user.specialty}
                  </div>
                )}
                {user?.department && (
                  <div className="text-[11px] text-[#64748B] dark:text-gray-400">
                    {user.department}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Link
                  href={roleMeta.href}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#0F172A] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  onClick={() => setProfileOpen(false)}
                >
                  <Shield className="w-4 h-4 text-[#64748B]" />
                  <span>My Workspace</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors text-left"
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
  );
}
