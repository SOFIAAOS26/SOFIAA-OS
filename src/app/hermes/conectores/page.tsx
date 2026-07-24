"use client";

/**
 * HERMES — Conectores (Sprint H-6)
 *
 * UI de configuración de conectores Etapa 1.
 * Los tokens/webhooks se guardan en Firestore vía API autenticada.
 * Las credenciales nunca se exponen en la UI — se usan tipo="password".
 */

import { useState, useEffect } from "react";
import { getAuth }             from "firebase/auth";
import { useWorkspace }        from "@/hooks/useWorkspace";
import { subscribeHermesConnectors } from "@/lib/hermes/firestore";
import type { HermesConnectorConfig } from "@/extensions/hermes/schema";
import { CONNECTOR_LABELS }          from "@/extensions/hermes/schema";

// ── Colores ───────────────────────────────────────────────────────────────────

const C = {
  text:   "#e2e8f0",
  muted:  "#64748b",
  card:   "#0f0f1e",
  border: "#1a1a30",
  green:  "#22c55e",
  yellow: "#f59e0b",
  cyan:   "#22d3ee",
  red:    "#ef4444",
  indigo: "#6366f1",
};

// ── Tipos locales ─────────────────────────────────────────────────────────────

interface FormState {
  apiToken:   string;
  webhookUrl: string;
  boardId:    string;
  channelId:  string;
}

interface TestResult {
  ok:      boolean;
  mensaje: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  return getAuth().currentUser?.getIdToken() ?? null;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ConectoresPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [conectores,   setConectores]   = useState<HermesConnectorConfig[]>([]);
  const [openForm,     setOpenForm]     = useState<string | null>(null);
  const [forms,        setForms]        = useState<Record<string, FormState>>({});
  const [saving,       setSaving]       = useState<string | null>(null);
  const [testing,      setTesting]      = useState<string | null>(null);
  const [saveResult,   setSaveResult]   = useState<Record<string, string>>({});
  const [testResult,   setTestResult]   = useState<Record<string, TestResult>>({});

  useEffect(() => {
    if (!activeWorkspaceId) return;
    return subscribeHermesConnectors(activeWorkspaceId, setConectores);
  }, [activeWorkspaceId]);

  function getConfig(tipo: string): HermesConnectorConfig | undefined {
    return conectores.find((c) => c.tipo === tipo);
  }

  function getForm(tipo: string): FormState {
    return forms[tipo] ?? { apiToken: "", webhookUrl: "", boardId: "", channelId: "" };
  }

  function setField(tipo: string, field: keyof FormState, value: string) {
    setForms((prev) => ({
      ...prev,
      [tipo]: { ...getForm(tipo), [field]: value },
    }));
  }

  async function handleSave(tipo: string) {
    if (!activeWorkspaceId) return;
    setSaving(tipo);
    setSaveResult((prev) => ({ ...prev, [tipo]: "" }));

    try {
      const token = await getToken();
      if (!token) throw new Error("No autenticado");

      const form = getForm(tipo);
      const res  = await fetch("/api/hermes/conectores/config", {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body:    JSON.stringify({
          workspaceId: activeWorkspaceId,
          tipo,
          secrets:  { apiToken: form.apiToken, webhookUrl: form.webhookUrl },
          metadata: { boardId: form.boardId, channelId: form.channelId },
        }),
      });

      const data = await res.json() as { ok?: boolean; status?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Error al guardar");

      setSaveResult((prev) => ({
        ...prev,
        [tipo]: data.status === "activo" ? "✓ Conector activado" : "✓ Configuración guardada",
      }));
      // Limpiar campos sensibles tras guardar
      setForms((prev) => ({
        ...prev,
        [tipo]: { ...getForm(tipo), apiToken: "", webhookUrl: "" },
      }));
    } catch (err) {
      setSaveResult((prev) => ({
        ...prev,
        [tipo]: `Error: ${err instanceof Error ? err.message : "Desconocido"}`,
      }));
    } finally {
      setSaving(null);
    }
  }

  async function handleTest(tipo: string) {
    if (!activeWorkspaceId) return;
    setTesting(tipo);
    setTestResult((prev) => ({ ...prev, [tipo]: { ok: false, mensaje: "" } }));

    try {
      const token = await getToken();
      if (!token) throw new Error("No autenticado");

      const res  = await fetch("/api/hermes/conectores/test", {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body:    JSON.stringify({ workspaceId: activeWorkspaceId, tipo }),
      });

      const data = await res.json() as { ok: boolean; mensaje: string };
      setTestResult((prev) => ({ ...prev, [tipo]: data }));
    } catch (err) {
      setTestResult((prev) => ({
        ...prev,
        [tipo]: { ok: false, mensaje: `Error: ${err instanceof Error ? err.message : "Desconocido"}` },
      }));
    } finally {
      setTesting(null);
    }
  }

  // ── Render tarjeta Etapa 1 ──────────────────────────────────────────────────

  function renderEtapa1Card(tipo: string) {
    const meta    = CONNECTOR_LABELS[tipo as keyof typeof CONNECTOR_LABELS];
    const config  = getConfig(tipo);
    const status  = config?.status ?? "pendiente_config";
    const isOpen  = openForm === tipo;
    const form    = getForm(tipo);
    const sr      = saveResult[tipo];
    const tr      = testResult[tipo];

    const isInterno  = tipo === "hermes_interno" || tipo === "calendario_smm";
    const statusBadge =
      status === "activo"           ? { color: C.green,  label: "ACTIVO"      } :
      status === "pendiente_config" ? { color: C.yellow, label: "CONFIGURAR"  } :
                                      { color: C.red,    label: "ERROR"       };

    return (
      <div key={tipo} style={{
        background: C.card, border: `1px solid ${isOpen ? C.indigo : C.border}`,
        borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>{meta.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{meta.nombre}</div>
              {config?.boardId  && <div style={{ fontSize: 10, color: C.muted }}>Board: {config.boardId}</div>}
              {config?.channelId && <div style={{ fontSize: 10, color: C.muted }}>Canal: {config.channelId}</div>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, color: statusBadge.color,
              background: `${statusBadge.color}18`, padding: "2px 8px", borderRadius: 4,
            }}>{statusBadge.label}</span>
            {!isInterno && (
              <button
                onClick={() => setOpenForm(isOpen ? null : tipo)}
                style={{
                  fontSize: 11, color: C.indigo, background: "transparent",
                  border: `1px solid ${C.indigo}40`, borderRadius: 6, padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                {isOpen ? "Cerrar" : status === "activo" ? "Editar" : "Configurar"}
              </button>
            )}
          </div>
        </div>

        {/* Conector interno — sin formulario */}
        {isInterno && (
          <div style={{ paddingBottom: 14, paddingLeft: 20, fontSize: 11, color: C.muted }}>
            Conector interno — activo automáticamente vía Firebase
          </div>
        )}

        {/* Formulario expandible */}
        {!isInterno && isOpen && (
          <div style={{
            borderTop: `1px solid ${C.border}`, padding: "20px 20px 24px",
            background: "#0a0a1a",
          }}>
            {tipo === "monday_cloud" && (
              <>
                <Field label="API Token de Monday.com" note="Genera el token en Monday → Avatar → Admin → API">
                  <SecretInput
                    value={form.apiToken}
                    onChange={(v) => setField(tipo, "apiToken", v)}
                    placeholder="mon_api_xxxxxxxxxxxxxxxx"
                  />
                </Field>
                <Field label="Board ID por defecto" note="ID del board donde HERMES creará tareas (opcional)">
                  <TextInput
                    value={form.boardId}
                    onChange={(v) => setField(tipo, "boardId", v)}
                    placeholder="1234567890"
                  />
                </Field>
              </>
            )}

            {tipo === "slack" && (
              <>
                <Field label="Incoming Webhook URL" note="Crea el webhook en api.slack.com/apps → Incoming Webhooks">
                  <SecretInput
                    value={form.webhookUrl}
                    onChange={(v) => setField(tipo, "webhookUrl", v)}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </Field>
                <Field label="Canal por defecto" note="Canal donde HERMES enviará mensajes (opcional)">
                  <TextInput
                    value={form.channelId}
                    onChange={(v) => setField(tipo, "channelId", v)}
                    placeholder="#marketing"
                  />
                </Field>
              </>
            )}

            {/* Nota de seguridad */}
            <p style={{ fontSize: 10, color: C.muted, margin: "12px 0 16px", lineHeight: 1.5 }}>
              🔒 Las credenciales se guardan de forma segura en tu base de datos Firebase, accesibles solo para tu cuenta.
            </p>

            {/* Botones */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => handleSave(tipo)}
                disabled={saving === tipo}
                style={{
                  fontSize: 12, fontWeight: 600, color: "#fff",
                  background: saving === tipo ? "#334155" : C.indigo,
                  border: "none", borderRadius: 8, padding: "8px 18px",
                  cursor: saving === tipo ? "not-allowed" : "pointer",
                }}
              >
                {saving === tipo ? "Guardando..." : "Guardar configuración"}
              </button>

              {status === "activo" && (
                <button
                  onClick={() => handleTest(tipo)}
                  disabled={testing === tipo}
                  style={{
                    fontSize: 12, fontWeight: 600, color: C.cyan,
                    background: "transparent", border: `1px solid ${C.cyan}40`,
                    borderRadius: 8, padding: "8px 18px",
                    cursor: testing === tipo ? "not-allowed" : "pointer",
                  }}
                >
                  {testing === tipo ? "Probando..." : "Probar conexión"}
                </button>
              )}
            </div>

            {/* Resultados */}
            {sr && (
              <p style={{
                marginTop: 12, fontSize: 12,
                color: sr.startsWith("Error") ? C.red : C.green,
              }}>{sr}</p>
            )}
            {tr?.mensaje && (
              <p style={{
                marginTop: 8, fontSize: 12,
                color: tr.ok ? C.green : C.red,
              }}>{tr.mensaje}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const etapa1 = (Object.keys(CONNECTOR_LABELS) as string[]).filter(
    (t) => CONNECTOR_LABELS[t as keyof typeof CONNECTOR_LABELS].etapa === 1
  );
  const etapa2 = (Object.keys(CONNECTOR_LABELS) as string[]).filter(
    (t) => CONNECTOR_LABELS[t as keyof typeof CONNECTOR_LABELS].etapa === 2
  );

  return (
    <div style={{ padding: "32px 24px", maxWidth: 820, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>🔌 Conectores</h1>
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
          Configura las plataformas externas de HERMES. Las credenciales se guardan de forma segura en Firebase.
        </p>
      </div>

      {/* Etapa 1 */}
      <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: "0 0 12px" }}>
        Etapa 1 — Disponibles ahora
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
        {etapa1.map((tipo) => renderEtapa1Card(tipo))}
      </div>

      {/* Etapa 2 */}
      <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>
        Etapa 2 — En la hoja de ruta
      </h2>
      <p style={{ fontSize: 11, color: C.muted, margin: "0 0 14px" }}>
        El schema de HERMES ya contempla estos conectores. Se activarán con sus respectivos tokens.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {etapa2.map((tipo) => {
          const meta = CONNECTOR_LABELS[tipo as keyof typeof CONNECTOR_LABELS];
          return (
            <div key={tipo} style={{
              background: C.card, border: `1px dashed ${C.border}`,
              borderRadius: 12, padding: "16px 20px", opacity: 0.6,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{meta.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{meta.nombre}</span>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: C.cyan,
                  background: `${C.cyan}15`, padding: "2px 8px", borderRadius: 4,
                }}>ETAPA 2</span>
              </div>
              <p style={{ fontSize: 10, color: C.muted, margin: "8px 0 0" }}>
                {tipo === "meta_ads"          && "Requiere Meta Business App + OAuth2"}
                {tipo === "google_ads"        && "Requiere Google Ads Developer Token"}
                {tipo === "whatsapp_business" && "Requiere WhatsApp Business API aprobada"}
                {tipo === "mailchimp"         && "Requiere Mailchimp API Key"}
                {tipo === "hubspot_crm"       && "Requiere HubSpot Private App Token"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Componentes de formulario ─────────────────────────────────────────────────

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {note && <p style={{ fontSize: 10, color: "#475569", margin: "4px 0 0" }}>{note}</p>}
    </div>
  );
}

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "••••••••••••••••"}
      autoComplete="off"
      style={{
        width: "100%", boxSizing: "border-box",
        background: "#0a0a18", border: "1px solid #1e1e2e",
        borderRadius: 8, padding: "8px 12px",
        color: "#e2e8f0", fontSize: 12, fontFamily: "monospace",
        outline: "none",
      }}
    />
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? ""}
      style={{
        width: "100%", boxSizing: "border-box",
        background: "#0a0a18", border: "1px solid #1e1e2e",
        borderRadius: 8, padding: "8px 12px",
        color: "#e2e8f0", fontSize: 12,
        outline: "none",
      }}
    />
  );
}
