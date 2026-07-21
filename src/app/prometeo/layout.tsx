"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import PageGuard from "@/components/tec-bii/PageGuard";

// ── Fire palette ──────────────────────────────────────────────────────────────
const FIRE   = "#f97316"; // naranja fuego
const EMBER  = "#fb923c"; // naranja claro
const CRIMSON = "#ef4444"; // rojo
const BG     = "#09090f";
const SIDE   = "#0f0f18";
const CARD   = "#14141f";
const BORDER = "#1e1e2e";
const TEXT   = "#e2e8f0";
const MUTED  = "#64748b";

const NAV = [
  { href: "/prometeo",             label: "Centro de Mando",  icon: "⚡" },
  { href: "/prometeo/clientes",    label: "Clientes",         icon: "🏢" },
  { href: "/prometeo/metricas",    label: "Métricas",         icon: "📊" },
  { href: "/prometeo/calendario",  label: "Calendario",       icon: "📅" },
  { href: "/prometeo/finanzas",    label: "Finanzas",         icon: "💰" },
  { href: "/prometeo/cotizador",   label: "Cotizador",        icon: "🧮" },
  { href: "/prometeo/copy-hooks",  label: "Copy & Hooks",     icon: "🪝" },
  { href: "/prometeo/ideas-hub",   label: "Ideas Hub",        icon: "💡" },
  { href: "/prometeo/brand-dna",   label: "Brand DNA",        icon: "🧬" },
  { href: "/prometeo/objetivos",        label: "Objetivos",      icon: "🎯" },
  { href: "/prometeo/creative-memory", label: "Creative Memory", icon: "🧠" },
];

const NAV_SOON = [
  { label: "Creative Lab",     icon: "🧪", badge: "P-4" },
  { label: "Director Autónomo",icon: "🤖", badge: "P-5" },
];

export default function PrometeoLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  const { workspaces, activeWorkspace, activeWorkspaceId, selectWorkspace, createAndSelect, loading } =
    useWorkspace();

  const [wsOpen,    setWsOpen]    = useState(false);
  const [sideOpen,  setSideOpen]  = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [creating,  setCreating]  = useState(false);

  const handleCreate = async () => {
    if (!newWsName.trim()) return;
    setCreating(true);
    await createAndSelect(newWsName.trim());
    setCreating(false);
    setNewWsName("");
    setWsOpen(false);
  };

  const isActive = (href: string) =>
    href === "/prometeo" ? pathname === "/prometeo" : pathname.startsWith(href);

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px 0" }}>
      {/* Logo */}
      <div style={{ padding: "0 16px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${FIRE}, ${CRIMSON})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, flexShrink: 0,
          }}>🔥</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: TEXT, letterSpacing: "-0.3px" }}>
              PROMETEO
            </div>
            <div style={{ fontSize: 9, color: FIRE, fontWeight: 600, letterSpacing: "1px" }}>
              GROWTH INTELLIGENCE v2.0
            </div>
          </div>
        </div>
      </div>

      {/* Workspace selector */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "1px", marginBottom: 6 }}>
          WORKSPACE
        </div>
        <button
          onClick={() => setWsOpen(!wsOpen)}
          style={{
            width: "100%", background: CARD, border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: "7px 10px", display: "flex",
            alignItems: "center", justifyContent: "space-between",
            cursor: "pointer", color: TEXT, fontSize: 12,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {loading ? "Cargando…" : (activeWorkspace?.nombre ?? "Seleccionar")}
          </span>
          <span style={{ color: MUTED, fontSize: 10, flexShrink: 0, marginLeft: 4 }}>▾</span>
        </button>

        {wsOpen && (
          <div style={{
            marginTop: 4, background: CARD, border: `1px solid ${BORDER}`,
            borderRadius: 8, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}>
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => { selectWorkspace(w.id); setWsOpen(false); }}
                style={{
                  width: "100%", padding: "8px 12px", textAlign: "left",
                  background: w.id === activeWorkspaceId ? `${FIRE}22` : "transparent",
                  color: w.id === activeWorkspaceId ? FIRE : TEXT,
                  border: "none", cursor: "pointer", fontSize: 12,
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                {w.id === activeWorkspaceId ? "✓ " : ""}{w.nombre}
              </button>
            ))}
            <div style={{ padding: "8px 12px", borderTop: `1px solid ${BORDER}` }}>
              <input
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Nuevo workspace…"
                style={{
                  width: "100%", background: BG, border: `1px solid ${BORDER}`,
                  borderRadius: 6, padding: "5px 8px", color: TEXT,
                  fontSize: 11, outline: "none", boxSizing: "border-box",
                }}
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newWsName.trim()}
                style={{
                  marginTop: 4, width: "100%", background: FIRE, color: "#fff",
                  border: "none", borderRadius: 6, padding: "5px 8px",
                  fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: creating ? 0.6 : 1,
                }}
              >
                {creating ? "Creando…" : "+ Crear"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nav active */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "1px", padding: "0 8px 6px" }}>
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
                background: active ? `${FIRE}20` : "transparent",
                color: active ? FIRE : TEXT,
                fontSize: 13, fontWeight: active ? 600 : 400,
                borderLeft: active ? `2px solid ${FIRE}` : "2px solid transparent",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Próximamente */}
        <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "1px", padding: "12px 8px 6px" }}>
          PRÓXIMAMENTE
        </div>
        {NAV_SOON.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "7px 10px", borderRadius: 8, marginBottom: 2,
              color: MUTED, fontSize: 12, opacity: 0.6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            <span style={{
              fontSize: 8, fontWeight: 700, color: FIRE, letterSpacing: "0.5px",
              background: `${FIRE}18`, padding: "1px 5px", borderRadius: 4,
            }}>
              {item.badge}
            </span>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORDER}` }}>
        <button
          onClick={() => router.push("/")}
          style={{
            width: "100%", background: "transparent", border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: "7px 12px", color: MUTED, fontSize: 12,
            cursor: "pointer", textAlign: "center",
          }}
        >
          ← Volver a SOFIAA
        </button>
      </div>
    </div>
  );

  return (
    <>
      <PageGuard />
      <div style={{ display: "flex", minHeight: "100dvh", background: BG, color: TEXT }}>

        {/* ── Sidebar desktop ───────────────────────────── */}
        <aside style={{
          width: 220, flexShrink: 0, background: SIDE,
          borderRight: `1px solid ${BORDER}`,
          position: "sticky", top: 0, height: "100dvh",
          overflowY: "auto", display: "flex", flexDirection: "column",
        }}
          className="hidden md:flex"
        >
          <SidebarContent />
        </aside>

        {/* ── Mobile hamburger ─────────────────────────── */}
        <button
          onClick={() => setSideOpen(true)}
          style={{
            position: "fixed", top: 12, left: 12, zIndex: 60,
            background: FIRE, border: "none", borderRadius: 8,
            width: 36, height: 36, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "#fff", boxShadow: `0 0 12px ${FIRE}66`,
          }}
          className="flex md:hidden"
        >
          ☰
        </button>

        {/* Mobile sidebar overlay */}
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

        {/* ── Main content ─────────────────────────────── */}
        <main style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
          {children}
        </main>
      </div>
    </>
  );
}
