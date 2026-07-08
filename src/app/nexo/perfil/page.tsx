"use client";

/**
 * N.E.X.O. — Cognitive Dashboard (Sprint M-6)
 *
 * Visualiza el perfil cognitivo acumulado del usuario:
 * profundidad preferida, formalidad, afinidades temáticas y estadísticas de sesión.
 *
 * Datos: users/{uid}/cognitive_profile/v1 (Firestore, lectura en tiempo real)
 */

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { CognitiveProfile, DepthPreference } from "@/types/cognitive";
import { COGNITIVE_PROFILE_PATH } from "@/types/cognitive";

// ── Helpers de presentación ───────────────────────────────────────────────────

const DEPTH_CONFIG: Record<DepthPreference, { label: string; desc: string; color: string }> = {
  concise:  { label: "Conciso",      desc: "Respuestas cortas y directas",          color: "#34D399" },
  balanced: { label: "Balanceado",   desc: "Detalle moderado según el contexto",    color: "#60A5FA" },
  deep:     { label: "Profundo",     desc: "Explicaciones completas y detalladas",  color: "#A78BFA" },
};

const TOPIC_LABELS: Record<string, string> = {
  trabajo:     "Trabajo",
  tecnología:  "Tecnología",
  comida:      "Gastronomía",
  viaje:       "Viajes",
  compras:     "Compras",
  salud:       "Salud",
  finanzas:    "Finanzas",
  creatividad: "Creatividad",
};

const TOPIC_ICONS: Record<string, string> = {
  trabajo:     "💼",
  tecnología:  "💻",
  comida:      "🍽️",
  viaje:       "✈️",
  compras:     "🛍️",
  salud:       "🏃",
  finanzas:    "📊",
  creatividad: "🎨",
};

function formatDate(ms: number): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function daysSince(ms: number): number {
  return Math.floor((Date.now() - ms) / 86_400_000);
}

// ── Componentes de visualización ──────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14, padding: "16px 20px", flex: "1 1 0",
    }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#fff" }}>{value}</p>
      {sub && <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{sub}</p>}
    </div>
  );
}

function ScoreBar({ value, color = "#60A5FA", label }: { value: number; color?: string; label?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color }}>{pct}%</span>
        </div>
      )}
      <div style={{
        height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: 99, transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function CognitiveDashboard() {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<CognitiveProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty]     = useState(false);

  // Auth
  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u));
  }, []);

  // Suscripción en tiempo real al perfil cognitivo
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const ref  = doc(db, COGNITIVE_PROFILE_PATH(user.uid));
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        setProfile(snap.data() as CognitiveProfile);
        setEmpty(false);
      } else {
        setEmpty(true);
      }
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return unsub;
  }, [user]);

  // ── Render guards ──────────────────────────────────────────────────────────

  if (!user) return (
    <div style={pageStyle}>
      <div style={centeredStyle}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Inicia sesión para ver tu perfil cognitivo.</p>
      </div>
    </div>
  );

  if (loading) return (
    <div style={pageStyle}>
      <div style={centeredStyle}>
        <div style={spinnerStyle} />
      </div>
    </div>
  );

  if (empty || !profile) return (
    <div style={pageStyle}>
      <Header />
      <div style={{ ...centeredStyle, gap: 12 }}>
        <span style={{ fontSize: 40 }}>🧠</span>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, textAlign: "center", maxWidth: 280, margin: 0 }}>
          Tu perfil cognitivo se irá construyendo a medida que uses SOFIAA. Vuelve después de algunas conversaciones.
        </p>
      </div>
    </div>
  );

  // ── Datos preparados ───────────────────────────────────────────────────────

  const depthCfg = DEPTH_CONFIG[profile.preferredDepth];

  // Formalidad: 0 = casual, 0.5 = neutral, 1 = formal
  const formalityLabel =
    profile.formalityScore < 0.35 ? "Muy casual" :
    profile.formalityScore < 0.50 ? "Casual" :
    profile.formalityScore < 0.65 ? "Neutral" :
    profile.formalityScore < 0.80 ? "Formal" : "Muy formal";

  // Temas ordenados por score (solo los que tengan > 0.05)
  const topics = Object.entries(profile.topicAffinity ?? {})
    .filter(([, v]) => v > 0.05)
    .sort(([, a], [, b]) => b - a);

  const lastActiveDays = profile.lastActiveAt ? daysSince(profile.lastActiveAt) : null;
  const lastActiveStr  =
    lastActiveDays === 0 ? "Hoy" :
    lastActiveDays === 1 ? "Ayer" :
    lastActiveDays !== null ? `Hace ${lastActiveDays} días` : "—";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      <Header />

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 60px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Stats rápidas ── */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <StatCard label="Sesiones" value={String(profile.sessionCount || 0)} />
          <StatCard label="Última actividad" value={lastActiveStr} sub={formatDate(profile.lastActiveAt)} />
          <StatCard label="Perfil creado" value={formatDate(profile.createdAt)} />
        </div>

        {/* ── Profundidad preferida ── */}
        <Card title="Profundidad de respuesta">
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {(["concise", "balanced", "deep"] as DepthPreference[]).map(d => {
              const cfg = DEPTH_CONFIG[d];
              const active = profile.preferredDepth === d;
              return (
                <div key={d} style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10, textAlign: "center",
                  background: active ? `${cfg.color}22` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? cfg.color + "66" : "rgba(255,255,255,0.08)"}`,
                  transition: "all 0.2s",
                }}>
                  <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: active ? cfg.color : "rgba(255,255,255,0.3)" }}>
                    {cfg.label}
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: active ? `${cfg.color}99` : "rgba(255,255,255,0.2)" }}>
                    {cfg.desc}
                  </p>
                </div>
              );
            })}
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Confianza del modelo</span>
              <span style={{ fontSize: 12, color: depthCfg.color, fontWeight: 600 }}>
                {Math.round(profile.depthConfidence * 100)}%
              </span>
            </div>
            <ScoreBar value={profile.depthConfidence} color={depthCfg.color} />
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              {profile.depthConfidence < 0.3
                ? "Aún aprendiendo — sigue conversando para afinar."
                : profile.depthConfidence < 0.7
                ? "Señal moderada — el modelo tiene una idea de tu preferencia."
                : "Alta confianza — SOFIAA ya conoce tu estilo preferido."}
            </p>
          </div>
        </Card>

        {/* ── Formalidad ── */}
        <Card title="Estilo de comunicación">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Casual</span>
            <span style={{
              fontSize: 13, fontWeight: 700, color: "#F59E0B",
              background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 99, padding: "3px 12px",
            }}>
              {formalityLabel}
            </span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Formal</span>
          </div>
          <div style={{ position: "relative" }}>
            <ScoreBar value={profile.formalityScore} color="#F59E0B" />
            {/* Indicador de neutral */}
            <div style={{
              position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)",
              width: 2, height: 14, background: "rgba(255,255,255,0.15)", borderRadius: 1,
            }} />
          </div>
        </Card>

        {/* ── Afinidades temáticas ── */}
        <Card title="Intereses detectados">
          {topics.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0 }}>
              Aún sin suficientes conversaciones para detectar intereses.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {topics.map(([topic, score]) => (
                <div key={topic}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>{TOPIC_ICONS[topic] ?? "🔹"}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", flex: 1 }}>
                      {TOPIC_LABELS[topic] ?? topic}
                    </span>
                    <span style={{ fontSize: 12, color: "#2DD4BF", fontWeight: 600 }}>
                      {Math.round(score * 100)}%
                    </span>
                  </div>
                  <ScoreBar value={score} color="#2DD4BF" />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Nota al pie ── */}
        <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", margin: 0 }}>
          Este perfil se actualiza automáticamente después de cada conversación. No almacena el contenido de tus mensajes.
        </p>
      </div>
    </div>
  );
}

// ── Sub-componentes layout ────────────────────────────────────────────────────

function Header() {
  return (
    <div style={{ padding: "40px 20px 24px", maxWidth: 680, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>🧠</span>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#fff" }}>Perfil Cognitivo</h1>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
        Cómo SOFIAA entiende tu estilo de comunicación y tus intereses.
      </p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 18, padding: "20px 22px",
    }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── Estilos base ──────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: "100dvh",
  background: "#0A0A0F",
  color: "#fff",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const centeredStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  minHeight: "60vh", gap: 16,
};

const spinnerStyle: React.CSSProperties = {
  width: 28, height: 28,
  border: "2px solid rgba(255,255,255,0.1)",
  borderTopColor: "#2DD4BF",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};
