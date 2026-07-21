"use client";

import { useState, useRef, useEffect } from "react";

const P   = "#7C3AED";
const AV  = "#0EA5E9";
const GRN = "#10B981";
const field: React.CSSProperties = {
  width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 8,
  padding: "8px 12px", fontSize: 13, color: "#1D1D1F",
  outline: "none", boxSizing: "border-box", background: "#fff",
};
const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#6B7280",
  letterSpacing: "0.4px", marginBottom: 4, display: "block",
};
const fmt = (n: number) => "$" + new Intl.NumberFormat("es-MX").format(Math.round(n));

// ── SMM Services ──────────────────────────────────────────────────────────────
const SMM_SERVICES = [
  { id: "community",  label: "Community Management",           base: 8000,  hrs: 40 },
  { id: "content_b",  label: "Creación de Contenido (básico)", base: 5000,  hrs: 20 },
  { id: "content_p",  label: "Creación de Contenido (premium)",base: 12000, hrs: 35 },
  { id: "ads",        label: "Gestión de Ads (Meta / TikTok)", base: 6000,  hrs: 15 },
  { id: "strategy",   label: "Estrategia & Consultoría",       base: 4000,  hrs: 8  },
  { id: "design",     label: "Diseño Gráfico / Branding",      base: 3500,  hrs: 12 },
  { id: "email",      label: "Email Marketing",                base: 3000,  hrs: 10 },
  { id: "reports",    label: "Reportes Mensuales",             base: 2000,  hrs: 5  },
];

// ── AV Services ───────────────────────────────────────────────────────────────
const AV_MARGIN    = 0.10;
const COMBUSTIBLE  = 1500;
const CATERING     = 200;
const IVA_RATE     = 0.16;

interface AVService {
  id: string; cat: string; label: string; base: number;
  unit: string; detail: string; isProductionDay?: boolean;
}

const AV_SERVICES: AVService[] = [
  // VIDEO
  { id:"lev_full",   cat:"Video & Producción", label:"Día de Levantamiento (8 hrs)",       base:13000, unit:"día",    detail:"8–10 horas de registro documental. Incluye operador de cámara.",     isProductionDay:true },
  { id:"lev_half",   cat:"Video & Producción", label:"Medio Día de Levantamiento",          base:4500,  unit:"medio día", detail:"4 horas de registro documental.",                                  isProductionDay:true },
  { id:"prod_video", cat:"Video & Producción", label:"Día de Producción de Video (crew 4)", base:17500, unit:"día",    detail:"Crew completo: director, camarógrafo, audio, asistente.",             isProductionDay:true },
  { id:"drone",      cat:"Video & Producción", label:"Vuelo de Drone (por batería)",        base:2500,  unit:"batería",detail:"Vuelo panorámico ~20 min. Operador certificado.",                     isProductionDay:false },

  // POST
  { id:"edit_resumen",cat:"Post-Producción",   label:"Edición Video Resumen/Evento",        base:2500,  unit:"pieza",  detail:"Edición de highlights/resumen de evento." },
  { id:"edit_ponencia",cat:"Post-Producción",  label:"Edición Ponencia Completa",           base:2000,  unit:"pieza",  detail:"Edición lineal de ponencia o conferencia." },
  { id:"edit_basico", cat:"Post-Producción",   label:"Edición de Video Básico",             base:2000,  unit:"pieza",  detail:"Edición estándar de video." },
  { id:"bajada",      cat:"Post-Producción",   label:"Bajada Digital (Reel/TikTok)",        base:800,   unit:"pieza",  detail:"Edición vertical optimizada para redes." },
  { id:"pack3",       cat:"Post-Producción",   label:"Pack x3 Bajadas Digitales",           base:1200,  unit:"pack",   detail:"Paquete de 3 bajadas al precio de 2.5. Ahorro vs unitario." },
  { id:"motion",      cat:"Post-Producción",   label:"Motion Graphics 2D",                  base:2000,  unit:"pieza",  detail:"Animación de plecas, lower thirds e infográficos." },
  { id:"color",       cat:"Post-Producción",   label:"Color Grading",                       base:1000,  unit:"pieza",  detail:"Corrección de color y balance profesional." },
  { id:"subtitulos",  cat:"Post-Producción",   label:"Subtitulaje (por minuto)",            base:250,   unit:"min",    detail:"Transcripción manual + quema de subtítulos. Precio por minuto de video." },

  // FOTO
  { id:"foto_social", cat:"Fotografía",        label:"Fotografía de Evento Social",         base:4500,  unit:"evento", detail:"Cobertura fotográfica de evento social o empresarial.", isProductionDay:true },
  { id:"foto_doc",    cat:"Fotografía",        label:"Fotografía de Evento Documental",     base:4500,  unit:"evento", detail:"Fotografía documental institucional.",                  isProductionDay:true },
  { id:"prod_foto",   cat:"Fotografía",        label:"Día de Producción Foto (crew 3)",     base:12500, unit:"día",    detail:"Fotógrafo + asistente + utilería. Crew de 3.",           isProductionDay:true },
  { id:"sesion",      cat:"Fotografía",        label:"Sesión Fotográfica",                  base:2800,  unit:"sesión", detail:"Sesión estudio o locación, hasta 2 hrs.",               isProductionDay:true },
  { id:"boda",        cat:"Fotografía",        label:"Sesión Fotografía Boda",              base:4500,  unit:"sesión", detail:"Cobertura completa de boda.", isProductionDay:true },
  { id:"xv",          cat:"Fotografía",        label:"Sesión Fotografía XV Años",           base:3500,  unit:"sesión", detail:"Cobertura completa de XV años.", isProductionDay:true },
  { id:"producto",    cat:"Fotografía",        label:"Sesión Foto de Producto",             base:7000,  unit:"sesión", detail:"Fotografía de producto con iluminación de estudio.",    isProductionDay:true },
  { id:"retrato",     cat:"Fotografía",        label:"Retrato Corporativo",                 base:7500,  unit:"sesión", detail:"Sesión de retratos profesionales para equipo o directivos.", isProductionDay:true },
  { id:"publicidad",  cat:"Fotografía",        label:"Foto Publicitaria",                   base:10000, unit:"sesión", detail:"Producción fotográfica publicitaria de alto impacto.", isProductionDay:true },
  { id:"edit_foto",   cat:"Fotografía",        label:"Edición de Fotografía",               base:500,   unit:"pieza",  detail:"Retoque y edición profesional por imagen." },
  { id:"congreso",    cat:"Fotografía",        label:"Cobertura Congresos / Eventos",       base:4500,  unit:"unidad", detail:"Cobertura fotográfica en congreso o evento.", isProductionDay:true },

  // ADICIONALES
  { id:"extra_hr",   cat:"Adicionales",        label:"Hora Extra en Evento",                base:1000,  unit:"hora",   detail:"Cargo por hora adicional fuera del paquete contratado." },
  { id:"storage",    cat:"Adicionales",        label:"Almacenamiento / Discos Duros",       base:3000,  unit:"unidad", detail:"Disco duro de entrega con material bruto y editado." },
  { id:"buyout",     cat:"Adicionales",        label:"Entrega Editables / Buyout",          base:0,     unit:"—",      detail:"Venta de derechos y archivos fuente. Precio por negociar según proyecto." },
];

const AV_CATS = ["Video & Producción","Post-Producción","Fotografía","Adicionales"];

// ── Tooltip ⓘ ─────────────────────────────────────────────────────────────────
function InfoBtn({ detail, color }: { detail: string; color: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{
          width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${color}55`,
          background: open ? `${color}18` : "transparent",
          color, fontSize: 10, fontWeight: 800, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >ⓘ</button>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", right: 0, zIndex: 200,
          background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10,
          padding: "10px 12px", boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
          width: 220, fontSize: 11, color: "#374151", lineHeight: 1.6,
          whiteSpace: "normal",
        }}>
          {detail}
        </div>
      )}
    </div>
  );
}

// ── Composition Chart ─────────────────────────────────────────────────────────
function CompositionChart({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Stacked bar */}
      <div style={{ height: 10, borderRadius: 99, overflow: "hidden", display: "flex", background: "#F3F4F6" }}>
        {items.filter(i => i.value > 0).map((i) => (
          <div key={i.label} style={{
            width: `${(i.value / total) * 100}%`,
            background: i.color,
            transition: "width 0.4s",
          }} />
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
        {items.filter(i => i.value > 0).map((i) => (
          <div key={i.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: i.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: "#6B7280" }}>{i.label} {fmt(i.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function CotizadorPage() {
  const [tab, setTab] = useState<"smm"|"av">("smm");

  // ── SMM state ──────────────────────────────────────────────────────────────
  const [cliente,  setCliente]  = useState("");
  const [meses,    setMeses]    = useState(3);
  const [invPubli, setInvPubli] = useState(0);
  const [smmSel,   setSmmSel]   = useState<Set<string>>(new Set(["community"]));
  const [copied,   setCopied]   = useState(false);

  const toggleSmm = (id: string) => setSmmSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const smmActive    = SMM_SERVICES.filter((s) => smmSel.has(s.id));
  const hrsTotal     = smmActive.reduce((s, x) => s + x.hrs, 0);
  const honorarios   = smmActive.reduce((s, x) => s + x.base * (meses >= 6 ? 1.05 : 1), 0);
  const totalMes     = honorarios + invPubli;
  const totalCtrt    = totalMes * meses;
  const tarifaHr     = hrsTotal > 0 ? honorarios / hrsTotal : 0;
  const smmLevel     =
    honorarios >= 20000 ? { emoji:"🥇", label:"PREMIUM", color:"#D97706", desc:"Propuesta de alto valor. Enfócate en ROI y exclusividad." }
    : honorarios >= 10000 ? { emoji:"🥈", label:"ESTÁNDAR", color:P, desc:"Paquete sólido. Destaca el valor agregado y tu experiencia." }
    : { emoji:"🥉", label:"STARTER", color:"#6B7280", desc:"Ideal para iniciar. Propón escalar en 3 meses." };

  const copySMM = () => {
    const lines = [
      "PROPUESTA DE SERVICIOS SMM", cliente ? `Cliente: ${cliente}` : "",
      `Duración: ${meses} meses`, "",
      "SERVICIOS INCLUIDOS:",
      ...smmActive.map((s) => `• ${s.label} — ${fmt(s.base)}/mes`), "",
      invPubli > 0 ? `Inversión publicitaria: ${fmt(invPubli)}/mes` : "",
      "", "RESUMEN FINANCIERO:",
      `• Honorarios mensuales: ${fmt(honorarios)}`,
      invPubli > 0 ? `• Total mensual (+ ads): ${fmt(totalMes)}` : "",
      `• Total del contrato (${meses} meses): ${fmt(totalCtrt)}`,
      `• Tarifa por hora: ${fmt(tarifaHr)}`,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(lines).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  // ── AV state ───────────────────────────────────────────────────────────────
  const [avCliente, setAvCliente]  = useState("");
  const [avQty, setAvQty]          = useState<Record<string, number>>({});
  const [avCopied, setAvCopied]    = useState(false);

  const avSelected = AV_SERVICES.filter((s) => (avQty[s.id] ?? 0) > 0);
  const setQty = (id: string, qty: number) => setAvQty((p) => ({ ...p, [id]: Math.max(0, qty) }));
  const toggleAV = (id: string) => {
    const cur = avQty[id] ?? 0;
    setQty(id, cur > 0 ? 0 : 1);
  };

  // Días de producción = suma de qty de items marcados como isProductionDay
  const prodDays = avSelected.filter((s) => s.isProductionDay).reduce((s, x) => s + (avQty[x.id] ?? 0), 0);
  const combustibleTotal = prodDays * COMBUSTIBLE;
  const cateringTotal    = prodDays * CATERING;
  const prodCostsTotal   = combustibleTotal + cateringTotal;

  const avSubtotalBase = avSelected.reduce((s, x) => s + x.base * (avQty[x.id] ?? 0), 0);
  const margen         = avSubtotalBase * AV_MARGIN;
  const avSubtotal     = avSubtotalBase + margen;
  const avIVA          = (avSubtotal + prodCostsTotal) * IVA_RATE;
  const avTotal        = avSubtotal + prodCostsTotal + avIVA;

  const copyAV = () => {
    const lines = [
      "COTIZACIÓN PRODUCCIÓN AUDIOVISUAL", avCliente ? `Cliente: ${avCliente}` : "", "",
      "SERVICIOS:", ...avSelected.map((s) => `• ${s.label} × ${avQty[s.id]} ${s.unit} — ${fmt(s.base * (avQty[s.id]??0))}`),
      "", `Subtotal servicios: ${fmt(avSubtotalBase)}`,
      `Utilidad (10%): ${fmt(margen)}`,
      prodCostsTotal > 0 ? `Costos de producción (${prodDays} días): ${fmt(prodCostsTotal)}` : "",
      `IVA 16%: ${fmt(avIVA)}`,
      `TOTAL: ${fmt(avTotal)}`,
      "", "* Precios en MXN. IVA no incluido en precios base.",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(lines).then(() => { setAvCopied(true); setTimeout(() => setAvCopied(false), 2000); });
  };

  const chartItems = [
    { label: "Servicios", value: avSubtotalBase, color: AV },
    { label: "Utilidad 10%", value: margen, color: "#38BDF8" },
    { label: "Prod.", value: prodCostsTotal, color: "#F59E0B" },
    { label: "IVA", value: avIVA, color: "#A78BFA" },
  ];

  return (
    <div className="tbi-page-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header + Tabs */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1D1D1F", margin: "0 0 12px" }}>
          🎯 Cotizador de Propuestas
        </h1>
        <div style={{ display: "flex", gap: 0, borderRadius: 12, overflow: "hidden",
          border: "1.5px solid #E5E7EB", width: "fit-content" }}>
          {([["smm","📱 SMM & Agencia",P],["av","🎬 Producción Audiovisual",AV]] as const).map(([key, label, color]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{
                padding: "9px 20px", border: "none", fontSize: 12, fontWeight: 700,
                cursor: "pointer", transition: "all 0.15s",
                background: tab === key ? color : "#F9FAFB",
                color: tab === key ? "#fff" : "#6B7280",
                borderRight: key === "smm" ? "1.5px solid #E5E7EB" : "none",
              }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── TAB SMM ──────────────────────────────────────────────────────────── */}
      {tab === "smm" && (
        <div className="ext-sidebar-layout-340">
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${P}18`, padding:22 }}>
              <h2 style={{ fontSize:14, fontWeight:700, color:"#1D1D1F", margin:"0 0 16px" }}>📋 Datos del Cliente</h2>
              <div className="ext-form-2" style={{ gap:12 }}>
                <div><span style={lbl}>CLIENTE / EMPRESA</span>
                  <input value={cliente} onChange={(e)=>setCliente(e.target.value)} placeholder="Clínica Derma Norte…" style={field} /></div>
                <div><span style={lbl}>MESES DE CONTRATO</span>
                  <select value={meses} onChange={(e)=>setMeses(Number(e.target.value))} style={field}>
                    {[1,2,3,6,12].map((m)=>(<option key={m} value={m}>{m} {m===1?"mes":"meses"}{m>=6?" (+5% dcto)":""}</option>))}</select></div>
                <div><span style={lbl}>INVERSIÓN PUBLICITARIA (MXN/MES)</span>
                  <input type="number" min={0} value={invPubli||""} onChange={(e)=>setInvPubli(Number(e.target.value))} placeholder="0" style={field} /></div>
              </div>
            </div>
            <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${P}18`, padding:22 }}>
              <h2 style={{ fontSize:14, fontWeight:700, color:"#1D1D1F", margin:"0 0 16px" }}>⚙️ Servicios a Incluir</h2>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {SMM_SERVICES.map((s)=>{
                  const on = smmSel.has(s.id);
                  return (
                    <div key={s.id} onClick={()=>toggleSmm(s.id)} style={{
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"12px 16px", borderRadius:10, cursor:"pointer", transition:"all 0.15s",
                      border:`1.5px solid ${on?P:"#E5E7EB"}`, background:on?`${P}08`:"#FAFAFA",
                    }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:18, height:18, borderRadius:5, flexShrink:0,
                          border:`2px solid ${on?P:"#D1D5DB"}`, background:on?P:"transparent",
                          display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {on&&<span style={{ color:"#fff", fontSize:11, fontWeight:900 }}>✓</span>}
                        </div>
                        <div>
                          <p style={{ margin:0, fontSize:13, fontWeight:600, color:on?P:"#374151" }}>{s.label}</p>
                          <p style={{ margin:0, fontSize:10, color:"#9CA3AF" }}>{s.hrs} hrs/mes</p>
                        </div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <p style={{ margin:0, fontSize:13, fontWeight:700, color:on?GRN:"#9CA3AF" }}>
                          {fmt(s.base)}{meses>=6&&on?<span style={{ fontSize:10, color:P }}> → {fmt(Math.round(s.base*1.05))}</span>:""}
                        </p>
                        <p style={{ margin:0, fontSize:9, color:"#C4B5FD" }}>por mes</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SMM Right */}
          <div className="ext-sticky" style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ background:`${smmLevel.color}12`, border:`2px solid ${smmLevel.color}30`,
              borderRadius:16, padding:"16px 18px", textAlign:"center" }}>
              <p style={{ fontSize:28, margin:"0 0 4px" }}>{smmLevel.emoji}</p>
              <p style={{ fontSize:12, fontWeight:800, color:smmLevel.color, margin:"0 0 6px", letterSpacing:"0.5px" }}>PAQUETE {smmLevel.label}</p>
              <p style={{ fontSize:11, color:"#6B7280", margin:0, lineHeight:1.4 }}>{smmLevel.desc}</p>
            </div>
            <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${P}18`, padding:20 }}>
              <h2 style={{ fontSize:13, fontWeight:700, color:"#1D1D1F", margin:"0 0 14px" }}>💰 Resumen Financiero</h2>
              {[
                { l:"Servicios activos", v:String(smmActive.length), c:P },
                { l:"Horas/mes", v:`${hrsTotal} hrs`, c:"#374151" },
                { l:"Honorarios mensuales", v:fmt(honorarios), c:GRN },
                ...(invPubli>0?[{ l:"Inversión Ads", v:fmt(invPubli), c:"#3B82F6" }]:[]),
                ...(invPubli>0?[{ l:"Total mensual cliente", v:fmt(totalMes), c:P }]:[]),
                { l:`Total contrato (${meses} mes${meses>1?"es":""})`, v:fmt(totalCtrt), c:P },
                { l:"Tarifa por hora", v:tarifaHr>0?fmt(tarifaHr):"—", c:"#374151" },
              ].map(({ l, v, c })=>(
                <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"7px 0", borderBottom:"1px solid #F9F7FF" }}>
                  <span style={{ fontSize:11, color:"#9CA3AF", fontWeight:500 }}>{l}</span>
                  <span style={{ fontSize:14, fontWeight:800, color:c }}>{v}</span>
                </div>
              ))}
            </div>
            <button onClick={copySMM} style={{ background:copied?GRN:P, color:"#fff", border:"none",
              borderRadius:12, padding:"12px", fontSize:13, fontWeight:700, cursor:"pointer",
              transition:"background 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {copied?"✅ ¡Copiado!":"📋 Copiar propuesta"}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB AUDIOVISUAL ───────────────────────────────────────────────────── */}
      {tab === "av" && (
        <div className="ext-sidebar-layout">

          {/* Left */}
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

            {/* Cliente */}
            <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${AV}22`, padding:20 }}>
              <h2 style={{ fontSize:14, fontWeight:700, color:"#1D1D1F", margin:"0 0 14px" }}>📋 Cliente</h2>
              <div><span style={lbl}>NOMBRE DEL CLIENTE / EMPRESA</span>
                <input value={avCliente} onChange={(e)=>setAvCliente(e.target.value)}
                  placeholder="Empresa, producción, evento…" style={field} /></div>
            </div>

            {/* Notice */}
            <div style={{ background:`${AV}08`, border:`1px solid ${AV}25`, borderRadius:12, padding:"10px 14px",
              fontSize:11, color:"#0369A1", display:"flex", alignItems:"center", gap:8 }}>
              <span>ℹ️</span>
              <span>Precios base sin IVA. El sistema aplica <strong>10% de utilidad</strong> automáticamente. Los días de producción incluyen ${new Intl.NumberFormat("es-MX").format(COMBUSTIBLE)} combustible + ${new Intl.NumberFormat("es-MX").format(CATERING)} catering por día. Los precios pueden variar.</span>
            </div>

            {/* Services by category */}
            {AV_CATS.map((cat) => {
              const items = AV_SERVICES.filter((s) => s.cat === cat);
              return (
                <div key={cat} style={{ background:"#fff", borderRadius:16, border:`1px solid ${AV}22`, padding:20 }}>
                  <h2 style={{ fontSize:13, fontWeight:700, color:"#1D1D1F", margin:"0 0 14px",
                    display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:15 }}>
                      {cat==="Video & Producción"?"🎬":cat==="Post-Producción"?"✂️":cat==="Fotografía"?"📷":"➕"}
                    </span>
                    {cat}
                  </h2>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {items.map((s) => {
                      const qty = avQty[s.id] ?? 0;
                      const on  = qty > 0;
                      const precioVenta = s.base * (1 + AV_MARGIN);
                      return (
                        <div key={s.id} style={{
                          display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
                          borderRadius:10, border:`1.5px solid ${on?AV:"#E5E7EB"}`,
                          background:on?`${AV}06`:"#FAFAFA", transition:"all 0.15s",
                        }}>
                          {/* Checkbox */}
                          <div onClick={()=>toggleAV(s.id)} style={{
                            width:18, height:18, borderRadius:5, flexShrink:0, cursor:"pointer",
                            border:`2px solid ${on?AV:"#D1D5DB"}`, background:on?AV:"transparent",
                            display:"flex", alignItems:"center", justifyContent:"center",
                          }}>
                            {on&&<span style={{ color:"#fff", fontSize:11, fontWeight:900 }}>✓</span>}
                          </div>

                          {/* Label */}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <p style={{ margin:0, fontSize:12, fontWeight:600,
                                color:on?AV:"#374151", whiteSpace:"nowrap",
                                overflow:"hidden", textOverflow:"ellipsis" }}>{s.label}</p>
                              <InfoBtn detail={s.detail} color={AV} />
                              {s.isProductionDay && (
                                <span style={{ fontSize:9, background:`#F59E0B18`, color:"#92400E",
                                  border:"1px solid #F59E0B44", borderRadius:99, padding:"1px 5px", flexShrink:0 }}>
                                  +prod
                                </span>
                              )}
                            </div>
                            <p style={{ margin:0, fontSize:10, color:"#9CA3AF" }}>
                              {s.base > 0 ? `${fmt(precioVenta)} / ${s.unit}` : "Precio por negociar"}
                            </p>
                          </div>

                          {/* Quantity */}
                          {on && (
                            <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                              <button onClick={()=>setQty(s.id, qty-1)} style={{
                                width:22, height:22, borderRadius:6, border:`1px solid ${AV}44`,
                                background:"#fff", color:AV, fontSize:14, fontWeight:700,
                                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                              <span style={{ fontSize:13, fontWeight:700, color:AV, minWidth:20, textAlign:"center" }}>{qty}</span>
                              <button onClick={()=>setQty(s.id, qty+1)} style={{
                                width:22, height:22, borderRadius:6, border:`1px solid ${AV}44`,
                                background:AV, color:"#fff", fontSize:14, fontWeight:700,
                                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                            </div>
                          )}

                          {/* Price total */}
                          <div style={{ textAlign:"right", flexShrink:0, minWidth:70 }}>
                            <p style={{ margin:0, fontSize:13, fontWeight:700,
                              color:on&&s.base>0?GRN:"#D1D5DB" }}>
                              {on&&s.base>0 ? fmt(precioVenta * qty) : "—"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right — summary + chart */}
          <div className="ext-sticky" style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Totals */}
            <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${AV}22`, padding:20 }}>
              <h2 style={{ fontSize:13, fontWeight:700, color:"#1D1D1F", margin:"0 0 14px" }}>💰 Resumen</h2>

              {avSelected.length === 0 ? (
                <p style={{ fontSize:12, color:"#9CA3AF", textAlign:"center", padding:"16px 0" }}>
                  Selecciona servicios para generar la cotización
                </p>
              ) : (
                <>
                  {/* Service lines */}
                  <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:12 }}>
                    {avSelected.map((s) => (
                      <div key={s.id} style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
                        <span style={{ color:"#6B7280" }}>{s.label} × {avQty[s.id]}</span>
                        <span style={{ fontWeight:600, color:"#374151" }}>
                          {s.base > 0 ? fmt(s.base * (avQty[s.id]??0)) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Dividers */}
                  {[
                    { l:"Subtotal (base)",        v:fmt(avSubtotalBase), c:"#374151", sm:true },
                    { l:"Utilidad 10%",           v:`+ ${fmt(margen)}`,  c:GRN,      sm:false },
                    ...(prodCostsTotal>0?[
                      { l:`Combustible (${prodDays} días)`, v:`+ ${fmt(combustibleTotal)}`, c:"#F59E0B", sm:true },
                      { l:`Catering (${prodDays} días)`,    v:`+ ${fmt(cateringTotal)}`,    c:"#F59E0B", sm:true },
                    ]:[]),
                    { l:"IVA 16%",                v:`+ ${fmt(avIVA)}`,   c:"#A78BFA", sm:false },
                  ].map(({ l, v, c, sm })=>(
                    <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                      padding:"6px 0", borderTop:"1px solid #F3F4F6" }}>
                      <span style={{ fontSize: sm?10:11, color:"#9CA3AF" }}>{l}</span>
                      <span style={{ fontSize: sm?11:12, fontWeight:700, color:c }}>{v}</span>
                    </div>
                  ))}

                  {/* TOTAL */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    padding:"10px 0 0", borderTop:`2px solid ${AV}30`, marginTop:4 }}>
                    <span style={{ fontSize:13, fontWeight:800, color:"#1D1D1F" }}>TOTAL</span>
                    <span style={{ fontSize:20, fontWeight:900, color:AV }}>{fmt(avTotal)}</span>
                  </div>
                  <p style={{ fontSize:9, color:"#9CA3AF", margin:"4px 0 0", textAlign:"right" }}>
                    MXN · IVA incluido · Precios pueden variar
                  </p>
                </>
              )}
            </div>

            {/* Chart */}
            {avTotal > 0 && (
              <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${AV}22`, padding:18 }}>
                <h2 style={{ fontSize:12, fontWeight:700, color:"#6B7280", margin:"0 0 12px", letterSpacing:"0.3px" }}>
                  COMPOSICIÓN DEL TOTAL
                </h2>
                <CompositionChart items={chartItems} />
              </div>
            )}

            {/* Copy */}
            <button onClick={copyAV} disabled={avSelected.length===0} style={{
              background: avCopied ? GRN : avSelected.length===0 ? "#E5E7EB" : AV,
              color: avSelected.length===0 ? "#9CA3AF" : "#fff",
              border:"none", borderRadius:12, padding:"12px", fontSize:13, fontWeight:700,
              cursor: avSelected.length===0 ? "not-allowed" : "pointer",
              transition:"background 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {avCopied ? "✅ ¡Copiado!" : "📋 Copiar cotización"}
            </button>

            <p style={{ fontSize:10, color:"#9CA3AF", textAlign:"center", margin:0 }}>
              Copia el resumen para pegar en email, WhatsApp o Word.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
