"use client";

/**
 * ATENA Layout — responsive
 *
 * Desktop: sidebar fijo izquierdo (224px), idéntico al que estaba hardcodeado en cada página.
 *          El aside per-página sigue visible en desktop — ambos muestran el mismo nav.
 * Móvil:   top bar sticky (48px) + sidebar deslizable con overlay.
 *          El aside per-página se oculta via CSS (.atena-root aside).
 */

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import PageGuard from "@/components/tec-bii/PageGuard";

// ── Paleta ────────────────────────────────────────────────────────────────────
const BLUE   = "#60a5fa";
const SIDE   = "#0d0d18";
const BORDER = "#1e1e2e";
const TEXT   = "#e2e8f0";
const MUTED  = "#475569";

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV = [
  { href: "/atena",            label: "Centro de Mando", icon: "📊" },
  { href: "/atena/proyectos",  label: "Proyectos DMAIC", icon: "🎯" },
  { href: "/atena/analisis",   label: "Análisis",        icon: "📈" },
  { href: "/atena/spc",        label: "Control SPC",     icon: "📉" },
  { href: "/atena/amef",       label: "AMEF",            icon: "⚠️" },
  { href: "/atena/financiero", label: "Financiero",      icon: "💹" },
];

// ── Sidebar content ───────────────────────────────────────────────────────────
function SidebarContent({
  onClose,
  pathname,
  router,
}: {
  onClose?: () => void;
  pathname: string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px 0" }}>
      {/* Logo */}
      <div style={{ padding: "0 20px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: BLUE, fontFamily: "monospace", letterSpacing: "2px" }}>
          ATENA
        </div>
        <div style={{ fontSize: 9, color: MUTED, fontFamily: "monospace", marginTop: 2 }}>
          Scientific Intelligence Engine
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {NAV.map((item) => {
          const active =
            item.href === "/atena"
              ? pathname === "/atena"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 8, marginBottom: 2,
                textDecoration: "none",
                background: active ? `${BLUE}18` : "transparent",
                color: active ? BLUE : "#94a3b8",
                fontSize: 13, fontWeight: active ? 700 : 400,
                fontFamily: "monospace",
                borderLeft: active ? `2px solid ${BLUE}` : "2px solid transparent",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORDER}` }}>
        <button
          onClick={() => { onClose?.(); router.push("/"); }}
          style={{
            background: "transparent", border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: "7px 12px", color: MUTED,
            fontSize: 11, cursor: "pointer", width: "100%", textAlign: "center",
            fontFamily: "monospace",
          }}
        >
          ← Volver a SOFIAA
        </button>
      </div>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function AtenaLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [sideOpen, setSideOpen] = useState(false);

  return (
    <>
      <PageGuard />
      {/*
        atena-root: CSS global oculta el <aside> per-página en móvil
        para evitar el sidebar duplicado. En desktop ambos coexisten
        (el layout no muestra sidebar en desktop para no duplicar,
        solo lo hace el aside per-página).
      */}
      <div
        className="atena-root min-h-screen bg-[#0a0a0f] text-[#e2e8f0]"
        style={{ display: "flex", flexDirection: "column" }}
      >
        {/* ── Mobile top bar ────────────────────────────────── */}
        <div
          className="flex md:hidden"
          style={{
            position: "sticky", top: 0, zIndex: 50,
            height: 48, background: SIDE,
            borderBottom: `1px solid ${BORDER}`,
            alignItems: "center", justifyContent: "space-between",
            padding: "0 16px", flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontWeight: 900, fontSize: 15, color: BLUE,
              fontFamily: "monospace", letterSpacing: "1px",
            }}>
              ATENA
            </span>
            <span style={{ fontSize: 9, color: MUTED, fontFamily: "monospace" }}>/ SIE</span>
          </div>
          <button
            onClick={() => setSideOpen(true)}
            style={{
              background: "transparent", border: `1px solid ${BORDER}`,
              borderRadius: 8, width: 36, height: 36, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, color: BLUE,
            }}
          >
            ☰
          </button>
        </div>

        {/* ── Mobile sidebar overlay ────────────────────────── */}
        {sideOpen && (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 55,
              background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
            }}
            onClick={() => setSideOpen(false)}
          />
        )}
        <div
          style={{
            position: "fixed", top: 0, left: 0, zIndex: 60,
            width: 224, height: "100dvh", background: SIDE,
            borderRight: `1px solid ${BORDER}`,
            transform: sideOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s ease",
            overflowY: "auto",
          }}
        >
          <SidebarContent
            onClose={() => setSideOpen(false)}
            pathname={pathname}
            router={router}
          />
        </div>

        {/* ── Main content ─────────────────────────────────── */}
        <main style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
          {children}
        </main>
      </div>
    </>
  );
}
