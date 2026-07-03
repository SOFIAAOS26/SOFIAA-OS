"use client";

import CognitiveDashboard from "./CognitiveDashboard";
import TimelineUI from "./TimelineUI";
import PipelineObserver from "./PipelineObserver";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AdminPanelProps {
  messages: Message[];
  onClose: () => void;
  onClearMemory: () => void;
  onClearConversation: () => void;
  onUpdateLongMemory: (text: string) => void;
  onResumeSession: (summary: string) => void;
}

const gradientText: React.CSSProperties = {
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  background: "linear-gradient(135deg, #4F7CFF 0%, #9B4FD9 38%, #E91E8C 68%, #FF6B35 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.9)",
  boxShadow: "0 4px 24px rgba(100,100,200,0.08)",
  borderRadius: "20px",
  padding: "1.25rem",
};

export default function AdminPanel({
  messages,
  onClose,
  onClearMemory,
  onClearConversation,
  onUpdateLongMemory,
  onResumeSession,
}: AdminPanelProps) {
  const longMemory  = typeof window !== "undefined" ? localStorage.getItem("sofiaa_long_memory") ?? "" : "";
  const userMessages = messages.filter((m) => m.role === "user").length;
  const aiMessages   = messages.filter((m) => m.role === "assistant").length;

  const handleMemoryEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    localStorage.setItem("sofiaa_long_memory", val);
    onUpdateLongMemory(val);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(200,210,255,0.25)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col gap-4"
        style={{ ...card, padding: "1.75rem", borderRadius: "28px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase font-light" style={{ color: "rgba(0,0,0,0.3)" }}>
              SOFIAA LAB
            </p>
            <h2 style={{ ...gradientText, fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Panel de Control
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-full transition-all hover:scale-105"
            style={{ background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.08)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="rgba(0,0,0,0.4)" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Mensajes tuyos", value: userMessages },
            { label: "Respuestas SOFIAA", value: aiMessages },
            { label: "Total", value: messages.length },
          ].map(({ label, value }) => (
            <div key={label} className="text-center rounded-2xl py-3"
              style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.9)" }}>
              <p style={{ ...gradientText, fontSize: "1.6rem", fontWeight: 700 }}>{value}</p>
              <p className="text-xs font-light mt-0.5" style={{ color: "rgba(0,0,0,0.4)" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Memoria a largo plazo */}
        <div style={card}>
          <p className="text-xs font-semibold tracking-wide uppercase mb-2" style={{ color: "rgba(0,0,0,0.35)" }}>
            Memoria a largo plazo
          </p>
          <textarea
            defaultValue={longMemory}
            onChange={handleMemoryEdit}
            placeholder="Sin memoria acumulada aún. Inicia conversaciones y resetea para que SOFIAA aprenda."
            rows={5}
            className="w-full text-sm resize-none focus:outline-none"
            style={{
              background: "transparent",
              color: "#1D1D1F",
              lineHeight: 1.6,
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={onClearMemory}
            className="mt-2 text-xs px-3 py-1.5 rounded-full transition-all hover:scale-105"
            style={{
              background: "rgba(233,30,140,0.08)",
              color: "#E91E8C",
              border: "1px solid rgba(233,30,140,0.2)",
            }}
          >
            Borrar memoria
          </button>
        </div>

        {/* Conversación actual */}
        <div style={card}>
          <p className="text-xs font-semibold tracking-wide uppercase mb-2" style={{ color: "rgba(0,0,0,0.35)" }}>
            Conversación actual
          </p>
          {messages.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(0,0,0,0.3)" }}>Sin mensajes en esta sesión.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {messages.map((m, i) => (
                <div key={i} className="text-xs rounded-xl px-3 py-2"
                  style={{
                    background: m.role === "user" ? "rgba(79,124,255,0.08)" : "rgba(155,79,217,0.06)",
                    borderLeft: `2px solid ${m.role === "user" ? "#4F7CFF" : "#9B4FD9"}`,
                    color: "#1D1D1F",
                  }}>
                  <span className="font-semibold" style={{ color: m.role === "user" ? "#4F7CFF" : "#9B4FD9" }}>
                    {m.role === "user" ? "Tú" : "SOFIAA"}
                  </span>
                  <p className="mt-0.5 opacity-80 line-clamp-2">{m.content}</p>
                </div>
              ))}
            </div>
          )}
          {messages.length > 0 && (
            <button
              onClick={onClearConversation}
              className="mt-3 text-xs px-3 py-1.5 rounded-full transition-all hover:scale-105"
              style={{
                background: "rgba(79,124,255,0.08)",
                color: "#4F7CFF",
                border: "1px solid rgba(79,124,255,0.2)",
              }}
            >
              Limpiar conversación
            </button>
          )}
        </div>

        {/* Memory Timeline */}
        <div style={card}>
          <p className="text-xs font-semibold tracking-wide uppercase mb-3" style={{ color: "rgba(0,0,0,0.35)" }}>
            Historial de sesiones
          </p>
          <TimelineUI onResumeSession={(summary) => { onResumeSession(summary); onClose(); }} />
        </div>

        {/* Pipeline Observer — F-3 */}
        <div style={card}>
          <p className="text-xs font-semibold tracking-wide uppercase mb-3" style={{ color: "rgba(0,0,0,0.35)" }}>
            Pipeline Observer
          </p>
          <PipelineObserver />
        </div>

        {/* Panel Cognitivo */}
        <div style={card}>
          <p className="text-xs font-semibold tracking-wide uppercase mb-3" style={{ color: "rgba(0,0,0,0.35)" }}>
            Panel Cognitivo
          </p>
          <CognitiveDashboard />
        </div>

        {/* Footer */}
        <p className="text-center text-xs" style={{ color: "rgba(0,0,0,0.2)" }}>
          SOFIAA LAB — Panel privado
        </p>
      </div>
    </div>
  );
}
