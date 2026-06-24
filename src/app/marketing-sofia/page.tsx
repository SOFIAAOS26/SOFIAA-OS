"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspace } from "@/hooks/useWorkspace";
import { subscribeClientes, subscribeMetricas, subscribeFinanzas, calcKPIs } from "@/lib/marketing/firestore";
import { subscribeCalendario } from "@/lib/marketing/firestore";
import type { SmmCliente, SmmMetrica, SmmFinanza, SmmCalendario } from "@/lib/marketing/types";
import { ESTADO_BADGE } from "@/lib/marketing/types";

const P  = "#7C3AED";
const PL = "#A78BFA";

const MES_ACTUAL = new Date().toISOString().slice(0, 7); // "2026-06"

// ── KPI Card ──────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, color = P, icon,
}: {
  label: string; value: string; sub?: string; color?: string; icon: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid rgba(124,58,237,0.12)",
        padding: "20px 22px",
        boxShadow: "0 2px 12px rgba(124,58,237,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: `${color}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          {icon}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.4px" }}>
          {label.toUpperCase()}
        </span>
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color, margin: 0, letterSpacing: "-0.5px" }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{sub}</p>
      )}
    </div>
  );
}

export default function MarketingDashboard() {
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

    const u1 = subscribeClientes(activeWorkspaceId, (d) => { setClientes(d); check(); });
    const u2 = subscribeMetricas(activeWorkspaceId, MES_ACTUAL, (d) => { setMetricas(d); check(); });
    const u3 = subscribeFinanzas(activeWorkspaceId, MES_ACTUAL, (d) => { setFinanzas(d); check(); });
    const u4 = subscribeCalendario(activeWorkspaceId, (d) => { setCalendario(d); check(); });
    return () => { u1(); u2(); u3(); u4(); };
  }, [activeWorkspaceId]);

  const kpis     = calcKPIs(metricas, finanzas);
  const activos  = clientes.filter((c) => c.estado === "Activo").length;
  const pendientes = calendario.filter(
    (e) => e.estado === "En revisión" || e.estado === "En producción"
  ).length;
  const publicados = calendario.filter((e) => e.estado === "Publicado").length;

  const fmt = (n: number, prefix = "") =>
    prefix + new Intl.NumberFormat("es-MX").format(Math.round(n));

  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 16 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: "#f3f0ff",
              borderRadius: 16,
              height: 120,
              animation: "pulse 1.4s ease-in-out infinite",
            }}
          />
        ))}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      </div>
    );
  }

  return (
    <div className="tbi-page-enter" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1D1D1F", margin: 0 }}>
            📊 Dashboard
          </h1>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>
            {new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" })} · {activos} clientes activos
          </p>
        </div>
        <Link
          href="/marketing-sofia/clientes"
          style={{
            background: P,
            color: "#fff",
            borderRadius: 10,
            padding: "9px 18px",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          + Nuevo cliente
        </Link>
      </div>

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14 }}>
        <KpiCard icon="🏢" label="Clientes activos"   value={String(activos)}                          color={P}         sub={`${clientes.length} total en cartera`} />
        <KpiCard icon="💵" label="Ingresos mes"        value={fmt(kpis.ingresos, "$")}                  color="#10B981"   sub="Honorarios facturados" />
        <KpiCard icon="📊" label="ROAS"                value={`${kpis.roas.toFixed(2)}x`}               color={kpis.roas >= 3 ? "#10B981" : "#EF4444"} sub="Meta: ≥ 3x" />
        <KpiCard icon="🎯" label="CPL"                 value={kpis.cpl > 0 ? fmt(kpis.cpl, "$") : "—"} color={kpis.cpl <= 100 && kpis.cpl > 0 ? "#10B981" : "#EF4444"} sub="Costo por lead · Meta: ≤$100" />
        <KpiCard icon="💰" label="Margen neto"         value={fmt(kpis.margen, "$")}                    color="#7C3AED"   sub={`${(kpis.margenPct * 100).toFixed(1)}% del ingreso`} />
        <KpiCard icon="👁️" label="Alcance total"       value={fmt(kpis.alcance)}                        color="#3B82F6"   sub="Orgánico + pagado" />
        <KpiCard icon="❤️" label="Engagement rate"    value={`${(kpis.engRate * 100).toFixed(1)}%`}    color={kpis.engRate >= 0.04 ? "#10B981" : "#F59E0B"} sub="Benchmark: ≥ 4%" />
        <KpiCard icon="📅" label="Contenido pendiente" value={String(pendientes)}                        color="#F59E0B"   sub={`${publicados} publicados este mes`} />
      </div>

      {/* Bottom row: clients table + semáforo */}
      <div className="ext-sidebar-layout">

        {/* Clientes recientes */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid rgba(124,58,237,0.1)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F0FF", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>🏢 Cartera de Clientes</h2>
            <Link href="/marketing-sofia/clientes" style={{ fontSize: 11, color: P, fontWeight: 600, textDecoration: "none" }}>
              Ver todos →
            </Link>
          </div>
          {clientes.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
              Sin clientes aún.{" "}
              <Link href="/marketing-sofia/clientes" style={{ color: P, fontWeight: 600, textDecoration: "none" }}>
                Agrega el primero →
              </Link>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#FAFAFA" }}>
                  {["Cliente", "Industria", "Plataformas", "Paquete", "Estado"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 16px",
                        textAlign: "left",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#9CA3AF",
                        letterSpacing: "0.4px",
                        borderBottom: "1px solid #F3F0FF",
                      }}
                    >
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientes.slice(0, 6).map((c, i) => {
                  const badge = ESTADO_BADGE[c.estado];
                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: i < clientes.length - 1 ? "1px solid #F9F7FF" : "none" }}
                    >
                      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>
                        {c.nombre}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "#6B7280" }}>{c.industria}</td>
                      <td style={{ padding: "11px 16px", fontSize: 11, color: "#6B7280" }}>
                        {c.plataformas.slice(0, 3).join(" · ")}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#10B981" }}>
                        ${new Intl.NumberFormat("es-MX").format(c.paqueteMXN)}
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <span
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "3px 9px",
                            borderRadius: 99,
                          }}
                        >
                          {c.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Semáforo de metas */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid rgba(124,58,237,0.1)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F0FF" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>🚦 Semáforo de Metas</h2>
          </div>
          <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "ROAS", val: kpis.roas,         fmt: `${kpis.roas.toFixed(2)}x`,             ok: kpis.roas >= 3,   warn: kpis.roas >= 1.5, meta: "≥ 3x" },
              { label: "Margen %", val: kpis.margenPct, fmt: `${(kpis.margenPct*100).toFixed(1)}%`,   ok: kpis.margenPct >= 0.5, warn: kpis.margenPct >= 0.3, meta: "≥ 50%" },
              { label: "CPL",  val: kpis.cpl,           fmt: kpis.cpl > 0 ? `$${kpis.cpl.toFixed(0)}` : "—", ok: kpis.cpl > 0 && kpis.cpl <= 100, warn: kpis.cpl <= 200, meta: "≤ $100" },
              { label: "Eng%", val: kpis.engRate,       fmt: `${(kpis.engRate*100).toFixed(1)}%`,     ok: kpis.engRate >= 0.04, warn: kpis.engRate >= 0.02, meta: "≥ 4%" },
              { label: "Ingresos", val: kpis.ingresos,  fmt: `$${fmt(kpis.ingresos)}`,                ok: kpis.ingresos >= 80000, warn: kpis.ingresos >= 50000, meta: "≥ $80k" },
            ].map(({ label, fmt: fmtVal, ok, warn, meta }) => {
              const dot = ok ? "🟢" : warn ? "🟡" : kpis.ingresos === 0 ? "⬜" : "🔴";
              const dotColor = ok ? "#10B981" : warn ? "#F59E0B" : "#E5E7EB";
              return (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: `${dotColor}10`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{dot}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: "#1D1D1F", margin: 0 }}>{fmtVal}</p>
                    <p style={{ fontSize: 9, color: "#9CA3AF", margin: 0 }}>meta {meta}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12 }}>
        {[
          { href: "/marketing-sofia/metricas",   icon: "📈", label: "Ver Métricas",   desc: "KPIs por cuenta" },
          { href: "/marketing-sofia/calendario",  icon: "📅", label: "Calendario",     desc: "Contenido pendiente" },
          { href: "/marketing-sofia/finanzas",    icon: "💰", label: "Finanzas",       desc: "ROAS y márgenes" },
          { href: "/marketing-sofia/cotizador",   icon: "🎯", label: "Cotizador",      desc: "Nueva propuesta" },
        ].map(({ href, icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid rgba(124,58,237,0.1)",
              padding: "16px",
              textDecoration: "none",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              transition: "box-shadow 0.15s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(124,58,237,0.12)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.boxShadow = "none")
            }
          >
            <span style={{ fontSize: 22 }}>{icon}</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>{label}</p>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
