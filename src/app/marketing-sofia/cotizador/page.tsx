"use client";

import { useState } from "react";

const P = "#7C3AED";
const field: React.CSSProperties = {
  width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 8,
  padding: "8px 12px", fontSize: 13, color: "#1D1D1F",
  outline: "none", boxSizing: "border-box", background: "#fff",
};
const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#6B7280",
  letterSpacing: "0.4px", marginBottom: 4, display: "block",
};

const SERVICES = [
  { id: "community",  label: "Community Management",          base: 8000,  hrs: 40 },
  { id: "content_b",  label: "Creación de Contenido (básico)", base: 5000, hrs: 20 },
  { id: "content_p",  label: "Creación de Contenido (premium)",base: 12000, hrs: 35 },
  { id: "ads",        label: "Gestión de Ads (Meta / TikTok)", base: 6000, hrs: 15 },
  { id: "strategy",   label: "Estrategia & Consultoría",       base: 4000, hrs: 8  },
  { id: "design",     label: "Diseño Gráfico / Branding",      base: 3500, hrs: 12 },
  { id: "email",      label: "Email Marketing",                base: 3000, hrs: 10 },
  { id: "reports",    label: "Reportes Mensuales",             base: 2000, hrs: 5  },
];

export default function CotizadorPage() {
  const [cliente,    setCliente]    = useState("");
  const [meses,      setMeses]      = useState(3);
  const [invPubli,   setInvPubli]   = useState(0);
  const [selected,   setSelected]   = useState<Set<string>>(new Set(["community"]));
  const [copied,     setCopied]     = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const active    = SERVICES.filter((s) => selected.has(s.id));
  const hrsTotal  = active.reduce((s, x) => s + x.hrs, 0);
  const honorarios = active.reduce((s, x) => s + x.base * (meses >= 6 ? 1.05 : 1), 0);
  const totalMes  = honorarios + invPubli;
  const totalCtrt = totalMes * meses;
  const tarifaHr  = hrsTotal > 0 ? honorarios / hrsTotal : 0;

  const level =
    honorarios >= 20000 ? { emoji: "🥇", label: "PREMIUM", color: "#D97706", desc: "Propuesta de alto valor. Enfócate en ROI, resultados comprobados y exclusividad." }
    : honorarios >= 10000 ? { emoji: "🥈", label: "ESTÁNDAR", color: P, desc: "Paquete sólido. Destaca el valor agregado, la atención personalizada y tu experiencia." }
    : { emoji: "🥉", label: "STARTER", color: "#6B7280", desc: "Ideal para iniciar la relación. Propón escalar en 3 meses con resultados." };

  const fmt = (n: number) => "$" + new Intl.NumberFormat("es-MX").format(Math.round(n));

  const copyText = () => {
    const lines = [
      `PROPUESTA DE SERVICIOS SMM`,
      cliente ? `Cliente: ${cliente}` : "",
      `Duración: ${meses} meses`,
      ``,
      `SERVICIOS INCLUIDOS:`,
      ...active.map((s) => `• ${s.label} — ${fmt(s.base)}/mes`),
      ``,
      invPubli > 0 ? `Inversión publicitaria: ${fmt(invPubli)}/mes` : "",
      ``,
      `RESUMEN FINANCIERO:`,
      `• Honorarios mensuales: ${fmt(honorarios)}`,
      invPubli > 0 ? `• Total mensual (+ ads): ${fmt(totalMes)}` : "",
      `• Total del contrato (${meses} meses): ${fmt(totalCtrt)}`,
      `• Tarifa por hora: ${fmt(tarifaHr)}`,
      `• Horas/mes estimadas: ${hrsTotal}`,
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="tbi-page-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1D1D1F", margin: 0 }}>🎯 Cotizador de Propuestas</h1>
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>
          Selecciona servicios y genera una propuesta lista para el cliente
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>

        {/* Left: config */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Client info */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(124,58,237,0.1)", padding: 22 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", margin: "0 0 16px" }}>📋 Datos del Cliente</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <span style={lbl}>NOMBRE DEL CLIENTE / EMPRESA</span>
                <input value={cliente} onChange={(e) => setCliente(e.target.value)}
                  placeholder="Clínica Derma Norte…" style={field} />
              </div>
              <div>
                <span style={lbl}>MESES DE CONTRATO</span>
                <select value={meses} onChange={(e) => setMeses(Number(e.target.value))} style={field}>
                  {[1,2,3,6,12].map((m) => (
                    <option key={m} value={m}>{m} {m === 1 ? "mes" : "meses"}{m >= 6 ? " (+5% descuento)" : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <span style={lbl}>INVERSIÓN PUBLICITARIA (MXN/MES)</span>
                <input type="number" min={0} value={invPubli || ""} onChange={(e) => setInvPubli(Number(e.target.value))}
                  placeholder="0" style={field} />
              </div>
            </div>
          </div>

          {/* Services selector */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(124,58,237,0.1)", padding: 22 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", margin: "0 0 16px" }}>⚙️ Servicios a Incluir</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SERVICES.map((s) => {
                const on = selected.has(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: `1.5px solid ${on ? P : "#E5E7EB"}`,
                      background: on ? `${P}08` : "#FAFAFA",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 18, height: 18, borderRadius: 5,
                          border: `2px solid ${on ? P : "#D1D5DB"}`,
                          background: on ? P : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {on && <span style={{ color: "#fff", fontSize: 11, fontWeight: 900 }}>✓</span>}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: on ? P : "#374151" }}>{s.label}</p>
                        <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF" }}>{s.hrs} hrs/mes</p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: on ? "#10B981" : "#9CA3AF" }}>
                        ${new Intl.NumberFormat("es-MX").format(s.base)}
                        {meses >= 6 && on ? <span style={{ fontSize: 10, color: P }}> → ${new Intl.NumberFormat("es-MX").format(Math.round(s.base * 1.05))}</span> : ""}
                      </p>
                      <p style={{ margin: 0, fontSize: 9, color: "#C4B5FD" }}>por mes</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 72 }}>

          {/* Package badge */}
          <div
            style={{
              background: `${level.color}12`,
              border: `2px solid ${level.color}30`,
              borderRadius: 16,
              padding: "16px 18px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 28, margin: "0 0 4px" }}>{level.emoji}</p>
            <p style={{ fontSize: 12, fontWeight: 800, color: level.color, margin: "0 0 6px", letterSpacing: "0.5px" }}>
              PAQUETE {level.label}
            </p>
            <p style={{ fontSize: 11, color: "#6B7280", margin: 0, lineHeight: 1.4 }}>{level.desc}</p>
          </div>

          {/* Numbers */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(124,58,237,0.1)", padding: 20 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: "0 0 14px" }}>💰 Resumen Financiero</h2>
            {[
              { label: "Servicios activos",     val: String(active.length),   color: P },
              { label: "Horas/mes",             val: `${hrsTotal} hrs`,       color: "#374151" },
              { label: "Honorarios mensuales",  val: fmt(honorarios),         color: "#10B981" },
              ...(invPubli > 0 ? [{ label: "Inversión Ads",        val: fmt(invPubli),           color: "#3B82F6" }] : []),
              ...(invPubli > 0 ? [{ label: "Total mensual cliente", val: fmt(totalMes),           color: P }] : []),
              { label: `Total contrato (${meses} mes${meses > 1 ? "es" : ""})`, val: fmt(totalCtrt), color: "#7C3AED" },
              { label: "Tarifa por hora",       val: tarifaHr > 0 ? fmt(tarifaHr) : "—", color: "#374151" },
            ].map(({ label: l, val, color }) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #F9F7FF" }}>
                <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>{l}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Copy button */}
          <button
            onClick={copyText}
            style={{
              background: copied ? "#10B981" : P,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "12px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {copied ? "✅ ¡Copiado al portapapeles!" : "📋 Copiar propuesta de texto"}
          </button>

          <p style={{ fontSize: 10, color: "#9CA3AF", textAlign: "center", margin: 0 }}>
            Pega el texto en un email, WhatsApp o documento Word para presentarlo al cliente.
          </p>
        </div>
      </div>
    </div>
  );
}
