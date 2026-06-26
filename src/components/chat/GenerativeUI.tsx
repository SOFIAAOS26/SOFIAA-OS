"use client";

import { useRouter } from "next/navigation";
import type { UIBlock, QuickActionsBlock, InfoCardBlock, ExtensionCardBlock } from "@/types/generative-ui";

interface Props {
  blocks: UIBlock[];
  onSend: (msg: string) => void;
  isDark?: boolean;
}

// ── Liquid Glass tokens (deben coincidir con page.tsx)
const LG_BLUR = "blur(52px) saturate(220%)";
const LG_BORDER = "1px solid rgba(255,255,255,0.88)";
const LG_HIGHLIGHT = "inset 0 1.5px 0 rgba(255,255,255,0.98), inset 0 -1px 0 rgba(200,210,255,0.12)";

// ── quick_actions ─────────────────────────────────────────────────────────────
function QuickActionsUI({ block, onSend, isDark }: { block: QuickActionsBlock; onSend: (m: string) => void; isDark?: boolean }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {block.actions.map((a, i) => (
        <button
          key={i}
          onClick={() => onSend(a.msg)}
          style={{
            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.52)",
            backdropFilter: LG_BLUR,
            WebkitBackdropFilter: LG_BLUR,
            border: isDark ? "1px solid rgba(255,255,255,0.14)" : LG_BORDER,
            boxShadow: isDark
              ? "0 2px 10px rgba(0,0,0,0.25)"
              : `0 2px 10px rgba(100,100,200,0.08), ${LG_HIGHLIGHT}`,
            borderRadius: 9999,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 600,
            color: isDark ? "rgba(255,255,255,0.80)" : "#3D3D3F",
            cursor: "pointer",
            transition: "all 0.18s",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = isDark
              ? "rgba(79,124,255,0.18)"
              : "rgba(79,124,255,0.10)";
            (e.currentTarget as HTMLButtonElement).style.color = "#4F7CFF";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(79,124,255,0.35)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.52)";
            (e.currentTarget as HTMLButtonElement).style.color = isDark ? "rgba(255,255,255,0.80)" : "#3D3D3F";
            (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.88)";
          }}
        >
          {a.icon && <span style={{ fontSize: 13 }}>{a.icon}</span>}
          {a.label}
        </button>
      ))}
    </div>
  );
}

// ── info_card ─────────────────────────────────────────────────────────────────
const INFO_VARIANTS = {
  default: { bg: "rgba(79,124,255,0.08)", border: "rgba(79,124,255,0.20)", icon: "#4F7CFF", text: "#1a2744" },
  success: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", icon: "#059669", text: "#064e3b" },
  warning: { bg: "rgba(245,158,11,0.09)", border: "rgba(245,158,11,0.28)", icon: "#d97706", text: "#78350f" },
  purple:  { bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.22)", icon: "#7C3AED", text: "#3b0764" },
};

function InfoCardUI({ block, isDark }: { block: InfoCardBlock; isDark?: boolean }) {
  const v = INFO_VARIANTS[block.variant ?? "default"];
  return (
    <div
      style={{
        marginTop: 10,
        background: isDark ? "rgba(255,255,255,0.05)" : v.bg,
        border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : v.border}`,
        borderRadius: 14,
        padding: "12px 16px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{block.icon}</span>
      <div>
        <p style={{
          margin: "0 0 4px",
          fontWeight: 700,
          fontSize: 13,
          color: isDark ? "rgba(255,255,255,0.90)" : v.icon,
        }}>
          {block.title}
        </p>
        <p style={{
          margin: 0,
          fontSize: 12,
          lineHeight: 1.55,
          color: isDark ? "rgba(255,255,255,0.60)" : v.text,
        }}>
          {block.text}
        </p>
      </div>
    </div>
  );
}

// ── extension_card ────────────────────────────────────────────────────────────
function ExtensionCardUI({ block, isDark }: { block: ExtensionCardBlock; isDark?: boolean }) {
  const router = useRouter();
  return (
    <div
      style={{
        marginTop: 10,
        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.60)",
        backdropFilter: LG_BLUR,
        WebkitBackdropFilter: LG_BLUR,
        border: isDark ? "1px solid rgba(255,255,255,0.10)" : LG_BORDER,
        boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.30)" : `0 4px 20px rgba(100,100,200,0.08), ${LG_HIGHLIGHT}`,
        borderRadius: 16,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onClick={() => router.push(block.path)}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
    >
      <span style={{
        fontSize: 28,
        background: "linear-gradient(135deg,rgba(79,124,255,0.12),rgba(138,32,255,0.12))",
        borderRadius: 12,
        width: 48, height: 48,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {block.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13, color: isDark ? "#ECECF1" : "#1D1D1F" }}>
          {block.name}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: isDark ? "rgba(255,255,255,0.50)" : "#9CA3AF", lineHeight: 1.4 }}>
          {block.desc}
        </p>
      </div>
      <span style={{ fontSize: 14, color: "#4F7CFF", fontWeight: 700, flexShrink: 0 }}>→</span>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function GenerativeUI({ blocks, onSend, isDark }: Props) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div style={{ marginTop: 4 }}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "quick_actions":
            return <QuickActionsUI key={i} block={block} onSend={onSend} isDark={isDark} />;
          case "info_card":
            return <InfoCardUI key={i} block={block} isDark={isDark} />;
          case "extension_card":
            return <ExtensionCardUI key={i} block={block} isDark={isDark} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
