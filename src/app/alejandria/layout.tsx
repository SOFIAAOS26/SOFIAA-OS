"use client";

/**
 * ALEJANDRÍA Layout — Sprint AJ-5
 * Tema: gold (#fbbf24) · Memoria Histórica de Ingeniería
 */

import { useState }              from "react";
import { useRouter, usePathname } from "next/navigation";
import Link                       from "next/link";
import PageGuard                  from "@/components/tec-bii/PageGuard";

// ── Paleta ────────────────────────────────────────────────────────────────────
const GOLD   = "#fbbf24";
const SIDE   = "#0d0b00";
const BORDER = "#1e1a00";
const MUTED  = "#78716c";

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV = [
  { href: "/alejandria",         label: "Centro de Mando", icon: "⬡" },
  { href: "/alejandria/buscar",  label: "Buscar",          icon: "◎" },
  { href: "/alejandria/nodos",   label: "Explorar Nodos",  icon: "◈" },
];

function SidebarContent({
  onClose,
  pathname,
  router,
}: {
  onClose?: () => void;
  pathname: string;
  router:   ReturnType<typeof useRouter>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px 0" }}>
      {/* Logo */}
      <div style={{ padding: "0 20px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: GOLD, fontFamily: "monospace", letterSpacing: "2px" }}>
          ALEJANDRÍA
        </div>
        <div style={{ fontSize: 9, color: MUTED, fontFamily: "monospace", marginTop: 2 }}>
          Memoria Histórica de Ingeniería
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {NAV.map((item) => {
          const active = item.href === "/alejandria"
            ? pathname === "/alejandria"
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
                background: active ? `${GOLD}18` : "transparent",
                color: active ? GOLD : "#a8a29e",
                fontSize: 13, fontWeight: active ? 700 : 400,
                fontFamily: "monospace",
                borderLeft: active ? `2px solid ${GOLD}` : "2px solid transparent",
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

export default function AlejandriaLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [sideOpen, setSideOpen] = useState(false);

  return (
    <>
      <PageGuard />
      <div
        className="alejandria-root min-h-screen bg-[#0a0800] text-[#e2e8f0]"
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
            <span style={{ fontWeight: 900, fontSize: 14, color: GOLD, fontFamily: "monospace", letterSpacing: "1px" }}>
              ALEJANDRÍA
            </span>
          </div>
          <button
            onClick={() => setSideOpen(true)}
            style={{
              background: "transparent", border: `1px solid ${BORDER}`,
              borderRadius: 8, width: 36, height: 36, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, color: GOLD,
            }}
          >
            ☰
          </button>
        </div>

        {/* ── Mobile overlay ────────────────────────────────── */}
        {sideOpen && (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 55,
              background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
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

        {/* ── Main ─────────────────────────────────────────── */}
        <main style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
          {children}
        </main>
      </div>
    </>
  );
}
