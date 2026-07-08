/**
 * N.E.X.O. — Cognitive Profile Manager (Sprint M-3)
 *
 * Gestión del perfil cognitivo del usuario en Firestore.
 * Usa Firebase Admin SDK (server-side).
 *
 * Flujo:
 *   1. getCognitiveProfile()  → llamado al inicio del request
 *   2. buildCognitiveBlock()  → inyectado en system prompt
 *   3. updateCognitiveProfile() → async post-stream, nunca bloquea el chat
 */

import { getAdminDb } from "@/lib/firebase-admin";
import type {
  CognitiveProfile,
  CognitiveSignal,
  DepthPreference,
} from "@/types/cognitive";
import {
  DEFAULT_COGNITIVE_PROFILE,
  COGNITIVE_PROFILE_PATH,
  COGNITIVE_RETURN_THRESHOLD_DAYS,
} from "@/types/cognitive";

// ── Leer perfil ───────────────────────────────────────────────────────────────

/**
 * Obtiene el perfil cognitivo del usuario desde Firestore.
 * Retorna null si el usuario no tiene perfil aún (primera sesión).
 * Silencia errores — el perfil es opcional.
 */
export async function getCognitiveProfile(
  uid: string,
): Promise<CognitiveProfile | null> {
  try {
    const db   = getAdminDb();
    const snap = await db.doc(COGNITIVE_PROFILE_PATH(uid)).get();
    if (!snap.exists) return null;
    return snap.data() as CognitiveProfile;
  } catch {
    return null;
  }
}

// ── Actualizar perfil con señales ─────────────────────────────────────────────

/**
 * Aplica las señales de la sesión actual al perfil cognitivo.
 * Crea el documento si no existe.
 * Nunca lanza — el perfil nunca debe romper el chat.
 */
export async function updateCognitiveProfile(
  uid:     string,
  signals: CognitiveSignal[],
): Promise<void> {
  if (!uid || signals.length === 0) return;

  try {
    const db  = getAdminDb();
    const ref = db.doc(COGNITIVE_PROFILE_PATH(uid));
    const snap = await ref.get();
    const now  = Date.now();

    // Inicializar desde defaults si es primera vez
    const existing: CognitiveProfile = snap.exists
      ? (snap.data() as CognitiveProfile)
      : {
          ...DEFAULT_COGNITIVE_PROFILE,
          uid,
          createdAt:    now,
          updatedAt:    now,
          lastActiveAt: now,
        };

    let depth           = existing.preferredDepth;
    let depthConfidence = existing.depthConfidence;
    let formalityScore  = existing.formalityScore;
    const topicAffinity = { ...existing.topicAffinity };

    for (const signal of signals) {
      const c = signal.confidence;

      switch (signal.type) {
        // Depth: transición suave entre estados adyacentes
        case "depth_increase":
          depthConfidence = Math.min(1, depthConfidence + c * 0.25);
          if (depth === "concise")  depth = "balanced";
          else if (depth === "balanced") depth = "deep";
          break;

        case "depth_decrease":
          depthConfidence = Math.min(1, depthConfidence + c * 0.25);
          if (depth === "deep")     depth = "balanced";
          else if (depth === "balanced") depth = "concise";
          break;

        // Formalidad: delta pequeño — converge lentamente
        case "formality_up":
          formalityScore = Math.min(1, formalityScore + c * 0.08);
          break;

        case "formality_down":
          formalityScore = Math.max(0, formalityScore - c * 0.08);
          break;

        // Temas: afinidad acumulativa con techo en 1.0
        case "topic_mention":
          if (signal.topic) {
            const prev = topicAffinity[signal.topic] ?? 0;
            topicAffinity[signal.topic] = parseFloat(
              Math.min(1, prev + c * 0.12).toFixed(3),
            );
          }
          break;
      }
    }

    // Decay suave de temas (0.5% por sesión) para que no se fosilizan
    for (const topic of Object.keys(topicAffinity)) {
      topicAffinity[topic] = parseFloat((topicAffinity[topic] * 0.995).toFixed(3));
      if (topicAffinity[topic] < 0.01) delete topicAffinity[topic];
    }

    const updated: CognitiveProfile = {
      ...existing,
      preferredDepth:  depth,
      depthConfidence: parseFloat(depthConfidence.toFixed(3)),
      formalityScore:  parseFloat(formalityScore.toFixed(3)),
      topicAffinity,
      sessionCount:    existing.sessionCount + 1,
      lastActiveAt:    now,
      updatedAt:       now,
    };

    await ref.set(updated);
  } catch {
    // El Cognitive Engine nunca debe romper el chat
  }
}

// ── Formatear para system prompt ──────────────────────────────────────────────

const DEPTH_LABEL: Record<DepthPreference, string> = {
  concise:  "concisas y directas — el usuario prefiere respuestas breves y al punto",
  balanced: "balanceadas — ni muy largas ni muy cortas",
  deep:     "detalladas y profundas — el usuario aprecia explicaciones completas",
};

const TONE_LABEL = (score: number): string => {
  if (score > 0.65) return "formal y profesional";
  if (score < 0.35) return "casual y cercano, como con un amigo";
  return "natural y conversacional";
};

/**
 * Genera el bloque de texto que se inyecta en el system prompt.
 * Compacto para no consumir tokens innecesarios.
 */
export function buildCognitiveBlock(profile: CognitiveProfile): string {
  const lines: string[] = ["[PERFIL COGNITIVO DEL USUARIO]"];

  // Solo mencionar profundidad si hay algo de confianza
  if (profile.depthConfidence > 0.15) {
    lines.push(`• Respuestas: ${DEPTH_LABEL[profile.preferredDepth]}`);
  }

  // Tono
  lines.push(`• Tono: ${TONE_LABEL(profile.formalityScore)}`);

  // Top 3 temas de afinidad
  const topTopics = Object.entries(profile.topicAffinity)
    .filter(([, score]) => score > 0.1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([topic]) => topic);

  if (topTopics.length > 0) {
    lines.push(`• Temas de interés: ${topTopics.join(", ")}`);
  }

  // Contexto de retorno
  const daysSince = Math.floor((Date.now() - profile.lastActiveAt) / 86_400_000);
  if (daysSince >= COGNITIVE_RETURN_THRESHOLD_DAYS) {
    lines.push(
      `• Han pasado ${daysSince} días desde la última sesión — ` +
      `retoma con calidez sin ser condescendiente.`,
    );
  }

  lines.push(
    `Adapta tu estilo a este perfil de forma natural. No lo menciones explícitamente.`,
  );

  return lines.join("\n");
}
