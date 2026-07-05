"use client";

/**
 * SOFIAA — N.O.R.A Observer Panel
 * Sprint I-0 · "Fiat lux"
 *
 * Visor de datos recolectados en Firestore:
 *   - usuarios/{uid}               → perfiles y roles
 *   - users/{uid}/pipeline_events  → interacciones por usuario
 *   - users/{uid}/memory/long_term → memoria persistente
 */

import { useEffect, useState } from "react";

// ── Tipos ──────────────────────────────────────────────────────────────────

interface UsuarioDoc {
  uid:    string;
  nombre: string;
  rol:    string;
}

interface PipelineEvent {
  id:             string;
  timestamp:      number;
  messageSnippet: string;
  taskType:       string;
  provider:       string;
  confidence:     number;
  cacheLayer:     string;
  latencyMs:      number;
  date:           string;
}

interface UserData {
  uid:        string;
  nombre:     string;
  rol:        string;
  eventos:    PipelineEvent[];
  hasMemory:  boolean;
  memorySnip: string;
}

// ── Estilos base ───────────────────────────────────────────────────────────

const DARK   = "#09090F";
const CARD   = "#111127";
const CARD2  = "#1A1A35";
const ROSA   = "#F472B6";
const LILA   = "#A855F7";
const AZUL   = "#60A5FA";
const SUCCESS = "#34D399";
const WARN   = "#FBBF24";
const WHITE  = "#FFFFFF";
const GRAY   = "#9CA3AF";
const LGRAY  = "#4B5563";

const chip = (color: string) => ({
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 999,
  background: `${color}22`,
  color,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.5px",
  border: `1px solid ${color}44`,
});

const taskColor: Record<string, string> = {
  conversational: AZUL,
  data_query:     LILA,
  creative:       ROSA,
  analytical:     SUCCESS,
  navigation:     WARN,
  unknown:        GRAY,
};

// ── Componente ─────────────────────────────────────────────────────────────

export default function NoraPanel({ onClose }: { onClose: () => void }) {
  const [users, setUsers]       = useState<UserData[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab]           = useState<"users" | "events" | "dist">("users");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { db }           = await import("@/lib/firebase");
      const { collection, getDocs, doc, getDoc } = await import("firebase/firestore");

      // 1. Leer todos los usuarios
      const usuariosSnap = await getDocs(collection(db, "usuarios"));
      const usuarioDocs: UsuarioDoc[] = usuariosSnap.docs.map(d => ({
        uid:    d.id,
        nombre: (d.data().nombre as string) ?? "Sin nombre",
        rol:    (d.data().rol    as string) ?? "user",
      }));

      // 2. Para cada usuario: pipeline_events + memory
      const results: UserData[] = await Promise.all(
        usuarioDocs.map(async (u) => {
          // Pipeline events
          let eventos: PipelineEvent[] = [];
          try {
            const evSnap = await getDocs(collection(db, "users", u.uid, "pipeline_events"));
            eventos = evSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PipelineEvent, "id">) }));
            eventos.sort((a, b) => b.timestamp - a.timestamp);
          } catch { /* best-effort */ }

          // Memory
          let hasMemory  = false;
          let memorySnip = "";
          try {
            const memSnap = await getDoc(doc(db, "users", u.uid, "memory", "long_term"));
            if (memSnap.exists()) {
              hasMemory  = true;
              memorySnip = ((memSnap.data().content as string) ?? "").slice(0, 120);
            }
          } catch { /* best-effort */ }

          return { ...u, eventos, hasMemory, memorySnip };
        })
      );

      // Ordenar por eventos desc
      results.sort((a, b) => b.eventos.length - a.eventos.length);
      setUsers(results);
    } catch (e) {
      setError("Error cargando datos: " + String(e));
    } finally {
      setLoading(false);
    }
  }

  // ── Stats globales ─────────────────────────────────────────────────────

  const totalEventos = users.reduce((s, u) => s + u.eventos.length, 0);
  const totalMemory  = users.filter(u => u.hasMemory).length;
  const allEvents    = users.flatMap(u => u.eventos).sort((a, b) => b.timestamp - a.timestamp);

  const taskDist: Record<string, number> = {};
  const provDist:  Record<string, number> = {};
  const cacheDist: Record<string, number> = {};
  let totalLatency = 0;
  for (const ev of allEvents) {
    taskDist[ev.taskType]   = (taskDist[ev.taskType]   ?? 0) + 1;
    provDist[ev.provider]   = (provDist[ev.provider]   ?? 0) + 1;
    cacheDist[ev.cacheLayer] = (cacheDist[ev.cacheLayer] ?? 0) + 1;
    totalLatency += ev.latencyMs ?? 0;
  }
  const avgLatency = allEvents.length ? Math.round(totalLatency / allEvents.length) : 0;

  const selectedUser = users.find(u => u.uid === selected);

  // ── Render helpers ─────────────────────────────────────────────────────

  function StatCard({ label, val, color = WHITE, sub }: { label: string; val: string | number; color?: string; sub?: string }) {
    return (
      <div style={{ background: CARD, borderRadius: 14, padding: "16px 18px", minWidth: 110, flex: 1 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "Arial, sans-serif", lineHeight: 1 }}>{val}</div>
        <div style={{ fontSize: 11, color: GRAY, marginTop: 6, fontFamily: "Arial, sans-serif" }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: LGRAY, marginTop: 2, fontFamily: "Arial, sans-serif" }}>{sub}</div>}
      </div>
    );
  }

  function DistBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: WHITE, fontFamily: "Arial, sans-serif" }}>{label}</span>
          <span style={{ fontSize: 11, color, fontFamily: "Arial, sans-serif", fontWeight: 700 }}>{count} ({pct}%)</span>
        </div>
        <div style={{ height: 5, background: CARD2, borderRadius: 999 }}>
          <div style={{ height: 5, width: `${pct}%`, background: color, borderRadius: 999, transition: "width 0.6s ease" }} />
        </div>
      </div>
    );
  }

  const rolColor: Record<string, string> = {
    admin: ROSA, director: LILA, vp: AZUL, user: GRAY,
  };

  // ── Main render ────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: DARK, borderRadius: 24,
          border: "1px solid rgba(168,85,247,0.25)",
          boxShadow: "0 0 60px rgba(168,85,247,0.15), 0 24px 80px rgba(0,0,0,0.6)",
          width: "100%", maxWidth: 820, maxHeight: "92vh",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid rgba(168,85,247,0.15)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, fontFamily: "Arial, sans-serif",
                color: LILA, letterSpacing: 3, textTransform: "uppercase",
              }}>N.O.R.A</span>
              <span style={{ ...chip(SUCCESS), fontSize: 9 }}>LIVE</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: WHITE, fontFamily: "Arial, sans-serif", marginTop: 2 }}>
              Núcleo de Observación y Análisis
            </div>
            <div style={{ fontSize: 11, color: GRAY, fontFamily: "Arial, sans-serif" }}>
              Datos recolectados de usuarios en producción
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10, padding: "8px 14px", color: GRAY, cursor: "pointer",
              fontSize: 13, fontFamily: "Arial, sans-serif",
            }}
          >Cerrar ✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: GRAY, fontFamily: "Arial, sans-serif" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>
              Cargando datos de Firestore...
            </div>
          ) : error ? (
            <div style={{ padding: 32, color: ROSA, fontFamily: "Arial, sans-serif", fontSize: 13 }}>{error}</div>
          ) : (
            <div style={{ padding: "20px 24px" }}>

              {/* Stat cards */}
              <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                <StatCard label="Usuarios registrados" val={users.length} color={LILA} />
                <StatCard label="Total de interacciones" val={totalEventos} color={ROSA} />
                <StatCard label="Latencia promedio" val={`${avgLatency}ms`} color={AZUL} />
                <StatCard label="Con memoria activa" val={totalMemory} color={SUCCESS} sub={`de ${users.length} usuarios`} />
                <StatCard label="Cache hit rate"
                  val={allEvents.length ? `${Math.round(((cacheDist.exact ?? 0) + (cacheDist.semantic ?? 0)) / allEvents.length * 100)}%` : "—"}
                  color={WARN} />
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                {(["users", "events", "dist"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    padding: "6px 16px", borderRadius: 999, border: "none", cursor: "pointer",
                    fontFamily: "Arial, sans-serif", fontSize: 12, fontWeight: 700,
                    background: tab === t ? LILA : CARD2,
                    color: tab === t ? WHITE : GRAY,
                    transition: "all 0.2s",
                  }}>
                    {t === "users" ? "👤 Usuarios" : t === "events" ? "⚡ Últimos eventos" : "📊 Distribución"}
                  </button>
                ))}
              </div>

              {/* Tab: Usuarios */}
              {tab === "users" && (
                <div>
                  {users.length === 0 ? (
                    <div style={{ color: GRAY, fontFamily: "Arial, sans-serif", padding: "24px 0", textAlign: "center" }}>
                      Aún no hay usuarios registrados con datos.
                    </div>
                  ) : users.map(u => (
                    <div key={u.uid}
                      onClick={() => setSelected(selected === u.uid ? null : u.uid)}
                      style={{
                        background: selected === u.uid ? CARD2 : CARD,
                        borderRadius: 12, padding: "14px 16px", marginBottom: 8, cursor: "pointer",
                        border: `1px solid ${selected === u.uid ? LILA + "44" : "transparent"}`,
                        transition: "all 0.2s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 999,
                            background: `${rolColor[u.rol] ?? GRAY}22`,
                            border: `1.5px solid ${rolColor[u.rol] ?? GRAY}55`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 14, color: rolColor[u.rol] ?? GRAY,
                            fontWeight: 800, fontFamily: "Arial, sans-serif",
                          }}>
                            {u.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: WHITE, fontSize: 14, fontFamily: "Arial, sans-serif" }}>{u.nombre}</div>
                            <div style={{ fontSize: 11, color: GRAY, fontFamily: "Arial, sans-serif" }}>{u.uid.slice(0, 16)}…</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={chip(rolColor[u.rol] ?? GRAY)}>{u.rol}</span>
                          <span style={chip(u.eventos.length > 0 ? ROSA : LGRAY)}>
                            {u.eventos.length} eventos
                          </span>
                          {u.hasMemory && <span style={chip(SUCCESS)}>memoria ✓</span>}
                        </div>
                      </div>

                      {/* Expanded: últimos 3 eventos del usuario */}
                      {selected === u.uid && u.eventos.length > 0 && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${LGRAY}22` }}>
                          {u.hasMemory && u.memorySnip && (
                            <div style={{
                              background: `${SUCCESS}11`, border: `1px solid ${SUCCESS}22`,
                              borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 11,
                              color: SUCCESS, fontFamily: "Arial, sans-serif",
                            }}>
                              💭 Memoria: {u.memorySnip}{u.memorySnip.length >= 120 ? "…" : ""}
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: GRAY, fontFamily: "Arial, sans-serif", marginBottom: 6 }}>
                            Últimas {Math.min(3, u.eventos.length)} interacciones:
                          </div>
                          {u.eventos.slice(0, 3).map(ev => (
                            <div key={ev.id} style={{
                              display: "flex", gap: 8, alignItems: "flex-start",
                              padding: "6px 0", borderBottom: `1px solid ${LGRAY}22`,
                            }}>
                              <span style={chip(taskColor[ev.taskType] ?? GRAY)}>{ev.taskType}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, color: WHITE, fontFamily: "Arial, sans-serif" }}>
                                  "{ev.messageSnippet}"
                                </div>
                                <div style={{ fontSize: 10, color: LGRAY, fontFamily: "Arial, sans-serif", marginTop: 2 }}>
                                  {ev.provider} · {ev.cacheLayer} · {ev.latencyMs}ms · {ev.date}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: Últimos eventos globales */}
              {tab === "events" && (
                <div>
                  {allEvents.length === 0 ? (
                    <div style={{ color: GRAY, fontFamily: "Arial, sans-serif", padding: "24px 0", textAlign: "center" }}>
                      Aún no hay eventos registrados.
                    </div>
                  ) : allEvents.slice(0, 30).map(ev => {
                    const owner = users.find(u => u.eventos.some(e => e.id === ev.id));
                    return (
                      <div key={ev.id} style={{
                        display: "flex", gap: 10, alignItems: "flex-start",
                        padding: "10px 12px", background: CARD, borderRadius: 10,
                        marginBottom: 6, border: "1px solid transparent",
                      }}>
                        <span style={chip(taskColor[ev.taskType] ?? GRAY)}>{ev.taskType}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: WHITE, fontFamily: "Arial, sans-serif" }}>
                            "{ev.messageSnippet}"
                          </div>
                          <div style={{ fontSize: 10, color: LGRAY, fontFamily: "Arial, sans-serif", marginTop: 3, display: "flex", gap: 10 }}>
                            <span>{owner?.nombre ?? "—"}</span>
                            <span>·</span>
                            <span>{ev.provider}</span>
                            <span>·</span>
                            <span style={{ color: ev.cacheLayer === "miss" ? WARN : SUCCESS }}>{ev.cacheLayer}</span>
                            <span>·</span>
                            <span>{ev.latencyMs}ms</span>
                            <span>·</span>
                            <span>{ev.date}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab: Distribución */}
              {tab === "dist" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {/* Task types */}
                  <div style={{ background: CARD, borderRadius: 14, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: LILA, marginBottom: 14,
                      fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 1 }}>
                      Tipos de tarea
                    </div>
                    {Object.entries(taskDist).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                      <DistBar key={k} label={k} count={v} total={allEvents.length} color={taskColor[k] ?? GRAY} />
                    ))}
                    {Object.keys(taskDist).length === 0 && (
                      <div style={{ color: LGRAY, fontSize: 12, fontFamily: "Arial, sans-serif" }}>Sin datos aún</div>
                    )}
                  </div>

                  {/* Providers */}
                  <div style={{ background: CARD, borderRadius: 14, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: AZUL, marginBottom: 14,
                      fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 1 }}>
                      Proveedores LLM
                    </div>
                    {Object.entries(provDist).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                      <DistBar key={k} label={k} count={v} total={allEvents.length} color={AZUL} />
                    ))}

                    <div style={{ fontSize: 12, fontWeight: 700, color: SUCCESS, margin: "18px 0 10px",
                      fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 1 }}>
                      Cache layer
                    </div>
                    {Object.entries(cacheDist).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                      <DistBar key={k} label={k} count={v} total={allEvents.length}
                        color={k === "exact" ? SUCCESS : k === "semantic" ? AZUL : WARN} />
                    ))}
                  </div>

                  {/* Roles */}
                  <div style={{ background: CARD, borderRadius: 14, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: ROSA, marginBottom: 14,
                      fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 1 }}>
                      Roles de usuarios
                    </div>
                    {Object.entries(
                      users.reduce((acc, u) => { acc[u.rol] = (acc[u.rol] ?? 0) + 1; return acc; }, {} as Record<string, number>)
                    ).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                      <DistBar key={k} label={k} count={v} total={users.length} color={rolColor[k] ?? GRAY} />
                    ))}
                  </div>

                  {/* Actividad por día */}
                  <div style={{ background: CARD, borderRadius: 14, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: WARN, marginBottom: 14,
                      fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 1 }}>
                      Actividad por fecha
                    </div>
                    {(() => {
                      const byDate: Record<string, number> = {};
                      for (const ev of allEvents) {
                        byDate[ev.date] = (byDate[ev.date] ?? 0) + 1;
                      }
                      const sorted = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
                      const max = sorted.reduce((m, [, v]) => Math.max(m, v), 1);
                      return sorted.map(([date, count]) => (
                        <DistBar key={date} label={date} count={count} total={max} color={WARN} />
                      ));
                    })()}
                    {allEvents.length === 0 && (
                      <div style={{ color: LGRAY, fontSize: 12, fontFamily: "Arial, sans-serif" }}>Sin datos aún</div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 24px",
          borderTop: "1px solid rgba(168,85,247,0.12)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: LGRAY, fontFamily: "Arial, sans-serif", letterSpacing: 1 }}>
            N.O.R.A · Sprint I-0 · Datos en tiempo real desde Firestore
          </span>
          <button onClick={load} style={{
            background: `${LILA}22`, border: `1px solid ${LILA}44`, borderRadius: 8,
            padding: "5px 14px", color: LILA, cursor: "pointer",
            fontSize: 11, fontFamily: "Arial, sans-serif", fontWeight: 700,
          }}>
            ↻ Refrescar
          </button>
        </div>
      </div>
    </div>
  );
}
