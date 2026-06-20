export type OrbState =
  | "idle"
  | "listening"
  | "thinking"
  | "responding"
  | "cache_hit"   // respuesta instantánea desde cache — flash cian
  | "error"       // error de red o modelo — pulso rojo/naranja
  | "success";    // acción completada exitosamente — destello verde

export interface OrbStateConfig {
  animation: string;
  glowColor: string;
  glowIntensity: string;
  label: string;
  /** Si true, este estado es transitorio y vuelve a idle automáticamente */
  transient?: boolean;
  /** Duración del estado transitorio en ms */
  transientDuration?: number;
}

export const ORB_STATES: Record<OrbState, OrbStateConfig> = {
  idle: {
    animation: "animate-[orbIdle_3s_ease-in-out_infinite]",
    glowColor: "rgba(79,124,255,0.15)",
    glowIntensity: "0 0 40px rgba(79,124,255,0.15)",
    label: "Presencia pasiva",
  },
  listening: {
    animation: "animate-[orbListening_0.8s_ease-in-out_infinite]",
    glowColor: "rgba(79,124,255,0.5)",
    glowIntensity: "0 0 60px rgba(79,124,255,0.5)",
    label: "Atención absoluta",
  },
  thinking: {
    animation: "animate-[orbThinking_1.2s_linear_infinite]",
    glowColor: "rgba(79,124,255,0.35)",
    glowIntensity: "0 0 50px rgba(79,124,255,0.35)",
    label: "Procesando",
  },
  responding: {
    animation: "animate-[orbResponding_1s_ease-in-out_infinite]",
    glowColor: "rgba(79,124,255,0.6)",
    glowIntensity: "0 0 80px rgba(79,124,255,0.6)",
    label: "Respondiendo",
  },
  cache_hit: {
    animation: "animate-[orbCacheHit_0.5s_ease-out_infinite]",
    glowColor: "rgba(0,210,200,0.7)",
    glowIntensity: "0 0 70px rgba(0,210,200,0.7)",
    label: "Respuesta instantánea",
    transient: true,
    transientDuration: 1200,
  },
  error: {
    animation: "animate-[orbError_1.5s_ease-in-out_infinite]",
    glowColor: "rgba(255,80,60,0.55)",
    glowIntensity: "0 0 60px rgba(255,80,60,0.55)",
    label: "Error — reintentando",
    transient: true,
    transientDuration: 3000,
  },
  success: {
    animation: "animate-[orbSuccess_0.6s_ease-out_1]",
    glowColor: "rgba(52,199,89,0.65)",
    glowIntensity: "0 0 70px rgba(52,199,89,0.65)",
    label: "Completado",
    transient: true,
    transientDuration: 1000,
  },
};
