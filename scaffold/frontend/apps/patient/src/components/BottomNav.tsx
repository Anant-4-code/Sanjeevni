"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, MessageCircle, Camera, QrCode } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutGrid },
  { href: "/copilot", label: "Copilot", icon: MessageCircle },
  { href: "/scan-otc", label: "OTC Scan", icon: Camera },
  { href: "/passport", label: "Passport", icon: QrCode },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-[var(--bg-elevated)] border-t border-[var(--border)] flex items-center z-50">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs transition-colors ${
              isActive
                ? "text-[var(--fg)] font-semibold"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
            aria-label={item.label}
          >
            <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.5} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
