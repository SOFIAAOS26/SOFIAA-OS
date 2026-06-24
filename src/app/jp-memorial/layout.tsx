"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { jpMemorialExtension } from "@/extensions/jp-memorial/manifest";
import ExtHamburger from "@/components/ui/ExtHamburger";
import JpmChat from "@/components/jp-memorial/JpmChat";

const NAV = jpMemorialExtension.routes;
const T   = jpMemorialExtension.theme;

export default function JpMemorialLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  return (
    <div
      style={{
        background: T.backgroundGradient,
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Top bar ──────────────────────────────────────────── */}
      <header
        style={{
          background: "rgba(255,255,255,0.80)",
          backdropFilter: "blur(24px)",
          borderBottom: `1px solid ${T.accentColor}`,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          height: 52,
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        {/* Logo + badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#1D1D1F", letterSpacing: "-0.3px" }}>
            SOFIAA
          </span>
          <span
            style={{
              background: T.badgeColor,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 99,
              letterSpacing: "0.5px",
            }}
          >
            JP MEMORIAL
          </span>
        </div>

        {/* Nav (solo desktop) */}
        <nav className="ext-header-nav">
          {NAV.map((route) => {
            const active = pathname === route.path;
            return (
              <Link
                key={route.path}
                href={route.path}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: 8, fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  color: active ? T.badgeColor : "#555",
                  background: active ? "rgba(74,124,89,0.10)" : "transparent",
                  textDecoration: "none", whiteSpace: "nowrap", transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 13 }}>{route.icon}</span>
                {route.label}
              </Link>
            );
          })}
        </nav>

        {/* Exit */}
        <button
          onClick={() => router.push("/")}
          title="Volver a SOFIAA"
          style={{
            flexShrink: 0,
            background: "rgba(0,0,0,0.06)",
            border: "none",
            borderRadius: 8,
            padding: "5px 10px",
            fontSize: 11,
            fontWeight: 600,
            color: "#666",
            cursor: "pointer",
          }}
        >
          ← SOFIAA
        </button>
      </header>

      {/* ── Page content ─────────────────────────────────────── */}
      <main className="ext-main" style={{ flex: 1, padding: "24px 20px", maxWidth: 1100, width: "100%", margin: "0 auto" }}>
        {children}
      </main>

      {/* ── Hamburger móvil ──────────────────────────────────── */}
      <ExtHamburger
        routes={NAV}
        accentColor={T.badgeColor}
        accentBg="rgba(74,124,89,0.10)"
      />

      {/* ── SOFIAA Chat Flotante ──────────────────────────────── */}
      <JpmChat />
    </div>
  );
}
