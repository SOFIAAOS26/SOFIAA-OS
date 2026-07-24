"use client";

/**
 * ALEJANDRÍA — Centro de Mando
 * Sprint AJ-5 · Memoria Histórica de Ingeniería
 */

import { useEffect, useState, useRef } from "react";
import { useRouter }                    from "next/navigation";
import { auth }                         from "@/lib/firebase";
import { onAuthStateChanged }           from "firebase/auth";
import type { AlejandriaStats }         from "@/extensions/alejandria/schema";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchResult {
  id:                string;
  tipo:              string;
  titulo:            string;
  resumen:           string;
  fecha:             string;
  modulos_afectados: string[];
  tags:              string[];
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

const TIPO_LABEL: Record<string, string> = {
  sprint:                "Sprint",
  decision_arquitectura: "Decisión",
  brainstorming:         "Brainstorm",
  especificacion_modulo: "Especificación",
  experimento:           "Experimento",
  hito:                  "Hito",
  idea:                  "Idea",
};

function KPICard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{
      background: "#111008", border: `1px solid ${BORDER}`,
      borderRadius: 12, padding: "16px 20px",
    }}>
      <div style={{ fontSize: 10, color: "#78716c", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace" }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "monospace", color: accent ?? "white", marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <span style={{
      fontSize: 10, fontFamily: "monospace", fontWeight: 700,
      padding: "2px 8px", borderRadius: 4,
      background: `${GOLD}18`, color: GOLD,
      textTransform: "uppercase", letterSpacing: "0.08em",
    }}>
      {TIPO_ICON[tipo] ?? "◈"} {TIPO_LABEL[tipo] ?? tipo}
    </span>
  );
}

function NodeCard({ node }: { node: SearchResult }) {
  return (
    <div style={{
      background: "#111008", border: `1px solid ${BORDER}`,
      borderRadius: 10, padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <TipoBadge tipo={node.tipo} />
        <span style={{ fontSize: 10, color: "#57534e", fontFamily: "monospace", whiteSpace: "nowrap" }}>
          {node.fecha}
        </span>
      </div>
      <div style={{ fontWeight: 700, color: "white", fontSize: 13, lineHeight: 1.4 }}>
        {node.titulo}
      </div>
      <div style={{ fontSize: 12, color: "#a8a29e", lineHeight: 1.5 }}>
        {node.resumen.length > 140 ? node.resumen.slice(0, 140) + "…" : node.resumen}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
        {node.modulos_afectados?.slice(0, 3).map((m) => (
          <span key={m} style={{
            fontSize: 9, fontFamily: "monospace", padding: "1px 6px",
            borderRadius: 3, background: "#1a1500", color: "#78716c", border: `1px solid #2a2000`,
          }}>
            {m}
          </span>
        ))}
        {node.sprint_referencia && (
          <span style={{
            fontSize: 9, fontFamily: "monospace", padding: "1px 6px",
            borderRadius: 3, background: "#001a10", color: "#34d399", border: `1px solid #002a18`,
          }}>
            {node.sprint_referencia}
          </span>
        )}
        {node.reinforceCount > 0 && (
          <span style={{
            fontSize: 9, fontFamily: "monospace", padding: "1px 6px",
            borderRadius: 3, background: "#1a0a00", color: "#f97316",
          }}>
            🔁 {node.reinforceCount}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AlejandriaPage() {
  const router = useRouter();

  const [uid,     setUid]     = useState<string | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [stats,   setStats]   = useState<AlejandriaStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Búsqueda
  const [query,      setQuery]      = useState("");
  const [searching,  setSearching]  = useState(false);
  const [results,    setResults]    = useState<SearchResult[]>([]);
  const [searched,   setSearched]   = useState(false);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        const t = await user.getIdToken();
        setToken(t);
      }
    });
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res  = await fetch("/api/alejandria/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setStats(data.stats);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // ── Search ────────────────────────────────────────────────────────────────
  const search = async (q: string) => {
    if (!token || q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setSearching(true);
    setSearched(true);
    try {
      const res  = await fetch("/api/alejandria/search", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ query: q, limit: 8 }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setSearching(false);
    }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) { setResults([]); setSearched(false); return; }
    debounceRef.current = setTimeout(() => search(val), 500);
  };

  // ── NAV ───────────────────────────────────────────────────────────────────
  const NAV = [
    { label: "Centro de Mando", href: "/alejandria",        icon: "⬡" },
    { label: "Buscar",          href: "/alejandria/buscar", icon: "◎" },
    { label: "Explorar Nodos",  href: "/alejandria/nodos",  icon: "◈" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, fontFamily: "monospace", letterSpacing: "3px" }}>
            ALEJANDRÍA
          </div>
          <div style={{ fontSize: 11, color: "#57534e", fontFamily: "monospace", marginTop: 8, animation: "pulse 1.5s infinite" }}>
            Cargando memoria histórica...
          </div>
        </div>
      </div>
    );
  }

  const tiposOrden = [
    "sprint", "decision_arquitectura", "especificacion_modulo",
    "brainstorming", "experimento", "hito", "idea",
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      {/* ── Sidebar (desktop) ─────────────────────────────── */}
      <aside
        className="hidden md:flex"
        style={{
          width: 224, background: "#0d0b00",
          borderRight: `1px solid ${BORDER}`,
          flexDirection: "column", flexShrink: 0,
        }}
      >
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: GOLD, fontFamily: "monospace", letterSpacing: "2px" }}>
            ALEJANDRÍA
          </div>
          <div style={{ fontSize: 9, color: "#57534e", fontFamily: "monospace", marginTop: 2 }}>
            Memoria Histórica de Ingeniería
          </div>
        </div>
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {NAV.map((item) => {
            const active = item.href === "/alejandria";
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "8px 12px", borderRadius: 8, marginBottom: 2,
                  background: active ? `${GOLD}18` : "transparent",
                  color: active ? GOLD : "#a8a29e",
                  fontSize: 13, fontWeight: active ? 700 : 400,
                  fontFamily: "monospace", border: "none", cursor: "pointer",
                  borderLeft: active ? `2px solid ${GOLD}` : "2px solid transparent",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORDER}` }}>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "transparent", border: `1px solid ${BORDER}`,
              borderRadius: 8, padding: "7px 12px", color: "#57534e",
              fontSize: 11, cursor: "pointer", width: "100%", fontFamily: "monospace",
            }}
          >
            ← Volver a SOFIAA
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {/* Header */}
        <header style={{
          borderBottom: `1px solid ${BORDER}`,
          padding: "20px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "white", margin: 0 }}>
              Centro de Mando
            </h1>
            <p style={{ fontSize: 11, color: "#57534e", fontFamily: "monospace", marginTop: 4 }}>
              Knowledge Graph · {stats?.totalNodos ?? "—"} nodos · Búsqueda semántica Gemini
            </p>
          </div>
          <div style={{
            fontSize: 11, fontFamily: "monospace", padding: "4px 12px",
            borderRadius: 20, background: `${GOLD}18`, color: GOLD,
            border: `1px solid ${GOLD}40`,
          }}>
            v1.0 · AJ-5
          </div>
        </header>

        <div style={{ padding: "32px", maxWidth: 900, display: "flex", flexDirection: "column", gap: 32 }}>

          {/* KPIs */}
          {stats && (
            <section>
              <div style={{ fontSize: 10, color: "#57534e", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 16 }}>
                Estadísticas del Corpus
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                <KPICard label="Total Nodos"    value={stats.totalNodos}         accent={GOLD}      />
                <KPICard label="Módulos"        value={stats.modulosCubiertos.length} accent="#34d399" />
                <KPICard label="Decisiones"     value={stats.decisionesTotal}    accent="#f97316"   />
                <KPICard label="Última ingesta" value={
                  stats.ultimaActualizacion
                    ? new Date(stats.ultimaActualizacion).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
                    : "—"
                } />
              </div>
            </section>
          )}

          {/* Tipos */}
          {stats && (
            <section>
              <div style={{ fontSize: 10, color: "#57534e", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 16 }}>
                Distribución por Tipo
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {tiposOrden.map((tipo) => {
                  const count = (stats.porTipo as Record<string, number>)[tipo] ?? 0;
                  if (!count) return null;
                  return (
                    <div key={tipo} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "#111008", border: `1px solid ${BORDER}`,
                      borderRadius: 8, padding: "8px 14px",
                    }}>
                      <span style={{ fontSize: 14 }}>{TIPO_ICON[tipo]}</span>
                      <div>
                        <div style={{ fontSize: 12, color: "white", fontWeight: 600 }}>{TIPO_LABEL[tipo]}</div>
                        <div style={{ fontSize: 10, color: "#57534e", fontFamily: "monospace" }}>{count} nodo{count !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Módulos cubiertos */}
          {stats && stats.modulosCubiertos.length > 0 && (
            <section>
              <div style={{ fontSize: 10, color: "#57534e", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 12 }}>
                Módulos Documentados
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {stats.modulosCubiertos.map((m) => (
                  <span key={m} style={{
                    fontSize: 11, fontFamily: "monospace", fontWeight: 700,
                    padding: "4px 12px", borderRadius: 20,
                    background: `${GOLD}12`, color: GOLD,
                    border: `1px solid ${GOLD}30`,
                  }}>
                    {m}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Buscador semántico */}
          <section>
            <div style={{ fontSize: 10, color: "#57534e", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 12 }}>
              Búsqueda Semántica
            </div>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="¿Cómo funciona NEXO? ¿Por qué se eligió Groq? ¿Qué es el Decay Engine?"
                style={{
                  width: "100%", padding: "12px 16px",
                  background: "#111008", border: `1px solid ${BORDER}`,
                  borderRadius: 10, color: "white", fontSize: 13,
                  fontFamily: "monospace", outline: "none",
                  boxSizing: "border-box",
                  borderColor: query.length >= 2 ? `${GOLD}60` : BORDER,
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => { e.target.style.borderColor = `${GOLD}80`; }}
                onBlur={(e)  => { e.target.style.borderColor = query.length >= 2 ? `${GOLD}60` : BORDER; }}
              />
              {searching && (
                <div style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  fontSize: 11, color: GOLD, fontFamily: "monospace",
                }}>
                  buscando...
                </div>
              )}
            </div>

            {/* Resultados */}
            {searched && (
              <div style={{ marginTop: 16 }}>
                {results.length === 0 && !searching ? (
                  <div style={{
                    textAlign: "center", padding: "32px 0",
                    color: "#57534e", fontSize: 12, fontFamily: "monospace",
                  }}>
                    Sin resultados para &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {results.map((r) => (
                      <NodeCard key={r.id} node={r} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {!searched && (
              <div style={{
                marginTop: 12, fontSize: 11, color: "#57534e", fontFamily: "monospace", lineHeight: 1.7,
              }}>
                Escribe al menos 2 caracteres para buscar en los {stats?.totalNodos ?? ""} nodos del corpus.<br />
                El motor combina embeddings Gemini + scoring por keywords y uso previo.
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}
