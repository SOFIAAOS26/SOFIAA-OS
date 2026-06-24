"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { tecBiExtension } from "@/extensions/tec-bi/manifest";
import { useAuth } from "@/contexts/AuthContext";
import { canView, pathToSection } from "@/lib/permissions";

const NAV = tecBiExtension.routes;

export default function TecBiLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  return (
    <div
      className="tec-bi-root"
      style={{
        background: tecBiExtension.theme.backgroundGradient,
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Top bar ──────────────────────────────────────────── */}
      <header
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(24px)",
          borderBottom: `1px solid ${tecBiExtension.theme.accentColor}`,
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
              background: tecBiExtension.theme.badgeColor,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 99,
              letterSpacing: "0.5px",
            }}
          >
            TEC BI
          </span>
        </div>

        {/* Nav links — filtrado por rol (solo desktop) */}
        <nav className="ext-header-nav">
          {NAV.filter((route) => {
            const section = pathToSection(route.path);
            return canView(section, profile?.rol ?? null);
          }).map((route) => {
            const active = pathname === route.path;
            return (
              <Link
                key={route.path}
                href={route.path}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: 8, fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  color: active ? tecBiExtension.theme.badgeColor : "#555",
                  background: active ? "rgba(14,165,233,0.1)" : "transparent",
                  textDecoration: "none", whiteSpace: "nowrap", transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 13 }}>{route.icon}</span>
                {route.label}
              </Link>
            );
          })}
        </nav>

        {/* User chip (solo desktop) */}
        {profile && (
          <div className="ext-header-extras">
            <div style={{
              background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.25)",
              borderRadius: 99, padding: "3px 10px", display: "flex", alignItems: "center", gap: 5,
            }}>
              <span style={{ fontSize: 10 }}>👤</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#0EA5E9" }}>{profile.nombre}</span>
              <span style={{ fontSize: 9, color: "#aaa", textTransform: "uppercase" }}>· {profile.rol}</span>
            </div>
            <button
              onClick={() => signOut()}
              title="Cerrar sesión"
              style={{ background: "none", border: "none", fontSize: 11, color: "#bbb", cursor: "pointer", padding: "2px 4px" }}
            >
              ⎋
            </button>
          </div>
        )}

        {/* Exit button */}
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
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          ← SOFIAA
        </button>
      </header>

      {/* ── Page content ─────────────────────────────────────── */}
      <main className="ext-main" style={{ flex: 1, padding: "24px 20px", maxWidth: 1200, width: "100%", margin: "0 auto" }}>
        {children}
      </main>

      {/* ── Bottom nav (solo móvil) ───────────────────────────── */}
      <nav
        className="ext-bottom-nav"
        style={{ "--ext-accent": "#0EA5E9" } as React.CSSProperties}
      >
        {NAV.filter((route) => canView(pathToSection(route.path), profile?.rol ?? null)).map((route) => {
          const active = pathname === route.path;
          return (
            <Link
              key={route.path}
              href={route.path}
              className={active ? "ext-nav-active" : ""}
            >
              <span className="nav-icon">{route.icon}</span>
              <span>{route.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
