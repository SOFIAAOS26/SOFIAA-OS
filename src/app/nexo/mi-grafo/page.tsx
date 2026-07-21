"use client";

/**
 * N.E.X.O. — Mi Grafo (Privacy Dashboard)
 * Sprint N-7
 *
 * Visualización y control del grafo de conocimiento personal.
 * - Lista de nodos por peso (tiempo real via Firestore)
 * - Stats: total, categorías, peso promedio
 * - Borrado individual y limpieza total
 */

import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  subscribeNexoNodes,
  deleteNexoNodeClient,
  clearAllNexoNodesClient,
} from "@/lib/nexo/client";
import type { NexoNode, NexoCategory } from "@/types/nexo";
import { NEXO_DECAY_DAYS } from "@/types/nexo";

// ── Insight card (Sprint M-0) ─────────────────────────────────────────────────
function InsightCard({
  node, onDelete, deleting,
}: { node: NexoNode; onDelete: () => void; deleting: boolean }) {
  const pattern = node.entities?.extra?.pattern ?? "observación";
  const PATTERN_ICON: Record<string, string> = {
    curiosidad:          "🔭",
    hábito:              "🔄",
    interés_emergente:   "🌱",
    conexión_temática:   "🔗",
    observación:         "💡",
  };
  const icon = PATTERN_ICON[pattern] ?? "💡";

  return (
    <div style={{
      background:    "rgba(251,191,36,0.05)",
      border:        "1px solid rgba(251,191,36,0.25)",
      borderLeft:    "3px solid #FBBF24",
      borderRadius:  14, padding: "13px 14px",
      opacity:       deleting ? 0.4 : 1,
      transition:    "opacity 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.2 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#FDE68A",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {node.title}
          </p>
          <p style={{
            margin: 0, fontSize: 11, color: "rgba(253,230,138,0.65)", lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {node.summary}
          </p>
        </div>
        <button
          onClick={onDelete}
          disabled={deleting}
          title="Borrar insight"
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(253,230,138,0.25)", fontSize: 14, padding: "2px 4px",
            transition: "color 0.15s", flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(253,230,138,0.25)")}
        >
          ✕
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{
          fontSize: 10, padding: "2px 7px", borderRadius: 99,
          background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)",
          color: "#FBBF24", fontWeight: 600,
        }}>
          ✨ Reflexión
        </span>
        <span style={{
          fontSize: 10, padding: "2px 7px", borderRadius: 99,
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(253,230,138,0.5)",
        }}>
          {pattern.replace(/_/g, " ")}
        </span>
        <span style={{ fontSize: 10, marginLeft: "auto", color: "rgba(253,230,138,0.3)" }}>
          {daysAgo(node.capturedAt)}
        </span>
      </div>
    </div>
  );
}

// ── Constantes visuales ───────────────────────────────────────────────────────
const CAT_META: Record<NexoCategory, { label: string; icon: string; color: string }> = {
  food:           { label: "Comida",         icon: "🍜", color: "#F59E0B" },
  work:           { label: "Trabajo",        icon: "💼", color: "#60A5FA" },
  travel:         { label: "Viaje",          icon: "✈️", color: "#2DD4BF" },
  shopping:       { label: "Compras",        icon: "🛍️", color: "#34D399" },
  research:       { label: "Investigación",  icon: "🔬", color: "#818CF8" },
  social:         { label: "Social",         icon: "👥", color: "#F472B6" },
  media:          { label: "Media",          icon: "🎬", color: "#A855F7" },
  brand_identity: { label: "Brand DNA",      icon: "🧬", color: "#f97316" },
  other:          { label: "Otro",           icon: "📌", color: "#94A3B8" },
};

function weightColor(w: number): string {
  if (w >= 0.7) return "#34D399";
  if (w >= 0.4) return "#F59E0B";
  return "#F87171";
}

function daysAgo(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 86_400_000);
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  return `hace ${d}d`;
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 80,
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${color ?? "rgba(168,85,247,0.2)"}`,
      borderRadius: 12, padding: "10px 14px", textAlign: "center",
    }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: color ?? "#A855F7", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "rgba(226,217,243,0.45)", marginTop: 3, letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}

// ── Node card ─────────────────────────────────────────────────────────────────
function NodeCard({
  node, onDelete, deleting,
}: { node: NexoNode; onDelete: () => void; deleting: boolean }) {
  const meta   = CAT_META[node.category] ?? CAT_META.other;
  const halfLife = NEXO_DECAY_DAYS[node.category] ?? 14;
  const daysLeft = Math.max(0, Math.round(
    halfLife * Math.log(node.weight / 0.05) / Math.log(2)
  ));

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${meta.color}22`,
      borderLeft: `3px solid ${meta.color}`,
      borderRadius: 14, padding: "13px 14px",
      opacity: deleting ? 0.4 : 1,
      transition: "opacity 0.2s",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.2 }}>{meta.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#E2D9F3",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {node.title}
          </p>
          <p style={{
            margin: 0, fontSize: 11, color: "rgba(226,217,243,0.5)", lineHeight: 1.4,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {node.summary}
          </p>
        </div>
        <button
          onClick={onDelete}
          disabled={deleting}
          title="Borrar nodo"
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(226,217,243,0.25)", fontSize: 14, padding: "2px 4px",
            transition: "color 0.15s", flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(226,217,243,0.25)")}
        >
          ✕
        </button>
      </div>

      {/* Weight bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)" }}>
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${Math.round(node.weight * 100)}%`,
            background: weightColor(node.weight),
            transition: "width 0.4s",
          }} />
        </div>
        <span style={{ fontSize: 10, color: weightColor(node.weight), fontWeight: 700, flexShrink: 0 }}>
          {Math.round(node.weight * 100)}%
        </span>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 10, padding: "2px 7px", borderRadius: 99,
          background: `${meta.color}15`, border: `1px solid ${meta.color}30`,
          color: meta.color, fontWeight: 600,
        }}>
          {meta.label}
        </span>
        {/* Sprint M-2: badge de atención */}
        {(node.reinforceCount ?? 0) > 0 && (
          <span style={{
            fontSize: 10, padding: "2px 7px", borderRadius: 99,
            background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.3)",
            color: "#2DD4BF", fontWeight: 700,
          }}>
            🔁 {node.reinforceCount}
          </span>
        )}
        {node.entities.price && (
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "rgba(255,255,255,0.06)", color: "rgba(226,217,243,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
            💰 {node.entities.price}
          </span>
        )}
        {node.entities.place && (
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "rgba(255,255,255,0.06)", color: "rgba(226,217,243,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
            📍 {node.entities.place}
          </span>
        )}
        <span style={{ fontSize: 10, marginLeft: "auto", color: "rgba(226,217,243,0.3)" }}>
          {daysAgo(node.capturedAt)} · expira ~{daysLeft}d
        </span>
      </div>

      {/* Link al original */}
      {node.url && (
        <a
          href={node.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block", marginTop: 8,
            fontSize: 10, color: "rgba(168,85,247,0.6)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            textDecoration: "none",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#A855F7")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(168,85,247,0.6)")}
        >
          🔗 {node.url}
        </a>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function MiGrafoPage() {
  const [user,        setUser]        = useState<User | null>(null);
  const [nodes,       setNodes]       = useState<NexoNode[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [deleting,    setDeleting]    = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [clearing,    setClearing]    = useState(false);
  const [filterCat,   setFilterCat]   = useState<NexoCategory | "all">("all");

  // Auth
  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      if (!u) setLoading(false);
    });
  }, []);

  // Suscripción Firestore
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub = subscribeNexoNodes(
      user.uid,
      data => { setNodes(data); setLoading(false); },
      ()   => setLoading(false),
    );
    return unsub;
  }, [user]);

  // Borrar nodo
  const handleDelete = useCallback(async (nodeId: string) => {
    if (!user) return;
    setDeleting(prev => new Set(prev).add(nodeId));
    try {
      await deleteNexoNodeClient(user.uid, nodeId);
    } finally {
      setDeleting(prev => { const s = new Set(prev); s.delete(nodeId); return s; });
    }
  }, [user]);

  // Limpiar todo
  const handleClearAll = useCallback(async () => {
    if (!user || clearing) return;
    setClearing(true);
    try {
      await clearAllNexoNodesClient(user.uid, nodes);
      setShowConfirm(false);
    } finally {
      setClearing(false);
    }
  }, [user, nodes, clearing]);

  // ── Separar insights de nodos capturados ─────────────────────────────────
  const insightNodes   = nodes.filter(n => n.type === "insight");
  const capturedNodes  = nodes.filter(n => !n.type || n.type === "captured");

  // ── Stats (sobre capturados, no insights) ────────────────────────────────
  const totalNodes  = nodes.length;
  const avgWeight   = capturedNodes.length > 0
    ? Math.round(capturedNodes.reduce((s, n) => s + n.weight, 0) / capturedNodes.length * 100)
    : 0;
  const topCat = capturedNodes.length > 0
    ? Object.entries(
        capturedNodes.reduce<Record<string, number>>((acc, n) => {
          acc[n.category] = (acc[n.category] ?? 0) + 1; return acc;
        }, {})
      ).sort((a, b) => b[1] - a[1])[0]
    : null;

  // ── Filtro (solo sobre capturados) ───────────────────────────────────────
  const visibleCaptured = filterCat === "all"
    ? capturedNodes
    : capturedNodes.filter(n => n.category === filterCat);

  const activeCats = [...new Set(capturedNodes.map(n => n.category))];

  // ── Estilos base ─────────────────────────────────────────────────────────
  const bg = "linear-gradient(145deg, #0F0B1E 0%, #1A0F2E 55%, #0F1628 100%)";
  const ff = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  // ── Render ───────────────────────────────────────────────────────────────
  if (!user && !loading) {
    return (
      <div style={{ minHeight: "100dvh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff, color: "#E2D9F3" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
          <p style={{ fontSize: 15 }}>Inicia sesión para ver tu grafo</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: bg, fontFamily: ff, color: "#E2D9F3" }}>
      {/* Header */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid rgba(168,85,247,0.12)",
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(15,11,30,0.85)", backdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 600, margin: "0 auto" }}>
          <span style={{ fontSize: 22 }}>🧠</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Mi Grafo</h1>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(226,217,243,0.4)" }}>
              N.E.X.O. · Memoria personal
            </p>
          </div>
          {totalNodes > 0 && (
            <button
              onClick={() => setShowConfirm(true)}
              style={{
                marginLeft: "auto", padding: "6px 12px", borderRadius: 8,
                background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)",
                color: "#F87171", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              🗑️ Limpiar todo
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px 16px 40px" }}>

        {/* Stats */}
        {!loading && totalNodes > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <StatChip label="NODOS"      value={totalNodes} color="#A855F7" />
            <StatChip label="PESO PROM." value={`${avgWeight}%`} color={weightColor(avgWeight / 100)} />
            {topCat && (
              <StatChip
                label="TOP TEMA"
                value={CAT_META[topCat[0] as NexoCategory]?.icon ?? "📌"}
                color={CAT_META[topCat[0] as NexoCategory]?.color}
              />
            )}
          </div>
        )}

        {/* Filtros por categoría (solo capturados) */}
        {activeCats.length > 1 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            <button
              onClick={() => setFilterCat("all")}
              style={{
                padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: filterCat === "all" ? "rgba(168,85,247,0.25)" : "rgba(255,255,255,0.05)",
                border: filterCat === "all" ? "1px solid rgba(168,85,247,0.5)" : "1px solid rgba(255,255,255,0.1)",
                color: filterCat === "all" ? "#A855F7" : "rgba(226,217,243,0.5)",
              }}
            >
              Todos ({capturedNodes.length})
            </button>
            {activeCats.map(cat => {
              const m = CAT_META[cat];
              const count = capturedNodes.filter(n => n.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
                  style={{
                    padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: filterCat === cat ? `${m.color}22` : "rgba(255,255,255,0.05)",
                    border: filterCat === cat ? `1px solid ${m.color}55` : "1px solid rgba(255,255,255,0.1)",
                    color: filterCat === cat ? m.color : "rgba(226,217,243,0.5)",
                  }}
                >
                  {m.icon} {m.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(226,217,243,0.4)" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🧠</div>
            <p style={{ fontSize: 13 }}>Cargando grafo...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && totalNodes === 0 && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
            <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 600 }}>Tu grafo está vacío</p>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(226,217,243,0.45)", lineHeight: 1.5 }}>
              Instala la extensión de Chrome o comparte páginas desde tu móvil para empezar a capturar.
            </p>
          </div>
        )}

        {/* Sección de Insights (Sprint M-0) */}
        {!loading && insightNodes.length > 0 && (
          <>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              marginBottom: 10,
            }}>
              <span style={{ fontSize: 15 }}>✨</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#FBBF24", letterSpacing: "0.06em" }}>
                REFLEXIONES DE SOFIAA
              </span>
              <div style={{ flex: 1, height: 1, background: "rgba(251,191,36,0.15)" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {insightNodes.map(node => (
                <InsightCard
                  key={node.id}
                  node={node}
                  onDelete={() => handleDelete(node.id)}
                  deleting={deleting.has(node.id)}
                />
              ))}
            </div>
            {capturedNodes.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: 10,
              }}>
                <span style={{ fontSize: 15 }}>🧠</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(168,85,247,0.7)", letterSpacing: "0.06em" }}>
                  MEMORIA CAPTURADA
                </span>
                <div style={{ flex: 1, height: 1, background: "rgba(168,85,247,0.12)" }} />
              </div>
            )}
          </>
        )}

        {/* Nodes list (capturados) */}
        {!loading && visibleCaptured.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleCaptured.map(node => (
              <NodeCard
                key={node.id}
                node={node}
                onDelete={() => handleDelete(node.id)}
                deleting={deleting.has(node.id)}
              />
            ))}
          </div>
        )}

        {/* Info de privacidad */}
        {!loading && totalNodes > 0 && (
          <p style={{
            marginTop: 24, textAlign: "center", fontSize: 11,
            color: "rgba(226,217,243,0.25)", lineHeight: 1.5,
          }}>
            Los nodos decaen automáticamente con el tiempo.<br/>
            Solo tú puedes ver y eliminar tu grafo.
          </p>
        )}
      </div>

      {/* Modal confirmación limpiar todo */}
      {showConfirm && (
        <div
          onClick={() => setShowConfirm(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#1A0F2E", border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: 20, padding: "28px 24px", maxWidth: 320, width: "100%",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
            <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>¿Borrar todo?</p>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "rgba(226,217,243,0.55)", lineHeight: 1.5 }}>
              Se eliminarán los {totalNodes} nodos de tu grafo. SOFIAA dejará de recordar estos temas. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1, padding: "10px", borderRadius: 10,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#E2D9F3", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearing}
                style={{
                  flex: 1, padding: "10px", borderRadius: 10,
                  background: clearing ? "rgba(248,113,113,0.3)" : "rgba(248,113,113,0.15)",
                  border: "1px solid rgba(248,113,113,0.4)",
                  color: "#F87171", fontSize: 13, fontWeight: 700, cursor: clearing ? "default" : "pointer",
                }}
              >
                {clearing ? "Borrando..." : "Sí, borrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
