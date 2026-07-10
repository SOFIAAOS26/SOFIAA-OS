"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { OrbState } from "@/components/orb/orb.states";
import { useExtension } from "@/hooks/useExtension";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "@/components/tec-bi/LoginModal";

import SofiaWave from "@/components/orb/SofiaWave";
import AdminPanel from "@/components/admin/AdminPanel";
import NoraPanel  from "@/components/admin/NoraPanel";
import SofiaLogo  from "@/components/ui/SofiaLogo";
import { analyzeMessage } from "@/core/guardrails.engine";
import { getSafetyResponse } from "@/config/safety.response.map";
import { useSofiaaTelemetry } from "@/hooks/useSofiaaTelemetry";
import { getCachedResponse, setCachedResponse } from "@/core/response-cache";
import { getSemanticCache, setSemanticCache } from "@/core/semantic-cache";
import { recordPipelineEvent, setPipelineUserId } from "@/core/pipeline-observer";
import { detectGoal } from "@/core/goal.engine";
import { addTimelineEntry, buildContextualMemoryBlock } from "@/core/memory.timeline";
import {
  syncMemoryFromFirestore,
  writeLongMemory,
  readLongMemory,
  appendLongMemory,
  clearLongMemory,
} from "@/core/memory.store";
import { generateSessionTitle, extractTags, detectTopGoal } from "@/core/memory.summary";
import { OrbController } from "@/components/orb/orb.controller";
import { getDisclosure } from "@/core/experience.disclosure";
import GenerativeUI from "@/components/chat/GenerativeUI";
import { parseUIBlocks } from "@/types/generative-ui";
import type { UIBlock } from "@/types/generative-ui";
import { detectUIBlock } from "@/core/ui.intent";
import IntentDrivenUI from "@/components/chat/IntentDrivenUI";
import { parseIntentToken, INTENT_TOKEN_REGEX } from "@/types/intent";
import type { UIIntent } from "@/types/intent";
import { useGoalState } from "@/hooks/useGoalState";
import { useExperienceGraph } from "@/hooks/useExperienceGraph";
import OnboardingSlides from "@/components/onboarding/OnboardingSlides";

interface Message {
  role: "user" | "assistant";
  content: string;
  ui?: UIBlock[];
  intent?: UIIntent;
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

// ─── SOFIAA Brand tokens ───────────────────────────────────────────────────────
const BRAND = {
  rosa:   "#F472B6",
  lila:   "#A855F7",
  azul:   "#60A5FA",
  aurora: "linear-gradient(135deg, #F472B6 0%, #A855F7 50%, #60A5FA 100%)",
  auroraGlow: "0 4px 24px rgba(168,85,247,0.32), 0 1px 0 rgba(255,255,255,0.22) inset",
};

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
    boxShadow: `0 4px 20px rgba(168,85,247,0.06), ${LG.highlight}`,
    color: "#1D1D1F",
  } as React.CSSProperties,
  user: {
    background: BRAND.aurora,
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.22)",
    boxShadow: BRAND.auroraGlow,
    color: "#FFFFFF",
  } as React.CSSProperties,
  input: {
    background: LG.base(0.52), backdropFilter: LG.blur, WebkitBackdropFilter: LG.blur,
    border: "1px solid rgba(168,85,247,0.22)",
    boxShadow: `0 2px 16px rgba(168,85,247,0.07), ${LG.highlight}`,
    borderRadius: "9999px", padding: "0.38rem 0.9rem", color: "#1D1D1F",
    fontSize: "0.80rem", outline: "none", width: "100%", transition: "box-shadow 0.25s",
  } as React.CSSProperties,
  chip: {
    background: LG.base(0.45), backdropFilter: LG.blur, WebkitBackdropFilter: LG.blur,
    border: "1px solid rgba(168,85,247,0.20)",
    boxShadow: `0 2px 10px rgba(168,85,247,0.06), ${LG.highlight}`,
    borderRadius: "9999px", padding: "0.38rem 0.9rem", fontSize: "0.79rem",
    color: "#3D3D3F", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" as const,
  } as React.CSSProperties,
};

// ─── Dark Glass ────────────────────────────────────────────────────────────────
const darkGlass = {
  assistant: {
    background: "rgba(255,255,255,0.05)", backdropFilter: LG.blur, WebkitBackdropFilter: LG.blur,
    border: "1px solid rgba(168,85,247,0.15)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.35), inset 0 1.5px 0 rgba(255,255,255,0.07)",
    color: "#ECECF1",
  } as React.CSSProperties,
  user: glass.user,
  input: {
    background: "rgba(255,255,255,0.07)", backdropFilter: LG.blur, WebkitBackdropFilter: LG.blur,
    border: "1px solid rgba(168,85,247,0.22)",
    boxShadow: "0 2px 16px rgba(0,0,0,0.30), inset 0 1.5px 0 rgba(255,255,255,0.05)",
    borderRadius: "9999px", padding: "0.5rem 0.9rem", color: "#ECECF1",
    fontSize: "0.82rem", outline: "none", width: "100%", transition: "box-shadow 0.25s",
  } as React.CSSProperties,
  chip: {
    background: "rgba(168,85,247,0.09)", backdropFilter: LG.blur, WebkitBackdropFilter: LG.blur,
    border: "1px solid rgba(168,85,247,0.22)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.05)",
    borderRadius: "9999px", padding: "0.38rem 0.9rem", fontSize: "0.79rem",
    color: "rgba(255,255,255,0.78)", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" as const,
  } as React.CSSProperties,
};

const gradientText: React.CSSProperties = {
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  background: "linear-gradient(135deg, #F472B6 0%, #A855F7 50%, #60A5FA 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const activeExtension = useExtension();
  const telemetry   = useSofiaaTelemetry();
  const goalState   = useGoalState(activeExtension?.id);
  const { profile, signOut, user }        = useAuth();
  const expGraph    = useExperienceGraph(user?.uid ?? null);
  const [orbState, setOrbState]       = useState<OrbState>("idle");
  const [tecBiSummary, setTecBiSummary]   = useState<string | null>(null);
  const [showLogin, setShowLogin]         = useState(false);

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
  const [showNora,  setShowNora]                = useState(false);
  const [pendingNav, setPendingNav]         = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
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
  // Onboarding: mostrar solo la primera vez
  useEffect(() => {
    const seen = localStorage.getItem("sofiaa_intro_seen");
    if (!seen) setShowOnboarding(true);
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

  // H-2 + H-3: Sync al autenticarse
  useEffect(() => {
    if (user?.uid) {
      syncMemoryFromFirestore(user.uid).catch(() => {});  // H-2
      setPipelineUserId(user.uid);                         // H-3
    } else {
      setPipelineUserId(null);
    }
  }, [user?.uid]);

  // Bienvenida o restauración de memoria
  useEffect(() => {
    const hasLongMemory = !!readLongMemory();
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
          appendLongMemory(user?.uid ?? null, memory);

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
      const dest = pendingNav;
      setPendingNav(null);
      setInput("");
      if (confirmed) {
        // Mostrar "sí" en chat antes de navegar — evita que el mensaje desaparezca (Bug 2)
        setMessages((prev) => [...prev,
          { role: "user", content: text },
          { role: "assistant", content: `Llevándote a ${dest}…` }
        ]);
        setTimeout(() => router.push(dest), 400);
        return;
      }
      // Si no confirmó, continuar procesando el mensaje normalmente
    }

    // ── Fallback: afirmativo sin pendingNav — escanear último mensaje del asistente ──
    // Cubre el caso donde el LLM preguntó "¿quieres ir?" sin emitir [NAVIGATE] (Bug 3)
    const normalizedText = text.toLowerCase().trim();
    const isAffirmative = AFFIRMATIVE.some((w) => normalizedText === w || normalizedText.startsWith(w + " "));
    if (isAffirmative) {
      const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
      if (lastAssistant) {
        const routeMatch = lastAssistant.content.match(/\/(tec-bi|jp-memorial|marketing-sofia|servicios|quienes-somos|contacto|por-que-sofiaa)/);
        if (routeMatch) {
          const dest = "/" + routeMatch[1];
          setInput("");
          setMessages((prev) => [...prev,
            { role: "user", content: text },
            { role: "assistant", content: `Llevándote a ${dest}…` }
          ]);
          setTimeout(() => router.push(dest), 400);
          return;
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── Presentación / onboarding ─────────────────────────────────────────────
    const lc = text.toLowerCase().trim();
    if (/preséntate|presentate|presentación|quien eres sofiaa|quién eres sofiaa|muéstrate|muestrate|intro sofiaa|abre la presentación|abre la presentacion/.test(lc)) {
      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "Con gusto ✨" }]);
      setShowOnboarding(true);
      return;
    }
    // ── Tema oscuro / claro ───────────────────────────────────────────────────
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

    // Frase secreta N.O.R.A — visor de datos de usuarios
    if (text.toLowerCase() === "fiat lux") {
      setInput("");
      setShowNora(true);
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

    // ── Response Cache: exact match O(1) ─────────────────────────────────
    const pipelineStart = Date.now();
    const cachedReply = getCachedResponse(text);
    if (cachedReply) {
      orb.flashCacheHit();
      recordPipelineEvent({
        messageSnippet: text.slice(0, 60),
        taskType: "unknown", provider: "cache", confidence: 1,
        cacheLayer: "exact", latencyMs: Date.now() - pipelineStart,
      });
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

    // ── Semantic Cache: vector similarity O(n) — Sprint F-2 ──────────────
    const semanticReply = await getSemanticCache(text);
    if (semanticReply) {
      orb.flashCacheHit();
      recordPipelineEvent({
        messageSnippet: text.slice(0, 60),
        taskType: "unknown", provider: "cache", confidence: 1,
        cacheLayer: "semantic", latencyMs: Date.now() - pipelineStart,
      });
      setMessages([...updatedMessages, { role: "assistant", content: semanticReply }]);
      setWelcomeText("");
      setInput("");
      telemetry.trackMessageReceived();
      if (sentViaVoiceRef.current) {
        sentViaVoiceRef.current = false;
        try { speakText(semanticReply); } catch { /* no crítico */ }
      }
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

    setMessages([...updatedMessages, { role: "assistant", content: "" }]);
    setWelcomeText(""); // saludo desaparece al primer mensaje
    setInput("");
    setIsLoading(true);
    orb.transition("thinking");

    // ── H-1: detectar si el mensaje requiere modo agente (ReAct multi-paso) ─
    const AGENT_PATTERNS = [
      /\banaliza\b/i, /\bcompara\b/i, /\binvestiga\b/i,
      /\bdame un reporte\b/i, /\breporte de\b/i,
      /\bresumen (completo|ejecutivo|detallado)\b/i,
      /\bcuántos?\b.*\by\b.*\bcuántos?\b/i,   // "cuántos X y cuántos Y"
      /\b(todos|todas) (los|las)\b.*\b(y|además|también)\b/i,
      /\bpaso a paso\b/i, /\bplan de\b/i, /\bestrategia\b/i,
    ];
    const AGENT_ROLES = new Set<string>(["admin", "director", "vp"]);
    const useAgentMode =
      AGENT_ROLES.has(profile?.rol ?? "") &&
      AGENT_PATTERNS.some(p => p.test(text));
    // ─────────────────────────────────────────────────────────────────────

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages
            .filter(m => !m.content.startsWith("Llevándote a "))  // excluir confirmaciones sintéticas de nav
            .map(({ role, content }) => ({ role, content })),
          longTermMemory: readLongMemory() || undefined,
          contextualMemory: buildContextualMemoryBlock(5),
          detectedGoal,
          activePath: pathname,
          extensionData: tecBiSummary || undefined,
          userRole:     profile?.rol ?? null,
          activeGoal:   goalState.goal,
          graphContext: expGraph.getAPIPayload(),
          userId:       user?.uid ?? null,
          agentMode:    useAgentMode,
        }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "sin detalle");
        console.error("Groq error", res.status, errText);
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      // ── F-3: capturar headers del pipeline ────────────────────────────
      const pipelineTaskType  = (res.headers.get("x-sofiaa-tasktype")   ?? "unknown") as import("@/core/llm.orchestrator").TaskType;
      const pipelineProvider  = res.headers.get("x-sofiaa-provider")    ?? "unknown";
      const pipelineConf      = parseFloat(res.headers.get("x-sofiaa-confidence") ?? "1");
      // ─────────────────────────────────────────────────────────────────

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

      // ── Response Cache: guardar en ambas capas ───────────────────────────
      setCachedResponse(text, fullResponse);                        // exact match (sync)
      setSemanticCache(text, fullResponse).catch(() => undefined);  // semántico (async, best-effort)
      // ─────────────────────────────────────────────────────────────────────

      // ── F-3: registrar evento de pipeline ────────────────────────────────
      recordPipelineEvent({
        messageSnippet: text.slice(0, 60),
        taskType:   pipelineTaskType,
        provider:   pipelineProvider,
        confidence: pipelineConf,
        cacheLayer: "miss",
        latencyMs:  Date.now() - pipelineStart,
      });
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

      // ── Parsear [INTENT:] token — Sprint D-B ──────────────────────────────
      const intentMatch = fullResponse.match(INTENT_TOKEN_REGEX);
      const parsedIntent = intentMatch ? parseIntentToken(fullResponse) : null;

      // Detectar si la respuesta dispara un goal multi-step — Sprint D-A
      goalState.detectAndStart(text);

      // Actualizar Experience Graph — Sprint D-E
      expGraph.recordTurn(text, pathname ?? undefined);
      // ─────────────────────────────────────────────────────────────────────

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: cleanedResponse
              .replace(/\[NAVIGATE:[^\]]+\]\n?/g, "")
              .replace(INTENT_TOKEN_REGEX, "")
              .trim(),
            ui:     finalUIBlocks.length > 0 ? finalUIBlocks : undefined,
            intent: parsedIntent ?? undefined,
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
    {showOnboarding && (
      <OnboardingSlides
        onDone={() => {
          localStorage.setItem("sofiaa_intro_seen", "1");
          setShowOnboarding(false);
        }}
      />
    )}
    <LoginModal
      isOpen={showLogin}
      onClose={() => setShowLogin(false)}
      onSuccess={(email) => {
        setShowLogin(false);
        setMessages((prev) => [...prev, { role: "assistant", content: `✅ Sesión iniciada. Bienvenido a SOFIAA OS.` }]);
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

    {showNora && <NoraPanel onClose={() => setShowNora(false)} />}

    {showAdmin && (
      <AdminPanel
        messages={messages}
        onClose={() => setShowAdmin(false)}
        onClearMemory={() => {
          clearLongMemory(user?.uid ?? null).catch(() => {});
          setShowAdmin(false);
        }}
        onClearConversation={() => {
          resetChat();
          setShowAdmin(false);
        }}
        onUpdateLongMemory={(text) => {
          writeLongMemory(user?.uid ?? null, text);
        }}
        onResumeSession={(summary) => {
          const existing = readLongMemory();
          const withResume = existing
            ? `${existing}\n[Contexto reanudado]: ${summary}`
            : `[Contexto reanudado]: ${summary}`;
          writeLongMemory(user?.uid ?? null, withResume);
        }}
      />
    )}
    <main
      className="sofiaa-panel flex-1 flex flex-col"
      style={{
        position: "relative",
        background: isDark
          ? "linear-gradient(160deg, #09090F 0%, #0E0B1A 60%, #09090F 100%)"
          : "linear-gradient(160deg, #F9F5FF 0%, #FAFAFA 55%, #FFF0F9 100%)",
      }}
    >
      {/* ── La Aurora — blobs de fondo (brand SOFIAA) ── */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "-10%", left: "-15%",
          width: "55%", height: "55%", borderRadius: "50%",
          background: isDark
            ? "radial-gradient(ellipse, rgba(244,114,182,0.12) 0%, transparent 70%)"
            : "radial-gradient(ellipse, rgba(244,114,182,0.10) 0%, transparent 70%)",
          filter: "blur(48px)",
          animation: "gradientFlow 14s ease infinite",
        }} />
        <div style={{
          position: "absolute", top: "30%", right: "-10%",
          width: "45%", height: "45%", borderRadius: "50%",
          background: isDark
            ? "radial-gradient(ellipse, rgba(96,165,250,0.10) 0%, transparent 70%)"
            : "radial-gradient(ellipse, rgba(96,165,250,0.09) 0%, transparent 70%)",
          filter: "blur(48px)",
          animation: "gradientFlow 18s ease infinite reverse",
        }} />
        <div style={{
          position: "absolute", bottom: "-5%", left: "25%",
          width: "50%", height: "40%", borderRadius: "50%",
          background: isDark
            ? "radial-gradient(ellipse, rgba(168,85,247,0.09) 0%, transparent 70%)"
            : "radial-gradient(ellipse, rgba(168,85,247,0.07) 0%, transparent 70%)",
          filter: "blur(48px)",
          animation: "gradientFlow 22s ease infinite",
        }} />
      </div>
      {/* Header */}
      <div className="shrink-0 relative flex flex-col items-center gap-0.5 pt-10 pb-1 w-full px-5">
        <p className="text-xs tracking-[0.32em] uppercase font-light" style={{ color: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.28)" }}>
          SOFIAA LAB
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Isotipo PHI */}
          <SofiaLogo size={38} animated />
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
              background: BRAND.aurora,
              color: "#fff", fontWeight: 700, letterSpacing: "0.02em",
              boxShadow: BRAND.auroraGlow,
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

            {/* Sender label */}
            <div style={{
              fontSize: "0.60rem",
              fontWeight: 800,
              letterSpacing: "0.09em",
              textTransform: "uppercase" as const,
              marginBottom: 3,
              paddingLeft: msg.role === "user" ? 0 : 10,
              paddingRight: msg.role === "user" ? 10 : 0,
              background: msg.role === "user"
                ? "linear-gradient(135deg, #A855F7, #F472B6)"
                : "linear-gradient(135deg, #60A5FA, #A855F7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              {msg.role === "user" ? (profile?.nombre ?? "tú") : "SOFIAA"}
            </div>

            {/* Burbuja con borde degradado */}
            {msg.role === "assistant" ? (
              /* Assistant: borde gradiente rosa→azul */
              <div
                className="sofiaa-bubble"
                style={{
                  background: "linear-gradient(135deg, rgba(96,165,250,0.55), rgba(168,85,247,0.45), rgba(244,114,182,0.40))",
                  borderRadius: "1.5rem 1.5rem 1.5rem 0.4rem",
                  padding: "1.5px",
                }}
              >
                <div
                  className="px-4 py-3 text-sm leading-relaxed"
                  style={{
                    ...(isDark ? darkGlass.assistant : glass.assistant),
                    borderRadius: "calc(1.5rem - 1.5px) calc(1.5rem - 1.5px) calc(1.5rem - 1.5px) calc(0.4rem - 1.5px)",
                    fontWeight: 500,
                  }}
                >
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
                  {isLoading && i === messages.length - 1 && (
                    <span
                      className="inline-block w-0.5 h-3.5 ml-0.5 align-middle"
                      style={{ background: "rgba(0,0,0,0.35)", animation: "cursorBlink 1s step-end infinite" }}
                    />
                  )}
                </div>
              </div>
            ) : (
              /* User: borde blanco semitransparente sobre gradiente */
              <div
                className="sofiaa-bubble"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.45), rgba(255,255,255,0.18))",
                  borderRadius: "1.5rem 1.5rem 0.4rem 1.5rem",
                  padding: "1.5px",
                }}
              >
                <div
                  className="px-4 py-3 text-sm leading-relaxed"
                  style={{
                    ...glass.user,
                    borderRadius: "calc(1.5rem - 1.5px) calc(1.5rem - 1.5px) calc(0.4rem - 1.5px) calc(1.5rem - 1.5px)",
                    fontWeight: 600,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            )}

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

            {/* Intent-Driven UI — Sprint D-B: componentes declarados por el LLM */}
            {msg.role === "assistant" && msg.intent && (
              <div style={{ maxWidth: "85%", width: "100%" }}>
                <IntentDrivenUI
                  intent={msg.intent}
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
        className="shrink-0 w-full pt-3"
        style={{
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
          paddingBottom: "max(1.6rem, env(safe-area-inset-bottom, 1.6rem))",
        }}
      >
        {/* Input row — micrófono afuera a la izquierda */}
        <div className="flex items-center gap-2">

          {/* Botón micrófono — fuera del input */}
          <button
            onClick={toggleVoice}
            disabled={isLoading || isWelcoming}
            className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: isListeningVoice
                ? BRAND.aurora
                : isDark ? "rgba(255,255,255,0.08)" : LG.base(0.80),
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: isListeningVoice
                ? BRAND.auroraGlow
                : `0 2px 10px rgba(168,85,247,0.12), inset 0 1px 0 rgba(255,255,255,0.95)`,
              border: isListeningVoice ? "none" : "1px solid rgba(168,85,247,0.25)",
              animation: isListeningVoice ? "waveExpand 1.5s ease-out infinite" : "none",
            }}
            aria-label="Hablar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
              fill="none"
              stroke={isListeningVoice ? "white" : BRAND.lila}
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              style={{ width: "14px", height: "14px" }}>
              <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </button>

          {/* Input + botón enviar */}
          <div className="relative flex-1">
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
              placeholder={isListeningVoice ? "Escuchando..." : "Escribe algo..."}
              disabled={isLoading || isWelcoming || isListeningVoice || (orbState !== "listening" && !disclosure.inputEnabled)}
              style={isDark ? darkGlass.input : glass.input}
              className="disabled:opacity-60 pr-11"
            />

            {/* Botón enviar */}
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || isWelcoming || !input.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full disabled:opacity-35 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: BRAND.aurora,
                boxShadow: BRAND.auroraGlow,
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

        {/* Atajos de extensiones */}
        <div className="flex justify-center gap-2 mt-2.5">
          {[
            { label: "TEC Bii", icon: "🧠", path: "/tec-bii",        color: "rgba(6,182,212,0.13)",   border: "rgba(6,182,212,0.30)"  },
            { label: "MK-s",   icon: "📱", path: "/marketing-sofia", color: "rgba(168,85,247,0.13)", border: "rgba(168,85,247,0.30)" },
            { label: "JP",     icon: "💙", path: "/jp-memorial",     color: "rgba(244,114,182,0.13)", border: "rgba(244,114,182,0.30)" },
          ].map(({ label, icon, path, color, border }) => (
            <button
              key={path}
              onClick={() => router.push(path)}
              className="active:scale-95 transition-transform"
              style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: "0.67rem", fontWeight: 700, letterSpacing: "0.04em",
                padding: "5px 13px", borderRadius: 99,
                background: color,
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: `1px solid ${border}`,
                color: isDark ? "rgba(255,255,255,0.72)" : "#444",
                cursor: "pointer",
                whiteSpace: "nowrap" as const,
              }}
            >
              <span style={{ fontSize: 10 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </main>
    </div>
  );
}
