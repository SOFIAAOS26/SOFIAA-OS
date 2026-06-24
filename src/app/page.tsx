"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { OrbState } from "@/components/orb/orb.states";
import { useExtension } from "@/hooks/useExtension";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "@/components/tec-bi/LoginModal";

import Orb from "@/components/orb/Orb";
import AdminPanel from "@/components/admin/AdminPanel";
import { analyzeMessage } from "@/core/guardrails.engine";
import { getSafetyResponse } from "@/config/safety.response.map";
import { useSofiaaTelemetry } from "@/hooks/useSofiaaTelemetry";
import { getCachedResponse, setCachedResponse } from "@/core/response-cache";
import { detectGoal } from "@/core/goal.engine";
import { addTimelineEntry, buildContextualMemoryBlock } from "@/core/memory.timeline";
import { generateSessionTitle, extractTags, detectTopGoal } from "@/core/memory.summary";
import { OrbController } from "@/components/orb/orb.controller";
import { getDisclosure } from "@/core/experience.disclosure";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const GREETINGS = [
  "Hola. Estoy aquí y lista — ¿qué haremos hoy para hacer del mundo un lugar mejor?",
  "Bienvenido. ¿En qué misión embarcamos hoy?",
  "Hola. ¿Cómo puedo hacer que tu día sea extraordinario?",
  "Aquí estoy. ¿Qué construimos juntos hoy?",
  "Hola. Tu siguiente gran idea empieza aquí — ¿por dónde comenzamos?",
];

const QUICK_ACTIONS = [
  { label: "¿Quién es Abrahan?",        icon: "✦" },
  { label: "¿Qué es SOFIAA LAB?",       icon: "◈" },
  { label: "Necesito una producción",   icon: "◎" },
  { label: "¿Cómo puedo contactarlos?", icon: "→" },
];

// ─── Liquid Glass — material translúcido estilo iOS 26 ────────────────────────
const LG = {
  // Fondo ultra-translúcido + blur agresivo + highlight especular en el borde superior
  base: (opacity = 0.38) =>
    `rgba(255,255,255,${opacity})`,
  blur: "blur(52px) saturate(220%)",
  border: "1px solid rgba(255,255,255,0.88)",
  // La línea brillante en el borde superior es la firma del liquid glass
  highlight: "inset 0 1.5px 0 rgba(255,255,255,0.98), inset 0 -1px 0 rgba(200,210,255,0.12)",
};

const glass = {
  assistant: {
    background: LG.base(0.38),
    backdropFilter: LG.blur,
    WebkitBackdropFilter: LG.blur,
    border: LG.border,
    boxShadow: `0 4px 20px rgba(100,100,200,0.07), ${LG.highlight}`,
    color: "#1D1D1F",
  } as React.CSSProperties,
  user: {
    background: "linear-gradient(135deg, rgba(91,138,255,0.92), rgba(123,79,232,0.88))",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.28)",
    boxShadow: "0 4px 18px rgba(79,124,255,0.28), inset 0 1.5px 0 rgba(255,255,255,0.40)",
    color: "#FFFFFF",
  } as React.CSSProperties,
  input: {
    background: LG.base(0.52),
    backdropFilter: LG.blur,
    WebkitBackdropFilter: LG.blur,
    border: LG.border,
    boxShadow: `0 2px 16px rgba(100,100,200,0.07), ${LG.highlight}`,
    borderRadius: "9999px",
    // Más compacto: padding reducido
    padding: "0.5rem 0.9rem",
    color: "#1D1D1F",
    fontSize: "0.82rem",
    outline: "none",
    width: "100%",
    transition: "box-shadow 0.25s",
  } as React.CSSProperties,
  chip: {
    background: LG.base(0.45),
    backdropFilter: LG.blur,
    WebkitBackdropFilter: LG.blur,
    border: LG.border,
    boxShadow: `0 2px 10px rgba(100,100,200,0.06), ${LG.highlight}`,
    borderRadius: "9999px",
    padding: "0.38rem 0.9rem",
    fontSize: "0.79rem",
    color: "#3D3D3F",
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,
};

const gradientText: React.CSSProperties = {
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  background: "linear-gradient(135deg, #4F7CFF 0%, #9B4FD9 38%, #E91E8C 68%, #FF6B35 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

export default function Home() {
  const router = useRouter();
  const activeExtension = useExtension();
  const telemetry = useSofiaaTelemetry();
  const [orbState, setOrbState]       = useState<OrbState>("idle");
  const [tecBiSummary, setTecBiSummary]   = useState<string | null>(null);
  const [showLogin, setShowLogin]         = useState(false);
  const { profile, signOut }              = useAuth();

  const LOGIN_TRIGGERS = ["login", "iniciar sesión", "iniciar sesion", "quiero hacer login",
    "ingresar", "acceder", "autenticar", "identificarme", "quiero loguearme"];
  const [messages, setMessages]       = useState<Message[]>([]);
  const [welcomeText, setWelcomeText] = useState("");
  const [isWelcoming, setIsWelcoming] = useState(true);
  const [input, setInput]             = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [resetKey, setResetKey]         = useState(0);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [showAdmin, setShowAdmin]               = useState(false);
  const [pendingNav, setPendingNav]         = useState<string | null>(null);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef    = useRef<any>(null);
  const sentViaVoiceRef   = useRef(false);
  const orbControllerRef  = useRef<OrbController | null>(null);

  // Capa de inteligencia TEC BI: solo cuando la extensión está activa en /tec-bi/*
  useEffect(() => {
    if (activeExtension?.id !== "tec-bi") {
      setTecBiSummary(null);
      return;
    }
    fetch("/api/tec-bi/summary")
      .then((r) => r.json())
      .then(({ summary }) => { if (summary) setTecBiSummary(summary); })
      .catch(() => { /* no crítico */ });
  }, [activeExtension?.id]);

  // Inicializar OrbController una vez
  if (!orbControllerRef.current) {
    orbControllerRef.current = new OrbController(setOrbState);
  }
  const orb = orbControllerRef.current;

  // Disclosure: qué elementos mostrar según el estado del orbe
  const disclosure = getDisclosure(orbState);

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    // Limpiar markdown y comandos de navegación
    const clean = text
      .replace(/\[NAVIGATE:[^\]]+\]/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .trim();
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang   = "es-MX";
    utterance.rate   = 1.08;
    utterance.pitch  = 1.25;
    utterance.volume = 1;

    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const spanish = voices.filter((v) => v.lang.startsWith("es"));
      // Voces femeninas conocidas por nombre
      const femaleNames = /paulina|mónica|monica|luciana|elena|isabel|laura|maria|sabina|helena/i;
      const maleNames   = /jorge|diego|pablo|miguel|juan|carlos|alejandro/i;
      const femaleVoice =
        spanish.find((v) => femaleNames.test(v.name)) ||
        spanish.find((v) => !maleNames.test(v.name)) ||
        spanish[0];
      if (femaleVoice) utterance.voice = femaleVoice;
      window.speechSynthesis.speak(utterance);
    };

    // Las voces pueden no estar listas inmediatamente
    if (window.speechSynthesis.getVoices().length > 0) {
      setVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = () => { setVoice(); };
    }
  };

  const toggleVoice = () => {
    if (isListeningVoice) {
      recognitionRef.current?.stop();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Tu navegador no soporta voz. Usa Chrome o Edge.");
      return;
    }
    const recognition = new SR();
    recognition.lang = "es-MX";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      window.speechSynthesis?.cancel(); // detener si SOFIAA estaba hablando
      setIsListeningVoice(true);
      setOrbState("listening");
    };

    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
      if (e.results[e.results.length - 1].isFinal) {
        recognition.stop();
        sentViaVoiceRef.current = true;
        sendMessage(transcript);
      }
    };

    recognition.onend = () => {
      setIsListeningVoice(false);
      setOrbState("idle");
    };

    recognition.onerror = () => {
      setIsListeningVoice(false);
      setOrbState("idle");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Bienvenida o restauración de memoria
  useEffect(() => {
    const hasLongMemory = !!localStorage.getItem("sofiaa_long_memory");
    telemetry.trackSessionStart(hasLongMemory);

    // En carga inicial (resetKey === 0), intentar restaurar conversación guardada
    if (resetKey === 0) {
      try {
        const saved = localStorage.getItem("sofiaa_memory");
        if (saved) {
          const parsed: Message[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            setIsWelcoming(false);
            setWelcomeText("De vuelta. Aquí donde quedamos.");
            setOrbState("idle");
            setTimeout(() => setWelcomeText(""), 2500);
            return;
          }
        }
      } catch {}
    }

    // Sin memoria guardada o después de un reset: bienvenida animada
    const text = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    setOrbState("responding");
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      setWelcomeText(text.slice(0, idx));
      if (idx >= text.length) {
        clearInterval(timer);
        setOrbState("idle");
        setIsWelcoming(false);
      }
    }, 28);
    return () => clearInterval(timer);
  }, [resetKey]);

  // Guardar conversación en localStorage tras cada mensaje
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("sofiaa_memory", JSON.stringify(messages));
    }
  }, [messages]);

  const resetChat = async () => {
    // Extraer memoria de la conversación antes de borrarla
    if (messages.length >= 2) {
      try {
        const res = await fetch("/api/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages }),
        });
        const { memory } = await res.json();
        if (memory) {
          const existing = localStorage.getItem("sofiaa_long_memory") ?? "";
          const updated = existing ? `${existing}\n${memory}` : memory;
          localStorage.setItem("sofiaa_long_memory", updated);

          // ── Memory Timeline: guardar entrada de sesión ─────────────────
          addTimelineEntry({
            sessionId: `sess_${Date.now()}`,
            timestamp: Date.now(),
            title: generateSessionTitle(messages),
            summary: memory,
            messageCount: messages.filter((m) => m.role === "user").length,
            topGoal: detectTopGoal(messages),
            tags: extractTags(messages),
          });
          // ────────────────────────────────────────────────────────────────
        }
      } catch {}
    }
    localStorage.removeItem("sofiaa_memory");
    telemetry.trackSessionReset();
    setMessages([]);
    setWelcomeText("");
    setIsWelcoming(true);
    setInput("");
    setOrbState("idle");
    setResetKey((k) => k + 1);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const AFFIRMATIVE = ["si", "sí", "ok", "vamos", "dale", "claro", "perfecto", "adelante", "yes",
    "confirmo", "llévame", "llevame", "por favor", "sí por favor", "si por favor", "venga", "ándale", "andale"];

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    // ── Navegación pendiente: esperar confirmación del usuario ───────────────
    if (pendingNav) {
      const normalized = text.toLowerCase().trim();
      const confirmed = AFFIRMATIVE.some((w) => normalized === w || normalized.startsWith(w + " ") || normalized.endsWith(" " + w));
      setPendingNav(null);
      setInput("");
      if (confirmed) {
        router.push(pendingNav);
        return;
      }
      // Si no confirmó, procesar el mensaje normalmente (sin navegar)
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Frases de login — mostrar modal de autenticación
    if (LOGIN_TRIGGERS.some((t) => text.toLowerCase().includes(t))) {
      setInput("");
      if (profile) {
        setMessages([...messages, { role: "user", content: text }, { role: "assistant", content: `Ya estás autenticado como **${profile.nombre}** (${profile.rol}). Si deseas cerrar sesión escribe "cerrar sesión".` }]);
      } else {
        setShowLogin(true);
      }
      return;
    }

    // Cerrar sesión
    if (text.toLowerCase().includes("cerrar sesión") || text.toLowerCase().includes("cerrar sesion") || text.toLowerCase().includes("logout")) {
      setInput("");
      await signOut();
      setMessages([...messages, { role: "user", content: text }, { role: "assistant", content: "Sesión cerrada. ¡Hasta pronto!" }]);
      return;
    }

    // Frase secreta — abre panel de admin sin pasar al modelo
    if (text.toLowerCase() === "espada del augurio") {
      setInput("");
      setShowAdmin(true);
      return;
    }

    // Frase secreta — abre panel de métricas
    if (text.toLowerCase() === "modo sherlock") {
      setInput("");
      router.push("/metricas");
      return;
    }

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];

    // ── Guardrails: validación en cliente (respuesta instantánea, sin latencia) ──
    const clientGuard = analyzeMessage(text);
    if (clientGuard.blocked) {
      const safeReply = getSafetyResponse(clientGuard.threat as Exclude<typeof clientGuard.threat, "none">);
      telemetry.trackGuardrail(clientGuard.threat);
      setMessages([...updatedMessages, { role: "assistant", content: safeReply }]);
      setWelcomeText("");
      setInput("");
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    telemetry.trackMessageSent(text);
    if (sentViaVoiceRef.current) telemetry.trackVoice();

    // ── Goal Engine: detectar objetivo antes de enviar ────────────────────
    const detectedGoal = detectGoal(text);
    // ─────────────────────────────────────────────────────────────────────

    // ── Response Cache: check antes de llamar al modelo ───────────────────
    const cachedReply = getCachedResponse(text);
    if (cachedReply) {
      orb.flashCacheHit();
      setMessages([...updatedMessages, { role: "assistant", content: cachedReply }]);
      setWelcomeText("");
      setInput("");
      telemetry.trackMessageReceived();
      if (sentViaVoiceRef.current) {
        sentViaVoiceRef.current = false;
        try { speakText(cachedReply); } catch { /* no crítico */ }
      }
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

    setMessages([...updatedMessages, { role: "assistant", content: "" }]);
    setWelcomeText(""); // saludo desaparece al primer mensaje
    setInput("");
    setIsLoading(true);
    orb.transition("thinking");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          longTermMemory: localStorage.getItem("sofiaa_long_memory") ?? undefined,
          contextualMemory: buildContextualMemoryBlock(5),
          detectedGoal,
          extensionContext: [
            activeExtension?.contextBlock,
            tecBiSummary,
          ].filter(Boolean).join("\n\n") || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "sin detalle");
        console.error("Groq error", res.status, errText);
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      orb.startResponse();

      const reader      = res.body.getReader();
      const decoder     = new TextDecoder();
      let   fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
          }
          return updated;
        });
      }

      telemetry.trackMessageReceived();

      // ── Response Cache: guardar respuesta para futuras consultas ─────────
      setCachedResponse(text, fullResponse);
      // ─────────────────────────────────────────────────────────────────────

      // Hablar la respuesta si el usuario usó el micrófono
      if (sentViaVoiceRef.current) {
        sentViaVoiceRef.current = false;
        try { speakText(fullResponse); } catch { /* audio no crítico */ }
      }

      // Detectar comando de navegación al terminar el stream
      const navMatch = fullResponse.match(/\[NAVIGATE:([^\]]+)\]/);
      if (navMatch) {
        const dest = navMatch[1].trim();
        // Limpiar el token del mensaje
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: last.content.replace(/\[NAVIGATE:[^\]]+\]\n?/g, "").trim(),
            };
          }
          return updated;
        });
        if (dest.startsWith("/")) {
          // Guardar destino — esperamos confirmación del usuario antes de navegar
          setPendingNav(dest);
        } else {
          window.open(dest, "_blank", "noopener,noreferrer");
        }
      }
    } catch (err) {
      console.error("SOFIAA error:", err);
      sentViaVoiceRef.current = false;
      orb.showError();
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Hubo un error al procesar tu solicitud.",
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
      orb.finishResponse(1800);
      // Mantener el foco en el input después de cada mensaje
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const showWelcome      = welcomeText.length > 0;
  const showQuickActions = !isWelcoming && !isLoading && messages.length === 0 && disclosure.quickActionsVisible;

  return (
    <div className="sofiaa-root">
    <LoginModal
      isOpen={showLogin}
      onClose={() => setShowLogin(false)}
      onSuccess={(email) => {
        setShowLogin(false);
        // El nombre real llega del AuthContext via onAuthStateChanged — usamos email como fallback
        setMessages((prev) => [...prev, { role: "assistant", content: `✅ Sesión iniciada. Bienvenido al sistema TEC BI.` }]);
      }}
    />
    {showAdmin && (
      <AdminPanel
        messages={messages}
        onClose={() => setShowAdmin(false)}
        onClearMemory={() => {
          localStorage.removeItem("sofiaa_long_memory");
          setShowAdmin(false);
        }}
        onClearConversation={() => {
          resetChat();
          setShowAdmin(false);
        }}
        onUpdateLongMemory={(text) => {
          localStorage.setItem("sofiaa_long_memory", text);
        }}
        onResumeSession={(summary) => {
          // Cargar resumen como contexto inicial de la nueva sesión
          const existing = localStorage.getItem("sofiaa_long_memory") ?? "";
          const withResume = existing
            ? `${existing}\n[Contexto reanudado]: ${summary}`
            : `[Contexto reanudado]: ${summary}`;
          localStorage.setItem("sofiaa_long_memory", withResume);
        }}
      />
    )}
    <main
      className="sofiaa-panel flex-1 flex flex-col"
      style={{ background: "linear-gradient(145deg, #EEF1FF 0%, #FAFAFA 55%, #FFF3FC 100%)" }}
    >
      {/* Header */}
      <div className="shrink-0 relative flex flex-col items-center gap-0.5 pt-5 pb-1 w-full px-5">
        <p className="text-xs tracking-[0.32em] uppercase font-light" style={{ color: "rgba(0,0,0,0.28)" }}>
          SOFIAA LAB
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1
            style={{
              ...gradientText,
              fontSize: "clamp(1.4rem, 6vw, 2.4rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            SOFIAA
          </h1>
          {activeExtension && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  background: activeExtension.theme.badgeColor,
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 99,
                  letterSpacing: "0.5px",
                  lineHeight: 1.4,
                }}
              >
                {activeExtension.theme.badgeLabel}
              </span>
              <button
                onClick={() => router.push("/")}
                title="Salir de extensión"
                style={{
                  background: "rgba(0,0,0,0.07)",
                  border: "none",
                  borderRadius: 99,
                  width: 16,
                  height: 16,
                  fontSize: 9,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#666",
                }}
              >
                ×
              </button>
            </div>
          )}
        </div>
        <p className="text-xs font-light" style={{ color: "rgba(0,0,0,0.32)" }}>
          {activeExtension ? activeExtension.description : "Intelligent Experience OS"}
        </p>

        {/* User chip */}
        {profile && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <div style={{
              background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.25)",
              borderRadius: 99, padding: "3px 10px", display: "flex", alignItems: "center", gap: 5,
            }}>
              <span style={{ fontSize: 10 }}>👤</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#0EA5E9" }}>{profile.nombre}</span>
              <span style={{ fontSize: 9, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.3px" }}>· {profile.rol}</span>
            </div>
          </div>
        )}

        {/* Botón limpiar */}
        {messages.length > 0 && !isLoading && (
          <button
            onClick={resetChat}
            title="Nueva conversación"
            className="absolute right-4 top-5 flex items-center gap-1 px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95"
            style={{
              background: "rgba(255,255,255,0.65)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.9)",
              boxShadow: "0 2px 14px rgba(100,100,200,0.12)",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              style={{ width: "12px", height: "12px", stroke: "url(#btnGrad)", flexShrink: 0 }}>
              <defs>
                <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4F7CFF" />
                  <stop offset="100%" stopColor="#E91E8C" />
                </linearGradient>
              </defs>
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span style={{ ...gradientText, fontSize: "0.72rem", fontWeight: 600 }}>
              Nuevo
            </span>
          </button>
        )}
      </div>

      {/* Orb — shrink-0 */}
      <div className="shrink-0 flex flex-col items-center gap-1 py-1">
        <Orb state={orbState} />
        <p className="text-xs tracking-wide font-light h-4 transition-all duration-300"
          style={{ color: disclosure.showStateLabel ? disclosure.stateLabelColor : "rgba(0,0,0,0.30)" }}>
          {disclosure.showStateLabel ? disclosure.stateLabel : (
            orbState === "listening" ? "Te escucho..." :
            orbState === "thinking"  ? "Procesando..." : ""
          )}
        </p>
      </div>

      {/* Saludo animado — shrink-0 */}
      {showWelcome && (
        <div className="shrink-0 w-full px-5 pt-2 pb-1 text-center">
          <p
            style={{
              ...gradientText,
              fontSize: "clamp(0.95rem, 4.5vw, 1.2rem)",
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {welcomeText}
            {isWelcoming && (
              <span
                style={{
                  display: "inline-block",
                  width: "2px",
                  height: "1em",
                  background: "#9B4FD9",
                  marginLeft: "2px",
                  verticalAlign: "middle",
                  animation: "cursorBlink 1s step-end infinite",
                }}
              />
            )}
          </p>
        </div>
      )}

      {/* Acciones rápidas — shrink-0 */}
      {showQuickActions && (
        <div className="shrink-0 flex flex-wrap justify-center gap-2 px-5 py-2 w-full">
          {QUICK_ACTIONS.map(({ label, icon }) => (
            <button
              key={label}
              onClick={() => { telemetry.trackQuickAction(label); sendMessage(label); }}
              style={{ ...glass.chip, fontSize: "0.78rem", padding: "0.4rem 0.85rem" }}
              className="active:scale-95"
            >
              <span className="mr-1 opacity-50">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Mensajes */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto space-y-3 py-2" style={{ paddingLeft: "10px", paddingRight: "10px" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`sofiaa-bubble rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user" ? "rounded-br-md" : "rounded-bl-md"
              }`}
              style={msg.role === "user" ? glass.user : glass.assistant}
            >
              {msg.role === "user" ? (
                msg.content
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p:      ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em:     ({ children }) => <em className="italic opacity-70">{children}</em>,
                    ul:     ({ children }) => <ul className="list-disc list-inside space-y-1 mt-1">{children}</ul>,
                    ol:     ({ children }) => <ol className="list-decimal list-inside space-y-1 mt-1">{children}</ol>,
                    li:     ({ children }) => <li className="opacity-80">{children}</li>,
                    code:   ({ children }) => (
                      <code className="rounded px-1 py-0.5 text-xs font-mono" style={{ background: "rgba(0,0,0,0.06)", color: "#4F7CFF" }}>{children}</code>
                    ),
                    pre:    ({ children }) => (
                      <pre className="rounded-lg p-3 mt-2 text-xs font-mono overflow-x-auto" style={{ background: "rgba(0,0,0,0.05)" }}>{children}</pre>
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
              {msg.role === "assistant" && isLoading && i === messages.length - 1 && (
                <span
                  className="inline-block w-0.5 h-3.5 ml-0.5 align-middle"
                  style={{ background: "rgba(0,0,0,0.35)", animation: "cursorBlink 1s step-end infinite" }}
                />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Chip de confirmación de navegación */}
      {pendingNav && (
        <div className="shrink-0 w-full px-4 pb-1 flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl text-xs"
            style={{
              background: "rgba(79,124,255,0.10)",
              border: "1px solid rgba(79,124,255,0.30)",
              color: "#4F7CFF",
              fontWeight: 500,
            }}
          >
            <span>→</span>
            <span>Escribe <strong>sí</strong> para ir, o cualquier cosa para cancelar</span>
          </div>
          <button
            onClick={() => setPendingNav(null)}
            style={{ color: "rgba(0,0,0,0.3)", fontSize: "1.2rem", lineHeight: 1, background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}
            aria-label="Cancelar"
          >×</button>
        </div>
      )}

      {/* Input */}
      <div
        className="shrink-0 w-full px-4 pt-2"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 1.25rem))" }}
      >
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            enterKeyHint="send"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => { if (!isWelcoming) orb.transition("listening"); }}
            onBlur={() => { if (!input && orbState === "listening") orb.transition("idle"); }}
            onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
            placeholder={isListeningVoice ? "Escuchando..." : "Escribe o habla..."}
            disabled={isLoading || isWelcoming || isListeningVoice || (orbState !== "listening" && !disclosure.inputEnabled)}
            style={glass.input}
            className="disabled:opacity-60 pl-11 pr-11"
          />

          {/* Botón micrófono — compacto */}
          <button
            onClick={toggleVoice}
            disabled={isLoading || isWelcoming}
            className="absolute left-1.5 flex items-center justify-center w-8 h-8 rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: isListeningVoice
                ? "linear-gradient(135deg, #E91E8C, #FF6B35)"
                : LG.base(0.75),
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: isListeningVoice
                ? "0 0 16px rgba(233,30,140,0.45)"
                : `0 1px 6px rgba(100,100,200,0.10), inset 0 1px 0 rgba(255,255,255,0.95)`,
              border: isListeningVoice ? "none" : "1px solid rgba(255,255,255,0.9)",
              animation: isListeningVoice ? "waveExpand 1.5s ease-out infinite" : "none",
            }}
            aria-label="Hablar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
              fill="none"
              stroke={isListeningVoice ? "white" : "#9B4FD9"}
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              style={{ width: "13px", height: "13px" }}>
              <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </button>

          {/* Botón enviar — compacto */}
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || isWelcoming || !input.trim()}
            className="absolute right-1.5 flex items-center justify-center w-8 h-8 rounded-full disabled:opacity-35 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #4F7CFF, #9B4FD9)",
              boxShadow: "0 2px 12px rgba(79,124,255,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
            aria-label="Enviar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
              fill="none" stroke="white" strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round"
              style={{ width: "13px", height: "13px" }}>
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </main>
    </div>
  );
}
