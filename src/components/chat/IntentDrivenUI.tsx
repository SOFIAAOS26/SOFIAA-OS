"use client";

/**
 * SOFIAA Sprint D-B2 — IntentDrivenUI
 *
 * Renderiza el componente correcto a partir de un UIIntent declarado por el LLM.
 * Cubre todos los casos de resolveIntent() del IntentEngine.
 * Compatible con los estilos Liquid Glass existentes en GenerativeUI.
 */

import { useRouter } from "next/navigation";
import { resolveIntent } from "@/core/intent.engine";
import type { UIIntent } from "@/types/intent";

interface Props {
  intent: UIIntent;
  onSend: (msg: string) => void;
  isDark?: boolean;
}

// ── Liquid Glass tokens (espejo de GenerativeUI.tsx) ─────────────────────
const LG_BLUR      = "blur(52px) saturate(220%)";
const LG_BORDER    = "1px solid rgba(255,255,255,0.88)";
const LG_HIGHLIGHT = "inset 0 1.5px 0 rgba(255,255,255,0.98), inset 0 -1px 0 rgba(200,210,255,0.12)";

// ── quick_actions ─────────────────────────────────────────────────────────

function QuickActions({
  actions,
  onSend,
  isDark,
}: {
  actions: { label: string; msg: string; icon?: string }[];
  onSend: (m: string) => void;
  isDark?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {actions.map((a, i) => (
        <button
          key={i}
          onClick={() => onSend(a.msg)}
          style={{
            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.52)",
            backdropFilter: LG_BLUR, WebkitBackdropFilter: LG_BLUR,
            border: isDark ? "1px solid rgba(255,255,255,0.14)" : LG_BORDER,
            boxShadow: isDark
              ? "0 2px 10px rgba(0,0,0,0.25)"
              : `0 2px 10px rgba(100,100,200,0.08), ${LG_HIGHLIGHT}`,
            borderRadius: 9999, padding: "6px 14px",
            fontSize: 12, fontWeight: 600,
            color: isDark ? "rgba(255,255,255,0.80)" : "#3D3D3F",
            cursor: "pointer", transition: "all 0.18s",
            display: "flex", alignItems: "center", gap: 5,
          }}
          onMouseEnter={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = isDark ? "rgba(79,124,255,0.18)" : "rgba(79,124,255,0.10)";
            b.style.color = "#4F7CFF";
            b.style.borderColor = "rgba(79,124,255,0.35)";
          }}
          onMouseLeave={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.52)";
            b.style.color = isDark ? "rgba(255,255,255,0.80)" : "#3D3D3F";
            b.style.borderColor = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.88)";
          }}
        >
          {a.icon && <span style={{ fontSize: 13 }}>{a.icon}</span>}
          {a.label}
        </button>
      ))}
    </div>
  );
}

// ── compare_table ─────────────────────────────────────────────────────────

function CompareTable({
  title,
  rows,
  isDark,
}: {
  title?: string;
  rows: Array<{ label: string; values: string[] }>;
  isDark?: boolean;
}) {
  if (!rows.length) return null;
  const colCount = rows[0]?.values.length ?? 1;

  return (
    <div style={{
      marginTop: 10,
      borderRadius: 14,
      overflow: "hidden",
      border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(79,124,255,0.18)",
    }}>
      {title && (
        <div style={{
          padding: "8px 14px",
          background: isDark ? "rgba(79,124,255,0.14)" : "rgba(79,124,255,0.08)",
          fontSize: 12, fontWeight: 700,
          color: isDark ? "#a5b8ff" : "#3355cc",
        }}>
          {title}
        </div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{
                background: i % 2 === 0
                  ? (isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.55)")
                  : (isDark ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.30)"),
              }}
            >
              <td style={{
                padding: "7px 14px", fontWeight: 600,
                color: isDark ? "rgba(255,255,255,0.65)" : "#555",
                width: `${100 / (colCount + 1)}%`,
                borderRight: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
              }}>
                {row.label}
              </td>
              {row.values.map((v, j) => (
                <td key={j} style={{
                  padding: "7px 14px",
                  color: isDark ? "rgba(255,255,255,0.82)" : "#222",
                  borderRight: j < row.values.length - 1
                    ? (isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)")
                    : undefined,
                }}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── info_card ─────────────────────────────────────────────────────────────

const INFO_VARIANTS = {
  default: { bg: "rgba(79,124,255,0.08)", border: "rgba(79,124,255,0.20)", icon: "#4F7CFF", text: "#1a2744" },
  success: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", icon: "#059669", text: "#064e3b" },
  warning: { bg: "rgba(245,158,11,0.09)", border: "rgba(245,158,11,0.28)", icon: "#d97706", text: "#78350f" },
  purple:  { bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.22)", icon: "#7C3AED", text: "#3b0764" },
};

function InfoCard({
  icon, title, text, variant, isDark,
}: {
  icon?: string; title: string; text: string; variant?: string; isDark?: boolean;
}) {
  const v = INFO_VARIANTS[(variant as keyof typeof INFO_VARIANTS) ?? "default"] ?? INFO_VARIANTS.default;
  return (
    <div style={{
      marginTop: 10,
      background: isDark ? "rgba(255,255,255,0.05)" : v.bg,
      border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : v.border}`,
      borderRadius: 14, padding: "12px 16px",
      display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      {icon && (
        <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      )}
      <div>
        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 13, color: isDark ? "rgba(255,255,255,0.90)" : v.icon }}>
          {title}
        </p>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: isDark ? "rgba(255,255,255,0.60)" : v.text }}>
          {text}
        </p>
      </div>
    </div>
  );
}

// ── confirm_card ──────────────────────────────────────────────────────────

function ConfirmCard({
  title, description, actions, onSend, isDark,
}: {
  title: string;
  description: string;
  actions: { label: string; msg: string; style?: string }[];
  onSend: (m: string) => void;
  isDark?: boolean;
}) {
  return (
    <div style={{
      marginTop: 10,
      background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.62)",
      backdropFilter: LG_BLUR, WebkitBackdropFilter: LG_BLUR,
      border: isDark ? "1px solid rgba(255,255,255,0.10)" : LG_BORDER,
      boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.30)" : `0 4px 20px rgba(100,100,200,0.08), ${LG_HIGHLIGHT}`,
      borderRadius: 16, padding: "14px 16px",
    }}>
      <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 13, color: isDark ? "#ECECF1" : "#1D1D1F" }}>
        {title}
      </p>
      {description && (
        <p style={{ margin: "0 0 12px", fontSize: 12, lineHeight: 1.55, color: isDark ? "rgba(255,255,255,0.55)" : "#555" }}>
          {description}
        </p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {actions.map((a, i) => {
          const isPrimary = a.style === "primary" || i === 0;
          const isDanger  = a.style === "danger";
          return (
            <button
              key={i}
              onClick={() => onSend(a.msg)}
              style={{
                padding: "6px 16px", borderRadius: 9999,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: "none", transition: "all 0.18s",
                background: isDanger
                  ? "rgba(239,68,68,0.14)"
                  : isPrimary
                    ? "linear-gradient(135deg, #4F7CFF, #9B4FD9)"
                    : "rgba(0,0,0,0.06)",
                color: isDanger ? "#dc2626" : isPrimary ? "#fff" : (isDark ? "rgba(255,255,255,0.72)" : "#444"),
              }}
            >
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── goal_progress ─────────────────────────────────────────────────────────

function GoalProgress({
  current, total, stepName, isDark,
}: {
  current: number; total: number; stepName: string; isDark?: boolean;
}) {
  const pct = Math.round((current / total) * 100);
  return (
    <div style={{
      marginTop: 10,
      background: isDark ? "rgba(79,124,255,0.10)" : "rgba(79,124,255,0.06)",
      border: `1px solid ${isDark ? "rgba(79,124,255,0.24)" : "rgba(79,124,255,0.18)"}`,
      borderRadius: 14, padding: "10px 14px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? "#a5b8ff" : "#4F7CFF", letterSpacing: "0.06em" }}>
          OBJETIVO — paso {current}/{total}
        </span>
        <span style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.45)" : "#888" }}>
          {pct}%
        </span>
      </div>
      <div style={{
        height: 4, borderRadius: 99,
        background: isDark ? "rgba(255,255,255,0.10)" : "rgba(79,124,255,0.15)",
        overflow: "hidden", marginBottom: 8,
      }}>
        <div style={{
          height: "100%", borderRadius: 99, transition: "width 0.4s ease",
          width: `${pct}%`,
          background: "linear-gradient(90deg, #4F7CFF, #9B4FD9)",
        }} />
      </div>
      {stepName && (
        <p style={{ margin: 0, fontSize: 11, color: isDark ? "rgba(255,255,255,0.55)" : "#666" }}>
          {stepName}
        </p>
      )}
    </div>
  );
}

// ── extension_card ────────────────────────────────────────────────────────

function ExtensionCard({
  icon, name, desc, path, isDark,
}: {
  icon?: string; name: string; desc: string; path: string; isDark?: boolean;
}) {
  const router = useRouter();
  return (
    <div
      onClick={() => router.push(path)}
      style={{
        marginTop: 10, cursor: "pointer",
        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.60)",
        backdropFilter: LG_BLUR, WebkitBackdropFilter: LG_BLUR,
        border: isDark ? "1px solid rgba(255,255,255,0.10)" : LG_BORDER,
        boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.30)" : `0 4px 20px rgba(100,100,200,0.08), ${LG_HIGHLIGHT}`,
        borderRadius: 16, padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 14,
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
    >
      <span style={{
        fontSize: 28, flexShrink: 0, width: 48, height: 48,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg,rgba(79,124,255,0.12),rgba(138,32,255,0.12))",
        borderRadius: 12,
      }}>
        {icon ?? "⚡"}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13, color: isDark ? "#ECECF1" : "#1D1D1F" }}>
          {name}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: isDark ? "rgba(255,255,255,0.50)" : "#9CA3AF", lineHeight: 1.4 }}>
          {desc}
        </p>
      </div>
      <span style={{ fontSize: 14, color: "#4F7CFF", fontWeight: 700, flexShrink: 0 }}>→</span>
    </div>
  );
}

// ── success_card ──────────────────────────────────────────────────────────

function SuccessCard({
  title, message, isDark,
}: {
  title: string; message: string; isDark?: boolean;
}) {
  return (
    <div style={{
      marginTop: 10,
      background: isDark ? "rgba(16,185,129,0.10)" : "rgba(16,185,129,0.08)",
      border: `1px solid ${isDark ? "rgba(16,185,129,0.24)" : "rgba(16,185,129,0.25)"}`,
      borderRadius: 14, padding: "12px 16px",
      display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>✅</span>
      <div>
        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 13, color: isDark ? "#6ee7b7" : "#059669" }}>
          {title}
        </p>
        {message && (
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: isDark ? "rgba(255,255,255,0.60)" : "#064e3b" }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

// ── data_list ─────────────────────────────────────────────────────────────

function DataList({
  title, items, isDark,
}: {
  title?: string; items: string[]; isDark?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div style={{
      marginTop: 10,
      background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
      border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.07)",
      borderRadius: 14, overflow: "hidden",
    }}>
      {title && (
        <div style={{
          padding: "8px 14px", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.07em", textTransform: "uppercase" as const,
          color: isDark ? "rgba(255,255,255,0.45)" : "#888",
          borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.05)",
        }}>
          {title}
        </div>
      )}
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            padding: "8px 14px", fontSize: 12,
            color: isDark ? "rgba(255,255,255,0.80)" : "#222",
            borderBottom: i < items.length - 1
              ? (isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)")
              : undefined,
            background: i % 2 === 0
              ? (isDark ? "rgba(255,255,255,0.02)" : "transparent")
              : (isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)"),
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────

export default function IntentDrivenUI({ intent, onSend, isDark }: Props) {
  const resolved = resolveIntent(intent);

  if (resolved.type === "none") return null;

  switch (resolved.type) {
    case "quick_actions":
      return <QuickActions    {...resolved.props} onSend={onSend} isDark={isDark} />;
    case "compare_table":
      return <CompareTable    {...resolved.props} isDark={isDark} />;
    case "info_card":
      return <InfoCard        {...resolved.props} isDark={isDark} />;
    case "confirm_card":
      return <ConfirmCard     {...resolved.props} onSend={onSend} isDark={isDark} />;
    case "goal_progress":
      return <GoalProgress    {...resolved.props} isDark={isDark} />;
    case "extension_card":
      return <ExtensionCard   {...resolved.props} isDark={isDark} />;
    case "success_card":
      return <SuccessCard     {...resolved.props} isDark={isDark} />;
    case "data_list":
      return <DataList        {...resolved.props} isDark={isDark} />;
    default:
      return null;
  }
}
