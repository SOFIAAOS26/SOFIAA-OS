"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import PageGuard from "@/components/tec-bii/PageGuard";

// ── Paleta ORÁCULO — púrpura profundo #6D28D9 ─────────────────────────────────
const PURPLE  = "#6D28D9";
const VIOLET  = "#7c3aed";
const LAVEND  = "#a78bfa";
const BG      = "#06030f";
const SIDE    = "#08050f";
const CARD    = "#0f0a1a";
const BORDER  = "#1e1030";
const TEXT    = "#e2e8f0";
const MUTED   = "#64748b";

const NAV = [
  { href: "/oraculo",              label: "Centro de Mando", icon: "🔮" },
  { href: "/oraculo/predicciones", label: "Predicciones",    icon: "⚠️" },
  { href: "/oraculo/forecasts",    label: "Pronósticos",     icon: "📈" },
];

export default function OraculoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sideOpen, setSideOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/oraculo" ? pathname === "/oraculo" : pathname.startsWith(href);

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px 0" }}>
      {/* Logo */}
      <div style={{ padding: "0 16px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${PURPLE}, ${VIOLET})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, flexShrink: 0,
            boxShadow: `0 0 14px ${PURPLE}66`,
          }}>🔮</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: TEXT, letterSpacing: "-0.3px" }}>
              ORÁCULO
            </div>
            <div style={{ fontSize: 9, color: LAVEND, fontWeight: 600, letterSpacing: "1px" }}>
              PREDICTIVE ENGINE · GEN 2
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
                background: active ? `${PURPLE}22` : "transparent",
                color: active ? LAVEND : TEXT,
                fontSize: 13, fontWeight: active ? 600 : 400,
                borderLeft: active ? `2px solid ${PURPLE}` : "2px solid transparent",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Sprints futuros */}
        <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "1px", padding: "16px 8px 8px" }}>
          PRÓXIMAMENTE
        </div>
        {[
          { label: "Insights Cruzados", icon: "💡", badge: "O-4" },
          { label: "Dashboard SOFIAA",  icon: "🖥",  badge: "O-5" },
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
              fontSize: 8, fontWeight: 700, color: LAVEND, letterSpacing: "0.5px",
              background: `${LAVEND}18`, padding: "1px 5px", borderRadius: 4,
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
            background: PURPLE, border: "none", borderRadius: 8,
            width: 36, height: 36, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "#fff",
            boxShadow: `0 0 12px ${PURPLE}66`,
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
