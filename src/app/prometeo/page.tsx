"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  subscribeClientes, subscribeMetricas, subscribeFinanzas,
  calcKPIs, subscribeCalendario,
} from "@/lib/marketing/firestore";
import {
  subscribeGoals, subscribeCreativeMemory, subscribeDirectorBriefs,
} from "@/lib/prometeo/firestore";
import type { SmmCliente, SmmMetrica, SmmFinanza, SmmCalendario } from "@/lib/marketing/types";
import { ESTADO_BADGE } from "@/lib/marketing/types";
import type { BrandGoal, CreativeMemory, DirectorBrief } from "@/extensions/prometeo/schema";

// ── Fire palette ──────────────────────────────────────────────────────────────
const FIRE    = "#f97316";
const GREEN   = "#22c55e";
const YELLOW  = "#f59e0b";
const RED     = "#ef4444";
const BLUE    = "#60a5fa";
const PURPLE  = "#a855f7";
const TEAL    = "#14b8a6";
const GOLD    = "#eab308";
const TEXT    = "#e2e8f0";
const MUTED   = "#64748b";
const CARD    = "#14141f";
const CARD2   = "#1a1a2e";
const BORDER  = "#1e1e2e";
const BG      = "#09090f";

const MES_ACTUAL = new Date().toISOString().slice(0, 7);

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = FIRE, icon }: {
  label: string; value: string; sub?: string; color?: string; icon: string;
}) {
  return (
    <div style={{
      background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`,
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8, background: `${color}20`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
        }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.5px" }}>
          {label.toUpperCase()}
        </span>
      </div>
      <p style={{ fontSize: 26, fontWeight: 800, color, margin: 0, letterSpacing: "-0.5px" }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{sub}</p>}
    </div>
  );
}

// ── Module card activo ────────────────────────────────────────────────────────
function ModuleCard({ href, icon, label, desc, color, stat }: {
  href: string; icon: string; label: string; desc: string; color: string; stat?: string;
}) {
  return (
    <Link href={href} style={{
      background: CARD2, borderRadius: 12, border: `1px solid ${color}33`,
      padding: "14px 16px", textDecoration: "none",
      display: "flex", flexDirection: "column", gap: 6, transition: "all 0.15s",
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = color; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${color}33`; }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: GREEN, letterSpacing: "0.5px",
          background: `${GREEN}18`, padding: "1px 6px", borderRadius: 4,
        }}>ACTIVO</span>
      </div>
      <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0 }}>{label}</p>
      <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>{desc}</p>
      {stat && (
        <p style={{ fontSize: 11, fontWeight: 700, color, margin: 0 }}>{stat}</p>
      )}
    </Link>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function PrometeoHome() {
  const { activeWorkspaceId } = useWorkspace();

  // Marketing data
  const [clientes,   setClientes]   = useState<SmmCliente[]>([]);
  const [metricas,   setMetricas]   = useState<SmmMetrica[]>([]);
  const [finanzas,   setFinanzas]   = useState<SmmFinanza[]>([]);
  const [calendario, setCalendario] = useState<SmmCalendario[]>([]);

  // PROMETEO intelligence data
  const [goals,    setGoals]    = useState<BrandGoal[]>([]);
  const [memories, setMemories] = useState<CreativeMemory[]>([]);
  const [briefs,   setBriefs]   = useState<DirectorBrief[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    let ready = 0;
    const check = () => { ready++; if (ready >= 4) setLoading(false); };

    const u1 = subscribeClientes(activeWorkspaceId,              (d) => { setClientes(d);   check(); });
    const u2 = subscribeMetricas(activeWorkspaceId, MES_ACTUAL,  (d) => { setMetricas(d);   check(); });
    const u3 = subscribeFinanzas(activeWorkspaceId, MES_ACTUAL,  (d) => { setFinanzas(d);   check(); });
    const u4 = subscribeCalendario(activeWorkspaceId,            (d) => { setCalendario(d); check(); });

    // PROMETEO streams (no bloquean el loading)
    const u5 = subscribeGoals(activeWorkspaceId,          (d) => setGoals(d));
    const u6 = subscribeCreativeMemory(activeWorkspaceId, (d) => setMemories(d));
    const u7 = subscribeDirectorBriefs(activeWorkspaceId, (d) => setBriefs(d));

    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); };
  }, [activeWorkspaceId]);

  const kpis       = calcKPIs(metricas, finanzas);
  const activos    = clientes.filter((c) => c.estado === "Activo").length;
  const pendientes = calendario.filter((e) => ["En revisión", "En producción"].includes(e.estado)).length;
  const publicados = calendario.filter((e) => e.estado === "Publicado").length;
  const fmt        = (n: number, prefix = "") => prefix + new Intl.NumberFormat("es-MX").format(Math.round(n));

  // PROMETEO stats
  const goalsActivos    = goals.filter((g) => g.estado === "activo").length;
  const avgRoas         = memories.length
    ? (memories.slice(0, 10).reduce((s, m) => s + m.roasLogrado, 0) / Math.min(10, memories.length)).toFixed(1)
    : "—";
  const lastBrief       = briefs[0];
  const topCreativo     = memories[0];

  if (loading) return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ background: CARD, borderRadius: 14, height: 110, animation: "pulse 1.4s ease-in-out infinite" }} />
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: 28, color: TEXT }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🔥</span>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: TEXT, margin: 0, letterSpacing: "-0.5px" }}>
              Centro de Mando
            </h1>
            <span style={{
              background: `${FIRE}22`, color: FIRE, fontSize: 9, fontWeight: 700,
              padding: "2px 8px", borderRadius: 99, letterSpacing: "1px",
            }}>PROMETEO v2.0</span>
          </div>
          <p style={{ fontSize: 12, color: MUTED, margin: "4px 0 0" }}>
            {new Date().toLocaleDateString("es-MX", { weekday: "long", month: "long", day: "numeric" })} ·{" "}
            {activos} clientes activos · {goalsActivos} objetivos en curso
          </p>
        </div>
        <Link href="/prometeo/director" style={{
          background: `linear-gradient(135deg, ${GOLD}, ${FIRE})`,
          color: "#fff", borderRadius: 10, padding: "9px 18px",
          fontSize: 13, fontWeight: 700, textDecoration: "none",
          boxShadow: `0 0 16px ${GOLD}44`,
        }}>
          ⚡ Brief del día
        </Link>
      </div>

      {/* ── KPI Grid (marketing) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
        <KpiCard icon="🏢" label="Clientes activos"   value={String(activos)}                            color={FIRE}   sub={`${clientes.length} total en cartera`} />
        <KpiCard icon="💵" label="Ingresos mes"        value={fmt(kpis.ingresos, "$")}                    color={GREEN}  sub="Honorarios facturados" />
        <KpiCard icon="📊" label="ROAS"                value={`${kpis.roas.toFixed(2)}x`}                 color={kpis.roas >= 3 ? GREEN : RED} sub="Meta: ≥ 3x" />
        <KpiCard icon="🎯" label="CPL"                 value={kpis.cpl > 0 ? fmt(kpis.cpl, "$") : "—"}   color={kpis.cpl <= 100 && kpis.cpl > 0 ? GREEN : RED} sub="Meta: ≤ $100" />
        <KpiCard icon="💰" label="Margen neto"         value={fmt(kpis.margen, "$")}                      color={FIRE}   sub={`${(kpis.margenPct*100).toFixed(1)}% del ingreso`} />
        <KpiCard icon="📅" label="Contenido pendiente" value={String(pendientes)}                          color={YELLOW} sub={`${publicados} publicados este mes`} />
        <KpiCard icon="🎯" label="Objetivos activos"   value={String(goalsActivos)}                        color={TEAL}   sub="BrandGoals en curso" />
        <KpiCard icon="🧠" label="ROAS en memoria"     value={`${avgRoas}x`}                              color={PURPLE} sub={`${memories.length} creativos registrados`} />
      </div>

      {/* ── Motor PROMETEO — módulos activos ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 15 }}>🚀</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: FIRE }}>Motor PROMETEO — CMO Cognitivo</span>
          <span style={{
            fontSize: 9, fontWeight: 700, color: GREEN, background: `${GREEN}18`,
            padding: "1px 7px", borderRadius: 4, letterSpacing: "0.5px",
          }}>5 MÓDULOS ACTIVOS</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))", gap: 10 }}>
          <ModuleCard
            href="/prometeo/brand-dna"
            icon="🧬" color={FIRE} label="Brand DNA"
            desc="Arquetipo, tono y tabús de marca"
          />
          <ModuleCard
            href="/prometeo/objetivos"
            icon="🎯" color={TEAL} label="Goal Engine"
            desc="Árbol de decisiones estratégico"
            stat={goalsActivos > 0 ? `${goalsActivos} objetivo${goalsActivos > 1 ? "s" : ""} activo${goalsActivos > 1 ? "s" : ""}` : undefined}
          />
          <ModuleCard
            href="/prometeo/creative-memory"
            icon="🧠" color={PURPLE} label="Creative Memory"
            desc="ROAS histórico por hook y canal"
            stat={memories.length > 0 ? `${memories.length} creativos · ROAS ${avgRoas}x` : undefined}
          />
          <ModuleCard
            href="/prometeo/creative-lab"
            icon="🧪" color={BLUE} label="Creative Lab"
            desc="Generador de variantes con IA"
            stat={topCreativo ? `Top hook: ${topCreativo.hookType.split("_")[0]}` : undefined}
          />
          <ModuleCard
            href="/prometeo/director"
            icon="🤖" color={GOLD} label="Director Autónomo"
            desc="Brief diario + recomendaciones IA"
            stat={lastBrief ? `Último brief: ${lastBrief.fecha}` : "Sin briefs aún"}
          />
        </div>
      </div>

      {/* ── Último brief rápido ── */}
      {lastBrief && (
        <div style={{
          background: `${GOLD}10`, border: `1px solid ${GOLD}33`,
          borderRadius: 14, padding: "16px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🤖</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>
                Director Autónomo — {lastBrief.fecha}
              </span>
            </div>
            <Link href="/prometeo/director" style={{
              fontSize: 11, color: GOLD, fontWeight: 600, textDecoration: "none",
            }}>
              Ver brief completo →
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
            {[
              { label: "Clientes", value: lastBrief.totalClientes },
              { label: "Con fatiga", value: lastBrief.clientesConFatiga, color: lastBrief.clientesConFatiga > 0 ? RED : GREEN },
              { label: "Sin meta", value: lastBrief.clientesSinMeta,     color: lastBrief.clientesSinMeta > 1 ? YELLOW : GREEN },
              { label: "ROAS prom.", value: `${lastBrief.roasPromedio}x`, color: lastBrief.roasPromedio >= 3 ? GREEN : YELLOW },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: (s.color ?? TEXT) }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 10, color: MUTED }}>{s.label}</div>
              </div>
            ))}
          </div>
          {lastBrief.recomendaciones.slice(0, 2).map((r, i) => (
            <div key={i} style={{
              fontSize: 12, color: TEXT, padding: "6px 10px",
              background: CARD, borderRadius: 8, marginTop: 6,
              borderLeft: `3px solid ${r.urgencia === "ALTA" ? RED : r.urgencia === "MEDIA" ? YELLOW : GREEN}`,
            }}>
              <strong>{r.clienteNombre}</strong>: {r.descripcion}
            </div>
          ))}
        </div>
      )}

      {/* ── Clients + Semáforo ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>
        <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          <div style={{
            padding: "14px 18px", borderBottom: `1px solid ${BORDER}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0 }}>🏢 Cartera de Clientes</h2>
            <Link href="/prometeo/clientes" style={{ fontSize: 11, color: FIRE, fontWeight: 600, textDecoration: "none" }}>
              Ver todos →
            </Link>
          </div>
          {clientes.length === 0 ? (
            <div style={{ padding: "36px 20px", textAlign: "center", color: MUTED, fontSize: 13 }}>
              Sin clientes aún.{" "}
              <Link href="/prometeo/clientes" style={{ color: FIRE, fontWeight: 600, textDecoration: "none" }}>
                Agrega el primero →
              </Link>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0f0f1a" }}>
                  {["Cliente", "Industria", "Plataformas", "Paquete", "Estado"].map((h) => (
                    <th key={h} style={{
                      padding: "7px 14px", textAlign: "left",
                      fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "0.5px",
                      borderBottom: `1px solid ${BORDER}`,
                    }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientes.slice(0, 6).map((c, i) => {
                  const badge = ESTADO_BADGE[c.estado];
                  return (
                    <tr key={c.id} style={{ borderBottom: i < Math.min(clientes.length, 6) - 1 ? `1px solid ${BORDER}` : "none" }}>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: TEXT }}>{c.nombre}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: MUTED }}>{c.industria}</td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: MUTED }}>
                        {c.plataformas.slice(0, 3).join(" · ")}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: GREEN }}>
                        ${new Intl.NumberFormat("es-MX").format(c.paqueteMXN)}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          background: badge.bg, color: badge.color,
                          fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
                        }}>{c.estado}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Semáforo */}
        <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, overflow: "hidden", minWidth: 200 }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}` }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0 }}>🚦 Semáforo KPI</h2>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "ROAS",    fmtVal: `${kpis.roas.toFixed(2)}x`,           ok: kpis.roas >= 3,           warn: kpis.roas >= 1.5,      meta: "≥ 3x" },
              { label: "Margen%", fmtVal: `${(kpis.margenPct*100).toFixed(1)}%`, ok: kpis.margenPct >= 0.5,   warn: kpis.margenPct >= 0.3, meta: "≥ 50%" },
              { label: "CPL",     fmtVal: kpis.cpl > 0 ? `$${kpis.cpl.toFixed(0)}` : "—", ok: kpis.cpl > 0 && kpis.cpl <= 100, warn: kpis.cpl <= 200, meta: "≤ $100" },
              { label: "Eng%",    fmtVal: `${(kpis.engRate*100).toFixed(1)}%`,   ok: kpis.engRate >= 0.04,    warn: kpis.engRate >= 0.02,  meta: "≥ 4%" },
            ].map(({ label, fmtVal, ok, warn, meta }) => {
              const dotClr = ok ? GREEN : warn ? YELLOW : RED;
              return (
                <div key={label} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "7px 10px", borderRadius: 8, background: `${dotClr}10`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 13 }}>{ok ? "🟢" : warn ? "🟡" : "🔴"}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: TEXT }}>{label}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: TEXT, margin: 0 }}>{fmtVal}</p>
                    <p style={{ fontSize: 9, color: MUTED, margin: 0 }}>meta {meta}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Quick links ── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: "1px", marginBottom: 10 }}>
          ACCESO RÁPIDO
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10 }}>
          {[
            { href: "/prometeo/metricas",   icon: "📈", label: "Métricas",     desc: "KPIs por cuenta" },
            { href: "/prometeo/calendario", icon: "📅", label: "Calendario",   desc: "Contenido pendiente" },
            { href: "/prometeo/finanzas",   icon: "💰", label: "Finanzas",     desc: "ROAS y márgenes" },
            { href: "/prometeo/cotizador",  icon: "🧮", label: "Cotizador",    desc: "Nueva propuesta" },
            { href: "/prometeo/copy-hooks", icon: "🪝", label: "Copy & Hooks", desc: "Templates creativos" },
            { href: "/prometeo/ideas-hub",  icon: "💡", label: "Ideas Hub",    desc: "Banco de ideas" },
          ].map(({ href, icon, label, desc }) => (
            <Link key={href} href={href} style={{
              background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`,
              padding: "14px", textDecoration: "none",
              display: "flex", flexDirection: "column", gap: 5, transition: "border-color 0.15s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = FIRE; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; }}
            >
              <span style={{ fontSize: 20 }}>{icon}</span>
              <p style={{ fontSize: 12, fontWeight: 700, color: TEXT, margin: 0 }}>{label}</p>
              <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
