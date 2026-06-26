"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { OrbState } from "@/components/orb/orb.states";
import { useExtension } from "@/hooks/useExtension";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "@/components/tec-bi/LoginModal";

import SofiaWave from "@/components/orb/SofiaWave";
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
import GenerativeUI from "@/components/chat/GenerativeUI";
import { parseUIBlocks } from "@/types/generative-ui";
import type { UIBlock } from "@/types/generative-ui";
import { detectUIBlock } from "@/core/ui.intent";

interface Message {
  role: "user" | "assistant";
  content: string;
  ui?: UIBlock[];
}

const GREETINGS = [
  "Hola. Estoy aquí y lista — ¿qué haremos hoy para hacer del mundo un lugar mejor?",
  "Bienvenido. ¿En qué misión embarcamos hoy?",
  "Hola. ¿Cómo puedo hacer que tu día sea extraordinario?",
  "Aquí estoy. ¿Qué construimos juntos hoy?",
  "Hola. Tu siguiente gran idea empieza aquí — ¿por dónde comenzamos?",
];

const QUICK_ACTIONS = [
  { label: "¿Qué es SOFIAA?",           icon: "◈", modal: true  },
  { label: "Necesito una producción",   icon: "◎", modal: false },
  { label: "¿Cómo puedo contactarlos?", icon: "→", modal: false },
];

// ─── Liquid Glass — material translúcido estilo iOS 26 ────────────────────────
const LG = {
  base: (opacity = 0.38) => `rgba(255,255,255,${opacity})`,
  blur: "blur(52px) saturate(220%)",
  border: "1px solid rgba(255,255,255,0.88)",
  highlight: "inset 0 1.5px 0 rgba(255,255,255,0.98), inset 0 -1px 0 rgba(200,210,255,0.12)",
};

const glass = {
  assistant: {
    background: LG.base(0.38),
    backdropFilter: LG.blur, WebkitBackdropFilter: LG.blur,
    border: LG.border,
    boxShadow: `0 4px 20px rgba(100,100,200,0.07), ${LG.highlight}`,
    color: "#1D1D1F",
  } as React.CSSProperties,
  user: {
    background: "linear-gradient(135deg, rgba(91,138,255,0.92), rgba(123,79,232,0.88))",
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.28)",
    boxShadow: "0 4px 18px rgba(79,124,255,0.28), inset 0 1.5px 0 rgba(255,255,255,0.40)",
    color: "#FFFFFF",
  } as React.CSSProperties,
  input: {
    background: LG.base(0.52), backdropFilter: LG.blur, WebkitBackdropFilter: LG.blur,
    border: LG.border, boxShadow: `0 2px 16px rgba(100,100,200,0.07), ${LG.highlight}`,
    borderRadius: "9999px", padding: "0.5rem 0.9rem", color: "#1D1D1F",
    fontSize: "0.82rem", outline: "none", width: "100%", transition: "box-shadow 0.25s",
  } as React.CSSProperties,
  chip: {
    background: LG.base(0.45), backdropFilter: LG.blur, WebkitBackdropFilter: LG.blur,
    border: LG.border, boxShadow: `0 2px 10px rgba(100,100,200,0.06), ${LG.highlight}`,
    borderRadius: "9999px", padding: "0.38rem 0.9rem", fontSize: "0.79rem",
    color: "#3D3D3F", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" as const,
  } as React.CSSProperties,
};

// ─── Dark Glass ────────────────────────────────────────────────────────────────
const darkGlass = {
  assistant: {
    background: "rgba(255,255,255,0.06)", backdropFilter: LG.blur, WebkitBackdropFilter: LG.blur,
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.35), inset 0 1.5px 0 rgba(255,255,255,0.07)",
    color: "#ECECF1",
  } as React.CSSProperties,
  user: glass.user,
  input: {
    background: "rgba(255,255,255,0.07)", backdropFilter: LG.blur, WebkitBackdropFilter: LG.blur,
    border: "1px solid rgba(255,255,255,0.11)",
    boxShadow: "0 2px 16px rgba(0,0,0,0.30), inset 0 1.5px 0 rgba(255,255,255,0.05)",
    borderRadius: "9999px", padding: "0.5rem 0.9rem", color: "#ECECF1",
    fontSize: "0.82rem", outline: "none", width: "100%", transition: "box-shadow 0.25s",
  } as React.CSSProperties,
  chip: {
    background: "rgba(255,255,255,0.07)", backdropFilter: LG.blur, WebkitBackdropFilter: LG.blur,
    border: "1px solid rgba(255,255,255,0.11)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.05)",
    borderRadius: "9999px", padding: "0.38rem 0.9rem", fontSize: "0.79rem",
    color: "rgba(255,255,255,0.72)", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" as const,
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
  const [showSofiaModal, setShowSofiaModal] = useState(false);
  const [showSeeModal,   setShowSeeModal]   = useState(false);
  const [isDark, setIsDark]             = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [showAdmin, setShowAdmin]               = useState(false);
  const [pendingNav, setPendingNav]         = useState<string | null>(null);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef    = useRef<any>(null);
  const sentViaVoiceRef   = useRef(false);
  const orbControllerRef  = useRef<OrbController | null>(null);

  // Tema: init desde localStorage + sincronizar con document
  useEffect(() => {
    const saved = localStorage.getItem("sofiaa_theme");
    if (saved === "dark") { setIsDark(true); document.documentElement.dataset.theme = "dark"; }
  }, []);
  useEffect(() => {
    localStorage.setItem("sofiaa_theme", isDark ? "dark" : "light");
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, [isDark]);

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

    // ── Tema oscuro / claro ───────────────────────────────────────────────────
    const lc = text.toLowerCase().trim();
    if (["dark mode","modo oscuro","modo dark","dark","oscuro"].includes(lc)) {
      setInput(""); setIsDark(true);
      setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "🌙 Modo oscuro activado. Escribe *light mode* para volver al claro." }]);
      return;
    }
    if (["light mode","modo claro","modo light","light","claro"].includes(lc)) {
      setInput(""); setIsDark(false);
      setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "☀️ Modo claro activado." }]);
      return;
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
          messages: updatedMessages.map(({ role, content }) => ({ role, content })),
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

      // ── Parsear UI blocks del modelo + detector de intención client-side ──
      const { clean: cleanedResponse, blocks: modelUIBlocks } = parseUIBlocks(fullResponse);

      // Si el modelo no generó bloques, intentar inferirlos del intent
      const inferredBlock = modelUIBlocks.length === 0
        ? detectUIBlock(text, fullResponse)
        : null;

      const finalUIBlocks: UIBlock[] = modelUIBlocks.length > 0
        ? modelUIBlocks
        : inferredBlock ? [inferredBlock] : [];

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: cleanedResponse.replace(/\[NAVIGATE:[^\]]+\]\n?/g, "").trim(),
            ui: finalUIBlocks.length > 0 ? finalUIBlocks : undefined,
          };
        }
        return updated;
      });
      // ─────────────────────────────────────────────────────────────────────
      // ─────────────────────────────────────────────────────────────────────

      // Detectar comando de navegación al terminar el stream
      const navMatch = fullResponse.match(/\[NAVIGATE:([^\]]+)\]/);
      if (navMatch) {
        const dest = navMatch[1].trim();
        if (dest.startsWith("/")) {
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
        setMessages((prev) => [...prev, { role: "assistant", content: `✅ Sesión iniciada. Bienvenido al sistema TEC BI.` }]);
      }}
    />

    {/* ── Modal SOFIAA — presentación holística ───────────────────── */}
    {showSofiaModal && (
      <div
        onClick={(e) => { if (e.target === e.currentTarget) setShowSofiaModal(false); }}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(10,10,30,0.60)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          animation: "fadeIn 0.25s ease",
        }}
      >
        <style>{`
          @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
          @keyframes slideUp { from { transform:translateY(32px); opacity:0 } to { transform:translateY(0); opacity:1 } }
          .sofiaa-modal::-webkit-scrollbar { width:0 }
          .ext-card { transition: transform 0.2s, box-shadow 0.2s; }
          .ext-card:hover { transform: translateY(-3px); }
        `}</style>

        <div
          className="sofiaa-modal"
          style={{
            width: "100%", maxWidth: 520,
            maxHeight: "92vh",
            overflowY: "auto",
            borderRadius: "28px 28px 0 0",
            background: "linear-gradient(160deg, rgba(245,247,255,0.97) 0%, rgba(255,250,255,0.97) 100%)",
            boxShadow: "0 -8px 60px rgba(79,124,255,0.18), 0 -2px 0 rgba(255,255,255,0.9)",
            animation: "slideUp 0.32s cubic-bezier(0.34,1.4,0.64,1)",
            paddingBottom: "max(2rem, env(safe-area-inset-bottom, 2rem))",
          }}
        >
          {/* Handle */}
          <div style={{ display:"flex", justifyContent:"center", paddingTop:12, paddingBottom:4 }}>
            <div style={{ width:40, height:4, borderRadius:99, background:"rgba(0,0,0,0.12)" }} />
          </div>

          {/* Hero */}
          <div style={{ padding:"1.5rem 1.75rem 1rem", textAlign:"center", position:"relative" }}>
            <button
              onClick={() => setShowSofiaModal(false)}
              style={{
                position:"absolute", top:16, right:16,
                width:30, height:30, borderRadius:99,
                background:"rgba(0,0,0,0.07)", border:"none",
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", fontSize:15, color:"rgba(0,0,0,0.4)",
              }}
            >×</button>

            <p style={{ fontSize:"0.65rem", letterSpacing:"0.35em", textTransform:"uppercase", color:"rgba(0,0,0,0.28)", marginBottom:6 }}>
              SOFIAA LAB · 2025 → 2026
            </p>
            <h2 style={{
              ...gradientText,
              fontSize:"clamp(2rem,10vw,3rem)", fontWeight:800,
              letterSpacing:"-0.03em", lineHeight:1, marginBottom:10,
            }}>SOFIAA</h2>
            <p style={{ fontSize:"0.82rem", fontWeight:600, color:"rgba(0,0,0,0.38)", letterSpacing:"0.06em", marginBottom:14 }}>
              INTELLIGENT EXPERIENCE OS
            </p>
            <p style={{ fontSize:"0.93rem", lineHeight:1.65, color:"#2d2d3a", maxWidth:380, margin:"0 auto" }}>
              SOFIAA no es un chatbot. Es un sistema operativo de experiencias inteligentes —
              una plataforma extensible que conecta inteligencia artificial con los procesos
              reales de organizaciones que quieren pensar diferente.
            </p>
          </div>

          {/* Divisor */}
          <div style={{ height:1, background:"linear-gradient(90deg,transparent,rgba(79,124,255,0.18),transparent)", margin:"0 1.75rem" }} />

          {/* Extensiones */}
          <div style={{ padding:"1.2rem 1.5rem 0.5rem" }}>
            <p style={{ fontSize:"0.68rem", letterSpacing:"0.28em", textTransform:"uppercase", color:"rgba(0,0,0,0.30)", marginBottom:12 }}>
              Extensiones activas
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                {
                  icon:"🏛️", label:"TEC BI",
                  color:"rgba(79,124,255,0.10)", border:"rgba(79,124,255,0.22)",
                  desc:"Inteligencia operacional para el Tecnológico de Monterrey. Briefs, proyectos, ROI y sincronización bidireccional con Monday.com.",
                  badge:"Producción"
                },
                {
                  icon:"📱", label:"Marketing Sofia",
                  color:"rgba(155,79,217,0.10)", border:"rgba(155,79,217,0.22)",
                  desc:"Workspace para equipos de redes sociales. Métricas, calendario editorial, finanzas y gestión de clientes en tiempo real.",
                  badge:"Producción"
                },
                {
                  icon:"💙", label:"JP Memorial",
                  color:"rgba(14,165,233,0.10)", border:"rgba(14,165,233,0.22)",
                  desc:"IA de memoria emocional. Una extensión para honrar vidas y preservar memorias de quienes ya no están.",
                  badge:"Operativa"
                },
                {
                  icon:"⚡", label:"Próximas ext.",
                  color:"rgba(255,107,53,0.08)", border:"rgba(255,107,53,0.18)",
                  desc:"La arquitectura SEE permite agregar extensiones nuevas sin tocar el núcleo. Cada organización puede tener la suya.",
                  badge:"SEE Ecosystem"
                },
              ].map(({ icon, label, color, border, desc, badge }) => (
                <div key={label} className="ext-card" style={{
                  background: color,
                  border: `1px solid ${border}`,
                  borderRadius: 18, padding:"1rem",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                    <span style={{ fontSize:18 }}>{icon}</span>
                    <div>
                      <p style={{ fontWeight:700, fontSize:"0.83rem", color:"#1d1d2e", lineHeight:1 }}>{label}</p>
                      <p style={{ fontSize:"0.62rem", color:"rgba(0,0,0,0.35)", letterSpacing:"0.08em", marginTop:2 }}>{badge}</p>
                    </div>
                  </div>
                  <p style={{ fontSize:"0.75rem", color:"rgba(0,0,0,0.55)", lineHeight:1.55 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cómo es posible */}
          <div style={{ padding:"1.2rem 1.5rem 0.5rem" }}>
            <p style={{ fontSize:"0.68rem", letterSpacing:"0.28em", textTransform:"uppercase", color:"rgba(0,0,0,0.30)", marginBottom:12 }}>
              ¿Cómo es posible?
            </p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {[
                { label:"Next.js 16 + React 19",  note:"velocidad nativa" },
                { label:"Firebase + Firestore",    note:"datos en tiempo real" },
                { label:"Groq + LLaMA 3",          note:"conversación IA" },
                { label:"SEE Architecture",        note:"extensiones modulares" },
                { label:"Monday.com API",           note:"sincronización bidireccional" },
                { label:"Tailwind CSS v4",          note:"diseño adaptable" },
              ].map(({ label, note }) => (
                <div key={label} style={{
                  background:"rgba(255,255,255,0.85)",
                  border:"1px solid rgba(0,0,0,0.08)",
                  borderRadius:99, padding:"0.35rem 0.85rem",
                  display:"flex", alignItems:"center", gap:6,
                }}>
                  <span style={{ fontSize:"0.78rem", fontWeight:600, color:"#2d2d3a" }}>{label}</span>
                  <span style={{ fontSize:"0.68rem", color:"rgba(0,0,0,0.32)" }}>· {note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Visión */}
          <div style={{ margin:"1.2rem 1.5rem 0.5rem", borderRadius:20, padding:"1.1rem 1.25rem",
            background:"linear-gradient(135deg, rgba(79,124,255,0.08), rgba(233,30,140,0.06))",
            border:"1px solid rgba(79,124,255,0.14)" }}>
            <p style={{ fontSize:"0.68rem", letterSpacing:"0.28em", textTransform:"uppercase", color:"rgba(0,0,0,0.28)", marginBottom:8 }}>
              Visión · Oct–Nov 2026
            </p>
            <p style={{ fontSize:"0.90rem", lineHeight:1.6, color:"#2d2d3a", fontStyle:"italic" }}>
              "La inteligencia no debería ser un privilegio — debería ser
              infraestructura. SOFIAA es el camino hacia organizaciones que
              piensan, deciden y crean mejor."
            </p>
          </div>

          {/* CTA cerrar */}
          <div style={{ padding:"1rem 1.5rem 0.5rem", textAlign:"center" }}>
            <button
              onClick={() => setShowSofiaModal(false)}
              style={{
                background:"linear-gradient(135deg,#4F7CFF,#9B4FD9)",
                border:"none", borderRadius:99, padding:"0.65rem 2rem",
                color:"#fff", fontWeight:700, fontSize:"0.84rem",
                cursor:"pointer", boxShadow:"0 4px 18px rgba(79,124,255,0.30)",
              }}
            >
              Entendido
            </button>
            <p style={{ fontSize:"0.70rem", color:"rgba(0,0,0,0.28)", marginTop:10 }}>
              Pregúntame cualquier cosa para empezar
            </p>
          </div>
        </div>
      </div>
    )}
    {/* ─────────────────────────────────────────────────────────────── */}

    {/* ── Modal SEE — SOFIAA Extension Ecosystem ───────────────────── */}
    {showSeeModal && (
      <div
        onClick={(e) => { if (e.target === e.currentTarget) setShowSeeModal(false); }}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(4,4,16,0.72)",
          backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          animation: "fadeIn 0.22s ease",
        }}
      >
        <style>{`
          @keyframes seeSlideUp {
            from { transform: translateY(40px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
          .see-modal::-webkit-scrollbar { width: 0; }
          .see-card-hover { transition: transform 0.22s, box-shadow 0.22s; }
          .see-card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.14); }
          .see-pill { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.11); border-radius: 99px; padding: 5px 14px; }
        `}</style>

        <div
          className="see-modal"
          style={{
            width: "100%", maxWidth: 560,
            maxHeight: "96vh",
            overflowY: "auto",
            borderRadius: "32px 32px 0 0",
            background: "linear-gradient(165deg, #08081A 0%, #0D0B22 50%, #100818 100%)",
            boxShadow: "0 -12px 80px rgba(79,124,255,0.22), 0 -2px 0 rgba(255,255,255,0.06)",
            animation: "seeSlideUp 0.36s cubic-bezier(0.34,1.35,0.64,1)",
            paddingBottom: "max(2.5rem, env(safe-area-inset-bottom, 2.5rem))",
            border: "1px solid rgba(255,255,255,0.07)",
            borderBottom: "none",
          }}
        >
          {/* Handle */}
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 14, paddingBottom: 6 }}>
            <div style={{ width: 44, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.14)" }} />
          </div>

          {/* Close */}
          <button onClick={() => setShowSeeModal(false)} style={{
            position: "absolute", top: 18, right: 20,
            width: 32, height: 32, borderRadius: 99,
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.45)", fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>

          {/* ── Hero ── */}
          <div style={{ padding: "1.5rem 2rem 1.2rem", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 14,
              background: "rgba(79,124,255,0.10)", border: "1px solid rgba(79,124,255,0.22)",
              borderRadius: 99, padding: "5px 14px" }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#4F7CFF", letterSpacing: "0.5px" }}>SEE</span>
              <span style={{ width: 1, height: 10, background: "rgba(79,124,255,0.35)" }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.3px" }}>SOFIAA EXTENSION ECOSYSTEM</span>
            </div>

            <h2 style={{
              fontSize: "clamp(1.9rem, 8vw, 2.8rem)", fontWeight: 900,
              letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 12,
              background: "linear-gradient(135deg, #fff 0%, #A78BFA 45%, #4F7CFF 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              Las posibilidades<br />son infinitas.
            </h2>
            <p style={{ fontSize: "0.93rem", color: "rgba(255,255,255,0.52)", lineHeight: 1.7,
              maxWidth: 400, margin: "0 auto" }}>
              No importa tu industria, tu tamaño ni tu reto —
              <strong style={{ color: "rgba(255,255,255,0.82)" }}> SOFIAA construye una extensión a tu medida</strong>,
              integrada a tu operación en semanas.
            </p>
          </div>

          {/* ── Divisor degradado ── */}
          <div style={{ height: 1, margin: "0 2rem",
            background: "linear-gradient(90deg, transparent, rgba(79,124,255,0.30), rgba(233,30,140,0.20), transparent)" }} />

          {/* ── Propuesta de valor ── */}
          <div style={{ padding: "1.4rem 2rem 0.6rem" }}>
            <p style={{ fontSize: "0.66rem", letterSpacing: "0.32em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)", marginBottom: 14 }}>¿Qué resolvemos?</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { icon: "⚡", title: "Eficiencia operativa", desc: "Automatizamos flujos repetitivos para que tu equipo se enfoque en lo que importa." },
                { icon: "📊", title: "Rentabilidad medible", desc: "KPIs en tiempo real. Decisiones basadas en datos, no en suposiciones." },
                { icon: "🤝", title: "Atención al cliente", desc: "Tu cliente recibe respuestas instantáneas, precisas y personalizadas 24/7." },
                { icon: "🗂️", title: "Procesos e inventarios", desc: "Gestión centralizada de productos, pedidos, proveedores y clientes." },
                { icon: "🧠", title: "Información simplificada", desc: "Datos complejos convertidos en dashboards accionables para cualquier rol." },
                { icon: "🔗", title: "Integración sin fricción", desc: "Se conecta con tus sistemas existentes: ERP, CRM, Excel, WhatsApp y más." },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="see-card-hover" style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16, padding: "14px 16px",
                }}>
                  <div style={{ fontSize: 20, marginBottom: 7 }}>{icon}</div>
                  <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "rgba(255,255,255,0.88)", marginBottom: 4 }}>{title}</p>
                  <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.42)", lineHeight: 1.55 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Industrias ── */}
          <div style={{ padding: "1.2rem 2rem 0.6rem" }}>
            <p style={{ fontSize: "0.66rem", letterSpacing: "0.32em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)", marginBottom: 14 }}>Industrias que atendemos</p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                ["🏥","Salud & Clínicas"], ["🏗️","Construcción"],  ["🎓","Educación"],
                ["🛒","Retail & E-comm"], ["🍽️","Restaurantes"],   ["🏭","Manufactura"],
                ["⚖️","Despachos legales"],["🏨","Hospitalidad"],   ["💼","Consultoría"],
                ["🎬","Producción AV"],   ["📦","Logística"],       ["🏢","Corporativo"],
              ].map(([icon, label]) => (
                <div key={label as string} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 99, padding: "5px 12px",
                }}>
                  <span style={{ fontSize: 13 }}>{icon}</span>
                  <span style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.62)", fontWeight: 500 }}>{label as string}</span>
                </div>
              ))}
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "linear-gradient(135deg, rgba(79,124,255,0.15), rgba(233,30,140,0.10))",
                border: "1px solid rgba(79,124,255,0.25)", borderRadius: 99, padding: "5px 12px",
              }}>
                <span style={{ fontSize: "0.74rem", color: "#A78BFA", fontWeight: 700 }}>+ la tuya</span>
              </div>
            </div>
          </div>

          {/* ── Quote ── */}
          <div style={{ margin: "1rem 2rem", borderRadius: 20, padding: "1.2rem 1.5rem",
            background: "linear-gradient(135deg, rgba(79,124,255,0.09), rgba(138,32,255,0.07), rgba(233,30,140,0.06))",
            border: "1px solid rgba(79,124,255,0.18)" }}>
            <p style={{ fontSize: "0.88rem", lineHeight: 1.65, color: "rgba(255,255,255,0.75)", fontStyle: "italic", margin: 0 }}>
              "No construimos software genérico. Construimos <strong style={{ color: "rgba(255,255,255,0.95)", fontStyle: "normal" }}>la herramienta exacta
              que tu organización necesita</strong> — integrada con IA, lista en semanas,
              y diseñada para escalar contigo."
            </p>
            <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.30)", marginTop: 10, letterSpacing: "0.06em" }}>
              — SOFIAA Lab · Equipo de Desarrollo
            </p>
          </div>

          {/* ── Proceso ── */}
          <div style={{ padding: "0.6rem 2rem 0.8rem" }}>
            <p style={{ fontSize: "0.66rem", letterSpacing: "0.32em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)", marginBottom: 14 }}>Cómo funciona</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { n: "01", step: "Diagnóstico", desc: "Entendemos tu operación, retos y objetivos en una sesión de 60 min." },
                { n: "02", step: "Diseño a medida", desc: "Mapeamos los módulos, flujos e integraciones específicos para ti." },
                { n: "03", step: "Desarrollo ágil", desc: "Primera versión funcional en 2–4 semanas. Iteramos contigo." },
                { n: "04", step: "Despliegue & soporte", desc: "Live en producción. Soporte continuo y mejoras progresivas." },
              ].map(({ n, step, desc }, i, arr) => (
                <div key={n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, rgba(79,124,255,0.25), rgba(138,32,255,0.20))",
                      border: "1px solid rgba(79,124,255,0.30)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#4F7CFF" }}>{n}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div style={{ width: 1, height: 28, background: "rgba(79,124,255,0.15)", margin: "4px 0" }} />
                    )}
                  </div>
                  <div style={{ paddingTop: 8, paddingBottom: i < arr.length - 1 ? 0 : 0 }}>
                    <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 2 }}>{step}</p>
                    <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.40)", lineHeight: 1.55, marginBottom: 12 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── CTA ── */}
          <div style={{ padding: "0.8rem 2rem 0.5rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
              ¿Listo para transformar tu área de oportunidad en una ventaja competitiva?
            </p>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => {
                  setShowSeeModal(false);
                  sendMessage("Quiero saber más sobre las extensiones de SOFIAA para mi empresa");
                }}
                style={{
                  background: "linear-gradient(135deg, #4F7CFF 0%, #8A20FF 60%, #E91E8C 100%)",
                  border: "none", borderRadius: 99, padding: "0.75rem 2.4rem",
                  color: "#fff", fontWeight: 800, fontSize: "0.88rem",
                  cursor: "pointer", letterSpacing: "0.02em",
                  boxShadow: "0 6px 32px rgba(79,124,255,0.40), 0 2px 0 rgba(255,255,255,0.12) inset",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
              >
                Quiero mi extensión →
              </button>
              <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.22)", letterSpacing: "0.04em" }}>
                Conversación sin compromiso · Tiempo de respuesta &lt; 24 hrs
              </p>
            </div>
          </div>
        </div>
      </div>
    )}
    {/* ───────────────────────────────────────────────── */}

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
      style={{ background: isDark
        ? "linear-gradient(145deg, #0D0D1A 0%, #0F0F18 55%, #130D1A 100%)"
        : "linear-gradient(145deg, #EEF1FF 0%, #FAFAFA 55%, #FFF3FC 100%)" }}
    >
      {/* Header */}
      <div className="shrink-0 relative flex flex-col items-center gap-0.5 pt-5 pb-1 w-full px-5">
        <p className="text-xs tracking-[0.32em] uppercase font-light" style={{ color: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.28)" }}>
          SOFIAA LAB
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1
            style={{
              ...gradientText,
              fontSize: "clamp(1.75rem, 7.5vw, 3rem)",
              fontWeight: 700,
              letterSpacing: "0.18em",
              backgroundSize: "300% 300%",
              animation: "gradientFlow 9s ease infinite",
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
        <p className="text-xs font-light" style={{ color: isDark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.32)" }}>
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

      {/* SofiaWave — reemplaza al Orb */}
      <div className="shrink-0 w-full px-5 py-1" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ width: "100%", height: 88, position: "relative" }}>
          <SofiaWave state={orbState} />
        </div>
        <p className="text-xs tracking-wide font-light h-4 text-center transition-all duration-300 mt-0.5"
          style={{ color: disclosure.showStateLabel ? disclosure.stateLabelColor : isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.30)" }}>
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
          {QUICK_ACTIONS.map(({ label, icon, modal }) => (
            <button
              key={label}
              onClick={() => {
                telemetry.trackQuickAction(label);
                if (modal) { setShowSofiaModal(true); }
                else { sendMessage(label); }
              }}
              style={{ ...(isDark ? darkGlass.chip : glass.chip), fontSize: "0.78rem", padding: "0.4rem 0.85rem" }}
              className="active:scale-95"
            >
              <span className="mr-1 opacity-50">{icon}</span>
              {label}
            </button>
          ))}

          {/* Botón SEE — destacado */}
          <button
            onClick={() => { telemetry.trackQuickAction("SEE"); setShowSeeModal(true); }}
            className="active:scale-95"
            style={{
              fontSize: "0.78rem", padding: "0.4rem 1rem",
              borderRadius: 9999, cursor: "pointer", border: "none",
              background: "linear-gradient(135deg, #4F7CFF 0%, #8A20FF 60%, #E91E8C 100%)",
              color: "#fff", fontWeight: 700, letterSpacing: "0.02em",
              boxShadow: "0 3px 18px rgba(79,124,255,0.35), 0 1px 0 rgba(255,255,255,0.20) inset",
              display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" as const,
            }}
          >
            <span style={{ fontSize: 11 }}>⚡</span>
            Necesitas una Extensión? SEE
          </button>
        </div>
      )}

      {/* Mensajes */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto space-y-3 py-2" style={{ paddingLeft: "10px", paddingRight: "10px" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`sofiaa-bubble rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user" ? "rounded-br-md" : "rounded-bl-md"
              }`}
              style={msg.role === "user" ? glass.user : (isDark ? darkGlass.assistant : glass.assistant)}
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
            {/* Generative UI — renderiza debajo de la burbuja de SOFIAA */}
            {msg.role === "assistant" && msg.ui && msg.ui.length > 0 && (
              <div style={{ maxWidth: "85%", width: "100%" }}>
                <GenerativeUI
                  blocks={msg.ui}
                  onSend={(text) => sendMessage(text)}
                  isDark={isDark}
                />
              </div>
            )}
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
            style={isDark ? darkGlass.input : glass.input}
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
