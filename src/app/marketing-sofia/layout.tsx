"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { marketingSofiaExtension } from "@/extensions/marketing-sofia/manifest";
import { useWorkspace } from "@/hooks/useWorkspace";

const NAV = marketingSofiaExtension.routes;
const T   = marketingSofiaExtension.theme;
const P   = "#7C3AED"; // primary purple

export default function MarketingSofiaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router   = useRouter();
  const pathname = usePathname();
  const { workspaces, activeWorkspace, activeWorkspaceId, selectWorkspace, createAndSelect, loading } =
    useWorkspace();

  const [wsOpen,    setWsOpen]    = useState(false);
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

  return (
    <div
      style={{
        background: T.backgroundGradient,
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header
        style={{
          background: "rgba(255,255,255,0.78)",
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
              background: P,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 99,
              letterSpacing: "0.5px",
            }}
          >
            MARKETING PRO
          </span>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", gap: 2, overflowX: "auto", flex: 1, scrollbarWidth: "none" }}>
          {NAV.map((route) => {
            const active = pathname === route.path;
            return (
              <Link
                key={route.path}
                href={route.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  color: active ? P : "#555",
                  background: active ? "rgba(124,58,237,0.10)" : "transparent",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 13 }}>{route.icon}</span>
                {route.label}
              </Link>
            );
          })}
        </nav>

        {/* Workspace selector */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setWsOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.2)",
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              color: P,
              cursor: "pointer",
              maxWidth: 140,
            }}
          >
            <span>🏢</span>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 90,
              }}
            >
              {loading ? "…" : (activeWorkspace?.nombre ?? "Sin workspace")}
            </span>
            <span style={{ fontSize: 8, opacity: 0.6 }}>▼</span>
          </button>

          {wsOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                background: "#fff",
                border: "1px solid rgba(124,58,237,0.15)",
                borderRadius: 12,
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                minWidth: 220,
                zIndex: 200,
                overflow: "hidden",
              }}
            >
              {/* Existing workspaces */}
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => { selectWorkspace(ws.id!); setWsOpen(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "10px 14px",
                    background: ws.id === activeWorkspaceId
                      ? "rgba(124,58,237,0.07)"
                      : "transparent",
                    border: "none",
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: ws.id === activeWorkspaceId ? 700 : 400,
                    color: ws.id === activeWorkspaceId ? P : "#333",
                    cursor: "pointer",
                    borderBottom: "1px solid #f3f0ff",
                  }}
                >
                  {ws.id === activeWorkspaceId ? "✓ " : "   "}{ws.nombre}
                </button>
              ))}

              {/* Create new */}
              <div style={{ padding: "10px 14px", borderTop: "1px solid #f3f0ff" }}>
                <p style={{ fontSize: 10, color: "#999", margin: "0 0 6px", fontWeight: 600 }}>
                  NUEVA AGENCIA
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    placeholder="Nombre de agencia…"
                    style={{
                      flex: 1,
                      border: "1px solid #e0d9f7",
                      borderRadius: 6,
                      padding: "5px 8px",
                      fontSize: 11,
                      outline: "none",
                      color: "#333",
                    }}
                  />
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newWsName.trim()}
                    style={{
                      background: P,
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      opacity: creating ? 0.6 : 1,
                    }}
                  >
                    {creating ? "…" : "+"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

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

      {/* ── Content ─────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          padding: "24px 20px",
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* No workspace guard */}
        {!loading && !activeWorkspaceId ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60vh",
              gap: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48 }}>🏢</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>
              Crea tu primer workspace
            </h2>
            <p style={{ color: "#888", fontSize: 14, maxWidth: 320, margin: 0 }}>
              Cada agencia tiene su propio espacio con clientes, métricas y finanzas independientes.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Nombre de tu agencia…"
                style={{
                  border: "1.5px solid rgba(124,58,237,0.3)",
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontSize: 14,
                  outline: "none",
                  minWidth: 240,
                  color: "#333",
                }}
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newWsName.trim()}
                style={{
                  background: P,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {creating ? "Creando…" : "Crear"}
              </button>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
