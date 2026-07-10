"use client";

/**
 * TEC Bii — Layout (RUMBO A TIER 4)
 *
 * Tema neural oscuro — diferenciado visualmente de TEC BI v1 (azul claro).
 * Misma estructura de autenticación y RBAC, nueva identidad cognitiva.
 */

import { useRouter, usePathname } from "next/navigation";
import Link                        from "next/link";
import { tecBiiExtension }         from "@/extensions/tec-bii/manifest";
import ExtHamburger                from "@/components/ui/ExtHamburger";
import { useAuth }                 from "@/contexts/AuthContext";

const NAV    = tecBiiExtension.routes;
const ACCENT = tecBiiExtension.theme.badgeColor;   // #6366F1 (indigo)
const BG     = tecBiiExtension.theme.backgroundGradient;

export default function TecBiiLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  return (
    <div
      style={{
        background:    BG,
        minHeight:     "100dvh",
        display:       "flex",
        flexDirection: "column",
        fontFamily:    "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color:         "#E2E8F0",
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header
        style={{
          background:    "rgba(10,10,20,0.85)",
          backdropFilter: "blur(24px)",
          borderBottom:  "1px solid rgba(99,102,241,0.2)",
          padding:       "0 20px",
          display:       "flex",
          alignItems:    "center",
          gap:           12,
          height:        52,
          position:      "sticky",
          top:           0,
          zIndex:        50,
        }}
      >
        {/* Logo + badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#E2E8F0", letterSpacing: "-0.3px" }}>
            SOFIAA
          </span>
          <span
            style={{
              background:    "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
              color:         "#fff",
              fontSize:      10,
              fontWeight:    700,
              padding:       "2px 8px",
              borderRadius:  99,
              letterSpacing: "0.5px",
              boxShadow:     "0 0 12px rgba(99,102,241,0.4)",
            }}
          >
            TEC Bii
          </span>
          <span
            style={{
              fontSize:   9,
              color:      "rgba(99,102,241,0.6)",
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            RUMBO A TIER 4
          </span>
        </div>

        {/* Nav links (desktop) */}
        <nav className="ext-header-nav">
          {NAV.map((route) => {
            const active = pathname === route.path || (route.path !== "/tec-bii" && pathname.startsWith(route.path));
            return (
              <Link
                key={route.path}
                href={route.path}
                style={{
                  display:     "flex",
                  alignItems:  "center",
                  gap:         5,
                  padding:     "5px 10px",
                  borderRadius: 8,
                  fontSize:    12,
                  fontWeight:  active ? 600 : 400,
                  color:       active ? ACCENT : "rgba(226,232,240,0.5)",
                  background:  active ? "rgba(99,102,241,0.12)" : "transparent",
                  border:      active ? `1px solid rgba(99,102,241,0.25)` : "1px solid transparent",
                  textDecoration: "none",
                  whiteSpace:  "nowrap",
                  transition:  "all 0.15s",
                }}
              >
                <span style={{ fontSize: 13 }}>{route.icon}</span>
                {route.label}
              </Link>
            );
          })}
        </nav>

        {/* User chip (desktop) */}
        {profile && (
          <div className="ext-header-extras">
            <div style={{
              background: "rgba(99,102,241,0.08)",
              border:     "1px solid rgba(99,102,241,0.2)",
              borderRadius: 99,
              padding:    "3px 10px",
              display:    "flex",
              alignItems: "center",
              gap:        5,
            }}>
              <span style={{ fontSize: 10 }}>👤</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: ACCENT }}>{profile.nombre}</span>
              <span style={{ fontSize: 9, color: "rgba(99,102,241,0.5)", textTransform: "uppercase" }}>
                · {profile.rol}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              title="Cerrar sesión"
              style={{
                background: "none",
                border:     "none",
                fontSize:   11,
                color:      "rgba(226,232,240,0.3)",
                cursor:     "pointer",
                padding:    "2px 4px",
              }}
            >
              ⎋
            </button>
          </div>
        )}

        {/* Exit */}
        <button
          onClick={() => router.push("/")}
          title="Volver a SOFIAA"
          style={{
            flexShrink:   0,
            background:   "rgba(255,255,255,0.04)",
            border:       "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding:      "5px 10px",
            fontSize:     11,
            fontWeight:   600,
            color:        "rgba(226,232,240,0.45)",
            cursor:       "pointer",
            display:      "flex",
            alignItems:   "center",
            gap:          4,
            transition:   "all 0.15s",
          }}
        >
          ← SOFIAA
        </button>
      </header>

      {/* ── Page content ─────────────────────────────────────────────── */}
      <main
        className="ext-main"
        style={{
          flex:      1,
          padding:   "24px 20px",
          maxWidth:  1280,
          width:     "100%",
          margin:    "0 auto",
        }}
      >
        {children}
      </main>

      {/* ── Hamburger móvil ──────────────────────────────────────────── */}
      <ExtHamburger
        routes={NAV}
        accentColor={ACCENT}
        accentBg="rgba(99,102,241,0.10)"
      />
    </div>
  );
}
