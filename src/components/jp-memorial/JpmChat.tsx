"use client";

// ── JP Memorial — Chat Flotante de SOFIAA ────────────────────────
// Botón circular fijo en bottom-right. Abre overlay con chat contextualizado
// al extensionContext de JP Memorial (paquetes, servicios, glosario, etc.)

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { jpMemorialExtension } from "@/extensions/jp-memorial/manifest";

const C = {
  brown:  "#8B5A2B",
  dark:   "#3D1C08",
  gold:   "#C8922A",
  soft:   "#F5F0EB",
  border: "#E8DDD5",
  muted:  "#7A6A5A",
};

type Message = { role: "user" | "assistant"; content: string };

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hola, soy SOFIAA. Estoy aquí para acompañarte y responder cualquier pregunta sobre nuestros servicios, paquetes o lo que necesites. ¿En qué puedo ayudarte?",
};

export default function JpmChat() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const endRef                  = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  // Scroll al último mensaje
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus al abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages([...updated, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated,
          extensionContext: jpMemorialExtension.contextBlock,
        }),
      });

      if (!res.ok || !res.body) throw new Error("stream error");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const arr  = [...prev];
          const last = arr[arr.length - 1];
          if (last.role === "assistant") {
            arr[arr.length - 1] = { ...last, content: last.content + chunk };
          }
          return arr;
        });
      }
    } catch {
      setMessages((prev) => {
        const arr = [...prev];
        arr[arr.length - 1] = {
          role: "assistant",
          content: "Hubo un problema al conectar. Intenta de nuevo o llámanos al 8115-20-2121.",
        };
        return arr;
      });
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <>
      {/* ── Panel de chat ──────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            right: 20,
            width: "min(380px, calc(100vw - 32px))",
            height: "min(520px, calc(100dvh - 140px))",
            background: "#FDFAF7",
            borderRadius: 20,
            border: `1px solid ${C.border}`,
            boxShadow: "0 16px 48px rgba(61,28,8,0.16), 0 2px 8px rgba(0,0,0,0.06)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9998,
            animation: "jpmChatIn 0.22s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {/* Header */}
          <div style={{
            background: C.dark,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "rgba(200,146,42,0.25)",
              border: `1.5px solid ${C.gold}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, color: C.gold, fontWeight: 800,
            }}>
              S
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>SOFIAA</p>
              <p style={{ fontSize: 10, color: "#A89880", margin: 0 }}>Jardines de Juan Pablo · En línea</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "none", borderRadius: 8,
                width: 28, height: 28, cursor: "pointer",
                color: "#AAA", fontSize: 16, lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ×
            </button>
          </div>

          {/* Mensajes */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "14px 14px 8px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%",
                  padding: "9px 13px",
                  borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: m.role === "user"
                    ? `linear-gradient(135deg, ${C.brown}, ${C.dark})`
                    : "#fff",
                  border: m.role === "user" ? "none" : `1px solid ${C.border}`,
                  color: m.role === "user" ? "#fff" : "#3D2A1A",
                  fontSize: 13,
                  lineHeight: 1.55,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}>
                  {m.role === "user" ? (
                    m.content
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p:      ({ children }) => <p style={{ margin: "0 0 4px" }}>{children}</p>,
                        strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
                        ul:     ({ children }) => <ul style={{ margin: "4px 0", paddingLeft: 16 }}>{children}</ul>,
                        li:     ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  )}
                  {m.role === "assistant" && loading && i === messages.length - 1 && (
                    <span style={{
                      display: "inline-block", width: 2, height: 12,
                      background: C.brown, marginLeft: 2, verticalAlign: "middle",
                      animation: "jpmBlink 1s step-end infinite",
                    }} />
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Sugerencias rápidas — solo al inicio */}
          {messages.length === 1 && (
            <div style={{ padding: "4px 14px 6px", display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0 }}>
              {[
                "¿Qué incluye el paquete Oro?",
                "¿Cuál es la diferencia entre inhumación y cremación?",
                "¿Tienen servicio de urgencias?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  style={{
                    background: C.soft, border: `1px solid ${C.border}`,
                    borderRadius: 20, padding: "5px 12px",
                    fontSize: 11, color: C.brown, fontWeight: 600, cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#EDE3D9"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.soft; }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: "10px 12px",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            gap: 8,
            flexShrink: 0,
            background: "#FDFAF7",
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Escribe tu pregunta..."
              disabled={loading}
              style={{
                flex: 1,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: "8px 14px",
                fontSize: 13,
                color: "#3D2A1A",
                background: "#fff",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: input.trim() && !loading
                  ? `linear-gradient(135deg, ${C.brown}, ${C.dark})`
                  : "#E8DDD5",
                border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s",
                flexShrink: 0,
              }}
              aria-label="Enviar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}
                strokeLinecap="round" strokeLinejoin="round"
                style={{ width: 14, height: 14 }}>
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Botón flotante ─────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Hablar con SOFIAA"
        style={{
          position: "fixed",
          bottom: 22,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: open
            ? C.dark
            : `linear-gradient(135deg, ${C.brown} 0%, ${C.dark} 100%)`,
          border: `2px solid ${C.gold}`,
          boxShadow: open
            ? `0 4px 16px rgba(61,28,8,0.3)`
            : `0 6px 24px rgba(61,28,8,0.28), 0 0 0 4px rgba(200,146,42,0.15)`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          transition: "all 0.2s",
          transform: open ? "scale(0.95)" : "scale(1)",
        }}
        aria-label={open ? "Cerrar chat" : "Abrir chat SOFIAA"}
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth={2.5}
            strokeLinecap="round" style={{ width: 18, height: 18 }}>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <span style={{ fontSize: 22, lineHeight: 1 }}>◎</span>
        )}
      </button>

      {/* ── Keyframes inline ───────────────────────────────────── */}
      <style>{`
        @keyframes jpmChatIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes jpmBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </>
  );
}
