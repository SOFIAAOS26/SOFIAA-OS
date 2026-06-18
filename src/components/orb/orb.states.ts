export type OrbState = "idle" | "listening" | "thinking" | "responding";

export interface OrbStateConfig {
  animation: string;
  glowColor: string;
  glowIntensity: string;
  label: string;
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
};
