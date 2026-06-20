// SOFIAA — Cache Policy
// TTL, invalidación y reglas de expiración del response cache

export const CACHE_VERSION = "1.0" as const;
export const CACHE_KEY     = "sofiaa_response_cache";

/** Tiempo de vida por categoría de pregunta (ms) */
export const TTL: Record<string, number> = {
  identity:   7 * 24 * 60 * 60 * 1000,  // "¿quién es Abrahan?" → 7 días (datos estables)
  services:   7 * 24 * 60 * 60 * 1000,  // "¿qué hace PASCALL?" → 7 días
  navigation: 0,                          // "llévame a servicios" → nunca cachear (acción)
  greeting:   0,                          // saludos → nunca cachear (deben variar)
  dynamic:    30 * 60 * 1000,            // preguntas generales → 30 min
  default:    60 * 60 * 1000,            // fallback → 1 hora
};

export const MAX_CACHE_ENTRIES = 80;    // máximo de pares en localStorage
export const MAX_KEY_LENGTH    = 120;   // caracteres máximos para la clave normalizada

/** Detecta la categoría de una pregunta para asignar TTL */
export function detectCategory(normalized: string): keyof typeof TTL {
  if (/abrahan|benjacob|creador|fundador|quién (eres|es)|tu (creador|historia)/.test(normalized)) return "identity";
  if (/sofiaa lab|pascall|berryworks|servicio|producción|consultoría/.test(normalized)) return "services";
  if (/navega|llévame|abre|ir a|muéstrame la (página|sección)/.test(normalized)) return "navigation";
  if (/^(hola|buenos|buenas|hey|hi|hello|qué tal|cómo estás)/.test(normalized)) return "greeting";
  return "default";
}
