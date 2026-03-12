"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const NAV_ITEMS = [
  { href: "/command", label: "Command", icon: "⚡" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/sales", label: "Sales", icon: "🎯" },
  { href: "/nexus", label: "NEXUS", icon: "🧠" },
  { href: "/voice", label: "Voice", icon: "🎙️" },
  { href: "/onboarding", label: "Onboarding", icon: "🚀" },
];

const PUBLIC_PATHS = ["/", "/login", "/demo"];

export default function AdminNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Check admin status via a lightweight API call
      try {
        const res = await fetch("/api/admin/check");
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.isAdmin);
        }
      } catch {
        // Not admin or API unavailable
      }
    })();
  }, []);

  // Don't show on public pages or if not admin
  if (PUBLIC_PATHS.includes(pathname) || !isAdmin) return null;

  return (
    <>
    <nav
      className="fixed top-0 left-0 right-0 z-[9999] transition-all duration-200"
      style={{
        background: collapsed ? "rgba(10,10,10,0.85)" : "rgba(10,10,10,0.97)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #222",
      }}
    >
      <div className="max-w-screen-xl mx-auto flex items-center justify-between px-4 h-11">
        {/* Logo */}
        <Link href="/command" className="flex items-center gap-2 text-sm font-bold" style={{ color: "#00e87b" }}>
          <span className="text-base">⚡</span> CashPulse Admin
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{
                  color: active ? "#00e87b" : "#888",
                  background: active ? "rgba(0,232,123,0.1)" : "transparent",
                }}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="md:hidden text-lg"
          style={{ color: "#888" }}
        >
          {collapsed ? "☰" : "✕"}
        </button>
      </div>

      {/* Mobile dropdown */}
      {!collapsed && (
        <div className="md:hidden border-t px-4 pb-3 pt-2" style={{ borderColor: "#222" }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setCollapsed(true)}
                className="block py-2 text-sm font-medium"
                style={{ color: active ? "#00e87b" : "#aaa" }}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
    {/* Spacer so page content isn't hidden behind fixed nav */}
    <div className="h-11" />
    </>
  );
}
