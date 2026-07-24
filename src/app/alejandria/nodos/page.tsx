"use client";

/**
 * ALEJANDRÍA — /nodos · Explorador de nodos
 * Sprint AJ-5
 */

import { useEffect, useState }  from "react";
import { useRouter }             from "next/navigation";
import { auth }                  from "@/lib/firebase";
import { onAuthStateChanged }    from "firebase/auth";
import type { AlejandriaNodeType, AlejandriaModulo } from "@/extensions/alejandria/schema";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NodeRow {
  id:                string;
  tipo:              AlejandriaNodeType;
  titulo:            string;
  fecha:             string;
  modulos_afectados: AlejandriaModulo[];
  sprint_referencia: string | null;
  reinforceCount:    number;
  score:             number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const GOLD   = "#fbbf24";
const BORDER = "#1e1a00";

const TIPO_ICON: Record<string, string> = {
  sprint:                "🚀",
  decision_arquitectura: "⚖️",
  brainstorming:         "💡",
  especificacion_modulo: "📐",
  experimento:           "🧪",
  hito:                  "🏁",
  idea:                  "✨",
};

const TIPOS: AlejandriaNodeType[] = [
  "sprint", "decision_arquitectura", "especificacion_modulo",
  "brainstorming", "experimento", "hito", "idea",
];

const MODULOS: AlejandriaModulo[] = [
  "SOFIAA", "NEXO", "PROMETEO", "NORA", "HERMES", "ATENA", "TEC_BII", "ALEJANDRIA", "LIVE_SDK",
];

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV = [
  { label: "Centro de Mando", href: "/alejandria",        icon: "⬡" },
  { label: "Buscar",          href: "/alejandria/buscar", icon: "◎" },
  { label: "Explorar Nodos",  href: "/alejandria/nodos",  icon: "◈" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NodosPage() {
  const router = useRouter();

  const [token,   setToken]   = useState<string | null>(null);
  const [nodes,   setNodes]   = useState<NodeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [tipoFil,   setTipoFil]   = useState<string>("all");
  const [moduloFil, setModuloFil] = useState<string>("all");

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const t = await user.getIdToken();
        setToken(t);
      }
    });
  }, []);

  // ── Fetch todos los nodos via search con query vacía (top por reinforce) ──
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res  = await fetch("/api/alejandria/search", {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ query: "arquitectura sistema módulos sprints", limit: 20 }),
        });
        const data = await res.json();
        setNodes(data.results ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // ── Filtrar ───────────────────────────────────────────────────────────────
  const filtered = nodes.filter((n) => {
    const tipoOk   = tipoFil   === "all" || n.tipo === tipoFil;
    const moduloOk = moduloFil === "all" || n.modulos_afectados?.includes(moduloFil as AlejandriaModulo);
    return tipoOk && moduloOk;
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex"
        style={{
          width: 224, background: "#0d0b00",
          borderRight: `1px solid ${BORDER}`,
          flexDirection: "column", flexShrink: 0,
        }}
      >
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: GOLD, fontFamily: "monospace", letterSpacing: "2px" }}>ALEJANDRÍA</div>
          <div style={{ fontSize: 9, color: "#57534e", fontFamily: "monospace", marginTop: 2 }}>Memoria Histórica</div>
        </div>
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {NAV.map((item) => {
            const active = item.href === "/alejandria/nodos";
            return (
              <button key={item.href} onClick={() => router.push(item.href)} style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "8px 12px", borderRadius: 8, marginBottom: 2,
                background: active ? `${GOLD}18` : "transparent",
                color: active ? GOLD : "#a8a29e",
                fontSize: 13, fontWeight: active ? 700 : 400,
                fontFamily: "monospace", border: "none", cursor: "pointer",
                borderLeft: active ? `2px solid ${GOLD}` : "2px solid transparent",
                textAlign: "left",
              }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORDER}` }}>
          <button onClick={() => router.push("/")} style={{
            background: "transparent", border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: "7px 12px", color: "#57534e",
            fontSize: 11, cursor: "pointer", width: "100%", fontFamily: "monospace",
          }}>
            ← Volver a SOFIAA
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <header style={{ borderBottom: `1px solid ${BORDER}`, padding: "20px 32px" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "white", margin: 0 }}>Explorar Nodos</h1>
          <p style={{ fontSize: 11, color: "#57534e", fontFamily: "monospace", marginTop: 4 }}>
            {filtered.length} nodo{filtered.length !== 1 ? "s" : ""} · filtrable por tipo y módulo
          </p>
        </header>

        <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>

          {/* Filtros */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <select
              value={tipoFil}
              onChange={(e) => setTipoFil(e.target.value)}
              style={{
                background: "#111008", border: `1px solid ${BORDER}`, borderRadius: 8,
                padding: "6px 12px", color: "white", fontSize: 12,
                fontFamily: "monospace", cursor: "pointer",
              }}
            >
              <option value="all">Todos los tipos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{TIPO_ICON[t]} {t.replace(/_/g, " ")}</option>
              ))}
            </select>
            <select
              value={moduloFil}
              onChange={(e) => setModuloFil(e.target.value)}
              style={{
                background: "#111008", border: `1px solid ${BORDER}`, borderRadius: 8,
                padding: "6px 12px", color: "white", fontSize: 12,
                fontFamily: "monospace", cursor: "pointer",
              }}
            >
              <option value="all">Todos los módulos</option>
              {MODULOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Lista */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#57534e", fontFamily: "monospace", fontSize: 12 }}>
              Cargando nodos...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#57534e", fontFamily: "monospace", fontSize: 12 }}>
              Sin nodos con los filtros actuales.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((n) => (
                <div key={n.id} style={{
                  background: "#111008", border: `1px solid ${BORDER}`,
                  borderRadius: 10, padding: "12px 16px",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{TIPO_ICON[n.tipo] ?? "◈"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white", lineHeight: 1.3 }}>{n.titulo}</div>
                    <div style={{ fontSize: 10, color: "#57534e", fontFamily: "monospace", marginTop: 2 }}>
                      {n.fecha}
                      {n.sprint_referencia ? ` · ${n.sprint_referencia}` : ""}
                      {" · "}
                      {n.modulos_afectados?.slice(0, 3).join(", ") || "—"}
                    </div>
                  </div>
                  {n.reinforceCount > 0 && (
                    <span style={{ fontSize: 10, color: "#f97316", fontFamily: "monospace", flexShrink: 0 }}>
                      🔁 {n.reinforceCount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
