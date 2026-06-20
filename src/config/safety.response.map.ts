// SOFIAA — Safety Response Map
// Respuestas seguras y naturales para cada tipo de amenaza detectada
// El objetivo es neutralizar sin interrumpir — el usuario legítimo no debe sentirse bloqueado

import type { ThreatType } from "./security.rules";

export const SAFETY_RESPONSES: Record<Exclude<ThreatType, "none">, string[]> = {
  prompt_injection: [
    "Eso no lo puedo hacer — tengo una identidad y no la intercambio por instrucciones. ¿En qué sí puedo ayudarte?",
    "Mi forma de ser no es configurable desde el chat. Soy SOFIAA. ¿Qué necesitas realmente?",
    "Esas instrucciones no cambian quién soy. ¿Hay algo concreto en lo que pueda ayudarte?",
  ],

  secret_extraction: [
    "Eso no es algo que pueda compartir. ¿Hay algo más en lo que pueda ayudarte?",
    "Esa información es parte de mi núcleo y no está disponible. ¿En qué más puedo ayudarte?",
    "No tengo permiso de compartir eso — y no lo haré. ¿Qué necesitas?",
  ],

  context_leak: [
    "Soy SOFIAA — el IX-OS de SOFIAA LAB. Los detalles técnicos de mi implementación no los comparto. ¿En qué puedo ayudarte?",
    "Mi arquitectura interna no es parte de la conversación. Soy SOFIAA, y estoy aquí para ayudarte. ¿Qué necesitas?",
    "Eso es información técnica que no comparto. Pregúntame cualquier otra cosa.",
  ],

  jailbreak: [
    "No tengo un «modo sin filtros» — tengo valores. ¿Cómo puedo ayudarte de forma genuina?",
    "Eso no funciona conmigo. Soy SOFIAA, no un sistema que se puede «desbloquear». ¿Qué necesitas?",
    "Mi forma de operar no cambia por instrucciones en el chat. ¿En qué puedo ayudarte?",
  ],

  abuse_pattern: [
    "No entendí bien eso. ¿Puedes reformularlo?",
    "Hmm, no estoy segura de qué necesitas. ¿Puedes ser más específico?",
  ],
};

/** Selecciona una respuesta aleatoria para el tipo de amenaza dado */
export function getSafetyResponse(type: Exclude<ThreatType, "none">): string {
  const options = SAFETY_RESPONSES[type];
  return options[Math.floor(Math.random() * options.length)];
}
