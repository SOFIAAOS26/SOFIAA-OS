/**
 * N.E.X.O. — Cognitive Signal Extractor (Sprint M-3)
 *
 * Detecta señales cognitivas en los mensajes del usuario usando reglas
 * deterministas (regex). Sin LLM, sin latencia, nunca falla.
 *
 * Señales detectadas:
 *   depth_increase  — usuario pidió más detalle / profundidad
 *   depth_decrease  — usuario pidió respuesta más corta / concisa
 *   formality_up    — lenguaje formal detectado
 *   formality_down  — lenguaje casual/coloquial detectado
 *   topic_mention   — mención de tema específico
 */

import type { CognitiveSignal } from "@/types/cognitive";

// ── Patrones de profundidad ───────────────────────────────────────────────────

const DEPTH_UP: RegExp[] = [
  /más\s+detall/i,
  /más\s+completo/i,
  /más\s+extenso/i,
  /más\s+información/i,
  /más\s+contexto/i,
  /explica\s+más/i,
  /en\s+profundidad/i,
  /profundiza/i,
  /elabora/i,
  /amplía/i,
  /amplia/i,
  /desarrolla\s+más/i,
  /cuéntame\s+más/i,
  /cuéntame\s+todo/i,
  /detalla/i,
  /a\s+fondo/i,
  /con\s+detalle/i,
];

const DEPTH_DOWN: RegExp[] = [
  /más\s+cort/i,
  /más\s+breve/i,
  /más\s+concis/i,
  /resumid/i,
  /en\s+resumen/i,
  /en\s+pocas\s+palabras/i,
  /brevemente/i,
  /simplifica/i,
  /sintetiza/i,
  /al\s+grano/i,
  /sin\s+rollo/i,
  /directo\s+al\s+punto/i,
  /solo\s+lo\s+importante/i,
  /lo\s+esencial/i,
  /resumen\s+rápido/i,
];

// ── Patrones de formalidad ────────────────────────────────────────────────────

const FORMAL_UP: RegExp[] = [
  /por\s+favor/i,
  /\busted\b/i,
  /estimad[oa]/i,
  /cordialmente/i,
  /atentamente/i,
  /le\s+agradezco/i,
  /disculpe/i,
  /sería\s+tan\s+amable/i,
  /sería\s+posible/i,
  /me\s+podría/i,
  /le\s+solicito/i,
];

const FORMAL_DOWN: RegExp[] = [
  /\bwey\b/i,
  /\bórale\b/i,
  /\bno\s+manches\b/i,
  /\bjaja/i,
  /\blol\b/i,
  /\bxd\b/i,
  /\bsale\b/i,
  /\bpadrísimo\b/i,
  /\bchido\b/i,
  /\bbro\b/i,
  /\btío\b/i,
  /\btía\b/i,
  /\bhacha\b/i,
  /\bguey\b/i,
  /\bneta\b/i,
  /\bchamba\b/i,
];

// ── Patrones temáticos ────────────────────────────────────────────────────────

const TOPIC_PATTERNS: Array<[string, RegExp[]]> = [
  ["trabajo", [
    /\btrabajo\b/i, /\bproyecto\b/i, /\bcliente\b/i, /\breunión\b/i,
    /\bsprint\b/i, /\bequipo\b/i, /\boficina\b/i, /\bpresentación\b/i,
    /\binforme\b/i, /\bcolega\b/i, /\bjefe\b/i, /\bempresa\b/i,
  ]],
  ["tecnología", [
    /\bcódigo\b/i, /\bprogramar\b/i, /\bsoftware\b/i, /\bapp\b/i,
    /\bweb\b/i, /\bapi\b/i, /\b(ia|inteligencia\s+artificial)\b/i,
    /\bgithub\b/i, /\bdesarrollo\b/i, /\bfrontend\b/i, /\bbackend\b/i,
    /\bbase\s+de\s+datos\b/i, /\bnext\.?js\b/i, /\bfirebase\b/i,
  ]],
  ["comida", [
    /\bcomida\b/i, /\brestaurante\b/i, /\breceta\b/i, /\bcomer\b/i,
    /\bplatillo\b/i, /\bcocina\b/i, /\bmenú\b/i, /\bingrediente\b/i,
    /\bchef\b/i, /\bfood\b/i,
  ]],
  ["viaje", [
    /\bviaje\b/i, /\bviajar\b/i, /\bhotel\b/i, /\bvuelo\b/i,
    /\bdestino\b/i, /\bturismo\b/i, /\bturista\b/i, /\bpasaporte\b/i,
    /\bairbnb\b/i, /\bvacaciones\b/i, /\bitinerario\b/i,
  ]],
  ["compras", [
    /\bcomprar\b/i, /\bprecio\b/i, /\bproducto\b/i, /\btienda\b/i,
    /\boferta\b/i, /\bdescuento\b/i, /\bamazon\b/i, /\bcarro\b/i,
    /\bcarrito\b/i, /\benvío\b/i,
  ]],
  ["salud", [
    /\bsalud\b/i, /\bejercicio\b/i, /\bgym\b/i, /\bgimn/i,
    /\bmédico\b/i, /\bdieta\b/i, /\bbienestar\b/i, /\bdormir\b/i,
    /\bsueño\b/i, /\bmeditación\b/i, /\bcorrer\b/i,
  ]],
  ["finanzas", [
    /\bdinero\b/i, /\binversión\b/i, /\bahorro\b/i, /\bpresupuesto\b/i,
    /\bgasto\b/i, /\bfinanzas\b/i, /\bdeuda\b/i, /\bcrypto\b/i,
    /\bacciones\b/i, /\bbolsa\b/i, /\bingreso\b/i,
  ]],
  ["creatividad", [
    /\bdiseño\b/i, /\barte\b/i, /\bcreativi/i, /\bbranding\b/i,
    /\bidentidad\s+visual\b/i, /\bmarca\b/i, /\blogo\b/i,
    /\bilustración\b/i, /\bfotografía\b/i, /\bvideo\b/i,
  ]],
];

// ── Extractor principal ───────────────────────────────────────────────────────

/**
 * Extrae señales cognitivas de los mensajes del usuario en la conversación.
 * Solo analiza mensajes de rol "user", no respuestas de SOFIAA.
 */
export function extractSignals(userMessages: string[]): CognitiveSignal[] {
  if (userMessages.length === 0) return [];

  const signals: CognitiveSignal[] = [];
  const now  = Date.now();
  const text = userMessages.join(" ");

  // ── Profundidad ──────────────────────────────────────────────────────────
  const depthUp   = DEPTH_UP.some(p => p.test(text));
  const depthDown = DEPTH_DOWN.some(p => p.test(text));

  if (depthUp && !depthDown) {
    signals.push({ type: "depth_increase", confidence: 0.85, detectedAt: now });
  } else if (depthDown && !depthUp) {
    signals.push({ type: "depth_decrease", confidence: 0.85, detectedAt: now });
  }

  // ── Formalidad ───────────────────────────────────────────────────────────
  const formalUp   = FORMAL_UP.some(p => p.test(text));
  const formalDown = FORMAL_DOWN.some(p => p.test(text));

  if (formalUp && !formalDown) {
    signals.push({ type: "formality_up", confidence: 0.70, detectedAt: now });
  } else if (formalDown && !formalUp) {
    signals.push({ type: "formality_down", confidence: 0.70, detectedAt: now });
  }

  // ── Temas ────────────────────────────────────────────────────────────────
  for (const [topic, patterns] of TOPIC_PATTERNS) {
    const matches = patterns.filter(p => p.test(text)).length;
    if (matches > 0) {
      signals.push({
        type:       "topic_mention",
        topic,
        confidence: Math.min(1, matches * 0.30),
        detectedAt: now,
      });
    }
  }

  return signals;
}
