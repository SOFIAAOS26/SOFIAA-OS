"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import PageGuard from "@/components/tec-bii/PageGuard";

// ── Paleta APOLO — amber solar #D97706 ────────────────────────────────────────
const AMBER   = "#D97706";
const AMBER2  = "#B45309";
const AMBER_L = "#FCD34D";
const BG      = "#0c0802";
const SIDE    = "#0f0a03";
const CARD    = "#1a1205";
const BORDER  = "#2a1f08";
const TEXT    = "#fef3c7";
const MUTED   = "#78716c";

const NAV = [
  { href: "/apolo",             label: "Centro Solar",  icon: "☀️" },
  { href: "/apolo/reportes",    label: "Reportes",      icon: "📋" },
  { href: "/apolo/plantillas",  label: "Plantillas",    icon: "🎨" },
  { href: "/apolo/exportar",    label: "Exportar",      icon: "📤" },
];

export default function ApoloLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sideOpen, setSideOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/apolo" ? pathname === "/apolo" : pathname.startsWith(href);

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px 0" }}>
      {/* Logo */}
      <div style={{ padding: "0 16px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${AMBER}, ${AMBER2})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, flexShrink: 0,
            boxShadow: `0 0 14px ${AMBER}66`,
          }}>☀️</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: TEXT, letterSpacing: "-0.3px" }}>
              APOLO
            </div>
            <div style={{ fontSize: 9, color: AMBER_L, fontWeight: 600, letterSpacing: "1px" }}>
              REPORTING ENGINE · GEN 2
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 8px", overflowY: "auto" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "1px", padding: "0 8px 8px" }}>
          MÓDULOS ACTIVOS
        </div>
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSideOpen(false)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 8, marginBottom: 2,
                textDecoration: "none",
                background: active ? `${AMBER}22` : "transparent",
                color: active ? AMBER_L : TEXT,
                fontSize: 13, fontWeight: active ? 600 : 400,
                borderLeft: active ? `2px solid ${AMBER}` : "2px solid transparent",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Próximamente */}
        <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "1px", padding: "16px 8px 8px" }}>
          PRÓXIMAMENTE
        </div>
        {[
          { label: "CRON Digest",      icon: "⏰", badge: "AP-5" },
          { label: "Chat Integration", icon: "💬", badge: "AP-5" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "7px 10px", borderRadius: 8, marginBottom: 2,
              color: MUTED, fontSize: 12, opacity: 0.55,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            <span style={{
              fontSize: 8, fontWeight: 700, color: AMBER_L, letterSpacing: "0.5px",
              background: `${AMBER_L}18`, padding: "1px 5px", borderRadius: 4,
            }}>
              {item.badge}
            </span>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORDER}` }}>
        <Link
          href="/"
          style={{
            display: "block", textAlign: "center",
            background: "transparent", border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: "7px 12px", color: MUTED, fontSize: 12,
            textDecoration: "none",
          }}
        >
          ← Volver a SOFIAA
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <PageGuard />
      <div style={{ display: "flex", minHeight: "100dvh", background: BG, color: TEXT }}>

        {/* Sidebar desktop */}
        <aside
          style={{
            width: 220, flexShrink: 0, background: SIDE,
            borderRight: `1px solid ${BORDER}`,
            position: "sticky", top: 0, height: "100dvh",
            overflowY: "auto", display: "flex", flexDirection: "column",
          }}
          className="hidden md:flex"
        >
          <SidebarContent />
        </aside>

        {/* Mobile hamburger */}
        <button
          onClick={() => setSideOpen(true)}
          style={{
            position: "fixed", top: 12, left: 12, zIndex: 60,
            background: AMBER, border: "none", borderRadius: 8,
            width: 36, height: 36, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "#fff",
            boxShadow: `0 0 12px ${AMBER}66`,
          }}
          className="flex md:hidden"
        >
          ☰
        </button>

        {sideOpen && (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 55,
              background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
            }}
            onClick={() => setSideOpen(false)}
          />
        )}
        <div style={{
          position: "fixed", top: 0, left: 0, zIndex: 60,
          width: 240, height: "100dvh", background: SIDE,
          borderRight: `1px solid ${BORDER}`,
          transform: sideOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
          overflowY: "auto",
        }}>
          <SidebarContent />
        </div>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
          {children}
        </main>
      </div>
    </>
  );
}
