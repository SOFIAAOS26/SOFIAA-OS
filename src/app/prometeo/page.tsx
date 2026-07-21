"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  subscribeClientes, subscribeMetricas, subscribeFinanzas,
  calcKPIs, subscribeCalendario,
} from "@/lib/marketing/firestore";
import type { SmmCliente, SmmMetrica, SmmFinanza, SmmCalendario } from "@/lib/marketing/types";
import { ESTADO_BADGE } from "@/lib/marketing/types";

// ── Fire palette ──────────────────────────────────────────────────────────────
const FIRE    = "#f97316";
const GREEN   = "#22c55e";
const YELLOW  = "#f59e0b";
const RED     = "#ef4444";
const BLUE    = "#60a5fa";
const TEXT    = "#e2e8f0";
const MUTED   = "#64748b";
const CARD    = "#14141f";
const BORDER  = "#1e1e2e";

const MES_ACTUAL = new Date().toISOString().slice(0, 7);

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = FIRE, icon }: {
  label: string; value: string; sub?: string; color?: string; icon: string;
}) {
  return (
    <div style={{
      background: CARD, borderRadius: 14,
      border: `1px solid ${BORDER}`,
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${color}20`, display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 15,
        }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.5px" }}>
          {label.toUpperCase()}
        </span>
      </div>
      <p style={{ fontSize: 26, fontWeight: 800, color, margin: 0, letterSpacing: "-0.5px" }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{sub}</p>}
    </div>
  );
}

export default function PrometeoHome() {
  const { activeWorkspaceId } = useWorkspace();
  const [clientes,   setClientes]   = useState<SmmCliente[]>([]);
  const [metricas,   setMetricas]   = useState<SmmMetrica[]>([]);
  const [finanzas,   setFinanzas]   = useState<SmmFinanza[]>([]);
  const [calendario, setCalendario] = useState<SmmCalendario[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    let ready = 0;
    const check = () => { ready++; if (ready === 4) setLoading(false); };
    const u1 = subscribeClientes(activeWorkspaceId,         (d) => { setClientes(d);   check(); });
    const u2 = subscribeMetricas(activeWorkspaceId, MES_ACTUAL, (d) => { setMetricas(d);   check(); });
    const u3 = subscribeFinanzas(activeWorkspaceId, MES_ACTUAL, (d) => { setFinanzas(d);   check(); });
    const u4 = subscribeCalendario(activeWorkspaceId,       (d) => { setCalendario(d); check(); });
    return () => { u1(); u2(); u3(); u4(); };
  }, [activeWorkspaceId]);

  const kpis       = calcKPIs(metricas, finanzas);
  const activos    = clientes.filter((c) => c.estado === "Activo").length;
  const pendientes = calendario.filter((e) => ["En revisión", "En producción"].includes(e.estado)).length;
  const publicados = calendario.filter((e) => e.estado === "Publicado").length;
  const fmt = (n: number, prefix = "") => prefix + new Intl.NumberFormat("es-MX").format(Math.round(n));

  if (loading) return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            background: CARD, borderRadius: 14, height: 110,
            animation: "pulse 1.4s ease-in-out infinite",
          }} />
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Header ─────────────────────────────────────────────── */}
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
            {new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" })} ·{" "}
            {activos} clientes activos · CMO Cognitivo activo
          </p>
        </div>
        <Link href="/prometeo/clientes" style={{
          background: `linear-gradient(135deg, ${FIRE}, #ea580c)`,
          color: "#fff", borderRadius: 10, padding: "9px 18px",
          fontSize: 13, fontWeight: 700, textDecoration: "none",
          boxShadow: `0 0 16px ${FIRE}44`,
        }}>
          + Nuevo cliente
        </Link>
      </div>

      {/* ── KPI Grid ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
        <KpiCard icon="🏢" label="Clientes activos"    value={String(activos)}                            color={FIRE}   sub={`${clientes.length} total en cartera`} />
        <KpiCard icon="💵" label="Ingresos mes"         value={fmt(kpis.ingresos, "$")}                    color={GREEN}  sub="Honorarios facturados" />
        <KpiCard icon="📊" label="ROAS"                 value={`${kpis.roas.toFixed(2)}x`}                 color={kpis.roas >= 3 ? GREEN : RED} sub="Meta: ≥ 3x" />
        <KpiCard icon="🎯" label="CPL"                  value={kpis.cpl > 0 ? fmt(kpis.cpl, "$") : "—"}   color={kpis.cpl <= 100 && kpis.cpl > 0 ? GREEN : RED} sub="Meta: ≤ $100" />
        <KpiCard icon="💰" label="Margen neto"          value={fmt(kpis.margen, "$")}                      color={FIRE}   sub={`${(kpis.margenPct*100).toFixed(1)}% del ingreso`} />
        <KpiCard icon="👁️" label="Alcance total"        value={fmt(kpis.alcance)}                          color={BLUE}   sub="Orgánico + pagado" />
        <KpiCard icon="❤️" label="Engagement rate"     value={`${(kpis.engRate*100).toFixed(1)}%`}         color={kpis.engRate >= 0.04 ? GREEN : YELLOW} sub="Benchmark: ≥ 4%" />
        <KpiCard icon="📅" label="Contenido pendiente"  value={String(pendientes)}                          color={YELLOW} sub={`${publicados} publicados este mes`} />
      </div>

      {/* ── PROMETEO Intelligence preview (P-1 → P-5) ─────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${FIRE}10, #7c3aed10)`,
        border: `1px solid ${FIRE}30`, borderRadius: 16, padding: "16px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 16 }}>🚀</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: FIRE }}>Motor PROMETEO — Próximamente</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
          {[
            { icon: "🧬", label: "Brand DNA",         desc: "Arquetipo + tono de marca",      sprint: "P-1" },
            { icon: "🎯", label: "Goal Engine",        desc: "Decisiones por objetivo",         sprint: "P-2" },
            { icon: "🧠", label: "Creative Memory",    desc: "ROAS histórico por hook",         sprint: "P-3" },
            { icon: "🧪", label: "Creative Lab",       desc: "20 hooks × 15 CTAs × scoring",   sprint: "P-4" },
            { icon: "🤖", label: "Director Autónomo",  desc: "Brief matutino + fatiga",         sprint: "P-5" },
          ].map((m) => (
            <div key={m.label} style={{
              background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
              padding: "12px 14px", opacity: 0.7,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <span style={{ fontSize: 8, color: FIRE, fontWeight: 700, background: `${FIRE}18`, padding: "1px 5px", borderRadius: 4 }}>
                  {m.sprint}
                </span>
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: TEXT, margin: "0 0 2px" }}>{m.label}</p>
              <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Clients + Semáforo ─────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>

        {/* Cartera */}
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
            <h2 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0 }}>🚦 Semáforo</h2>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "ROAS",    val: kpis.roas,       fmt: `${kpis.roas.toFixed(2)}x`,            ok: kpis.roas >= 3,            warn: kpis.roas >= 1.5,       meta: "≥ 3x" },
              { label: "Margen%", val: kpis.margenPct,  fmt: `${(kpis.margenPct*100).toFixed(1)}%`,  ok: kpis.margenPct >= 0.5,     warn: kpis.margenPct >= 0.3,  meta: "≥ 50%" },
              { label: "CPL",     val: kpis.cpl,        fmt: kpis.cpl > 0 ? `$${kpis.cpl.toFixed(0)}` : "—", ok: kpis.cpl > 0 && kpis.cpl <= 100, warn: kpis.cpl <= 200, meta: "≤ $100" },
              { label: "Eng%",    val: kpis.engRate,    fmt: `${(kpis.engRate*100).toFixed(1)}%`,    ok: kpis.engRate >= 0.04,      warn: kpis.engRate >= 0.02,   meta: "≥ 4%" },
            ].map(({ label, fmt: fmtVal, ok, warn, meta }) => {
              const dot    = ok ? "🟢" : warn ? "🟡" : "🔴";
              const dotClr = ok ? GREEN : warn ? YELLOW : RED;
              return (
                <div key={label} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "7px 10px", borderRadius: 8, background: `${dotClr}10`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 13 }}>{dot}</span>
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

      {/* ── Quick links ────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
        {[
          { href: "/prometeo/metricas",    icon: "📈", label: "Métricas",    desc: "KPIs por cuenta" },
          { href: "/prometeo/calendario",  icon: "📅", label: "Calendario",  desc: "Contenido pendiente" },
          { href: "/prometeo/finanzas",    icon: "💰", label: "Finanzas",    desc: "ROAS y márgenes" },
          { href: "/prometeo/cotizador",   icon: "🧮", label: "Cotizador",   desc: "Nueva propuesta" },
          { href: "/prometeo/copy-hooks",  icon: "🪝", label: "Copy & Hooks", desc: "Templates creativos" },
          { href: "/prometeo/ideas-hub",   icon: "💡", label: "Ideas Hub",   desc: "Banco de ideas" },
        ].map(({ href, icon, label, desc }) => (
          <Link key={href} href={href} style={{
            background: CARD, borderRadius: 12,
            border: `1px solid ${BORDER}`, padding: "14px",
            textDecoration: "none", display: "flex", flexDirection: "column", gap: 5,
            transition: "border-color 0.15s",
          }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = FIRE)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = BORDER)}
          >
            <span style={{ fontSize: 20 }}>{icon}</span>
            <p style={{ fontSize: 12, fontWeight: 700, color: TEXT, margin: 0 }}>{label}</p>
            <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
