"use client";

import { useState, useRef, useEffect } from "react";
import Orb from "@/components/orb/Orb";
import { OrbState } from "@/components/orb/orb.states";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setOrbState("thinking");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();
      setOrbState("responding");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Hubo un error al procesar tu solicitud." },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => setOrbState("idle"), 2000);
    }
  };

  return (
    <main className="flex flex-col items-center h-full bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex flex-col items-center gap-1 pt-10 pb-6">
        <p className="text-xs tracking-[0.3em] text-white/30 uppercase font-light">
          SOFIAA LAB
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          SOFIAA
        </h1>
        <p className="text-sm text-white/40 font-light">
          Intelligent Experience OS
        </p>
      </div>

      {/* Orb */}
      <div className="flex flex-col items-center gap-4 py-4">
        <Orb state={orbState} />
        <p className="text-sm text-white/30 tracking-wide font-light h-5">
          {orbState === "idle" && messages.length === 0 && "¿En qué puedo acompañarte?"}
          {orbState === "listening" && "Te escucho..."}
          {orbState === "thinking" && "Procesando tu solicitud..."}
          {orbState === "responding" && "Aquí está mi respuesta"}
        </p>
      </div>

      {/* Mensajes */}
      <div className="flex-1 w-full max-w-xl overflow-y-auto px-6 space-y-4 py-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#4F7CFF] text-white rounded-br-sm"
                  : "bg-white/5 text-white/80 border border-white/8 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="w-full max-w-xl px-6 pb-10 pt-4">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setOrbState("listening")}
            onBlur={() => { if (!input) setOrbState("idle"); }}
            onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
            placeholder="Escribe tu pregunta..."
            disabled={isLoading}
            className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#4F7CFF]/50 transition-all duration-300 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 flex items-center justify-center w-10 h-10 rounded-full bg-[#4F7CFF] hover:bg-[#3d6aee] transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Enviar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-white"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
