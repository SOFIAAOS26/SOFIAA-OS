# SOFIAA — Changelog Alpha
**Historial técnico desde el inicio · SOFIAA LAB**

> Registro cronológico de decisiones técnicas, cambios de arquitectura y correcciones críticas.  
> Cada entrada documenta qué cambió, por qué, y qué problema resolvió.

---

## [Alpha 0.6] — Junio 2026 · Sprint 2.1

### Agregado
- `ARCHITECTURE_FREEZE.md` — mapa oficial de módulos core vs extensibles
- `CODE_STANDARDS.md` — convenciones de nombres, estilos y patrones
- `CHANGELOG_ALPHA.md` — este archivo

---

## [Alpha 0.5] — Junio 2026 · Sprint 0 (completado)

### Agregado
- Ruta `/servicios` — tres tarjetas con SOFIAA LAB (#4F7CFF), PASCALL (#9B4FD9), BERRYWORKS (#E91E8C)
- Ruta `/quienes-somos` — perfil de Abrahan, stats grid, formación, skills, equipamiento, sección Jhosua
- Ruta `/contacto` — cuatro canales (Portfolio, LinkedIn, Instagram, Facebook) con hover effects
- `src/components/ui/BackButton.tsx` — botón liquid glass de retorno al OS
- Navegación interna con token `[NAVIGATE:/ruta]` → `router.push()` en `page.tsx`
- `src/config/system.prompt.ts` — instrucciones de navegación interna para SOFIAA

### Corregido
- **`"use client"` faltante** en las tres páginas nuevas → error "Event handlers cannot be passed to Client Component props"
- **`router.push()` dentro de `setMessages` updater** → error "Cannot update a component while rendering a different component". Fix: detectar token en `fullResponse` (string plano), limpiar estado en `setMessages` separado, navegar con `setTimeout(..., 50)` fuera del ciclo de render
- **`overflow: hidden` global** bloqueaba scroll en páginas internas → movido a clase `.sofiaa-root` aplicada solo al shell principal

---

## [Alpha 0.4] — Junio 2026 · Migración de modelos

### Cambiado
- **Modelo de chat**: `llama-3.3-70b-versatile` → `openai/gpt-oss-120b`  
  *Razón: llama-3.3-70b-versatile deprecado con shutdown programado en agosto 2026*
- **Modelo de memoria**: `llama-3.1-8b-instant` → `openai/gpt-oss-20b`  
  *Razón: mismo ciclo de deprecación*

### Corregido
- **Error de diagnóstico**: durante la migración se seleccionó accidentalmente `llama-3.1-70b-versatile` (ya decommissioned desde enero 2025). Corregido a `openai/gpt-oss-120b`.
- **Mensajes de error genéricos**: `route.ts` ahora propaga el error real de Groq al cliente con status code y body completo
- **`sentViaVoiceRef.current` no se reseteaba en error**: corregido para evitar que el siguiente mensaje de voz quede bloqueado

---

## [Alpha 0.3] — Junio 2026 · Fix de voz

### Corregido
- **Voz de salida rota** ("me escucha pero no habla"): `speakText()` se llamaba dentro del updater de `setMessages` (anti-patrón) y adicionalmente estaba en el bloque `catch` (posición incorrecta).
  - **Fix**: acumular respuesta completa en `fullResponse` (variable local durante el stream), llamar `speakText(fullResponse)` directamente después del loop `while` en el bloque `try`, con su propio `try/catch` para que errores de audio no rompan el chat

---

## [Alpha 0.2] — Junio 2026 · Sprint 2 (Personalidad JARVIS)

### Agregado
- Sistema de bienvenida con animación de typewriter (5 variantes rotativas)
- Quick Actions — 4 acciones rápidas contextuales en el estado vacío
- Prompt kernel expandido con protocolo cognitivo (RECEPCIÓN → COMPRENSIÓN → ANTICIPACIÓN → RESOLUCIÓN)
- Panel de administración (`AdminPanel.tsx`) con acceso por frase secreta "espada del augurio"
- Detección de frase secreta en cliente (`page.tsx`) sin exposición en API
- Input de voz con Web SpeechRecognition API
- Salida de voz con SpeechSynthesis API
- Ref `sentViaVoiceRef` para distinguir mensajes de voz vs texto
- Navegación externa con token `[NAVIGATE:https://...]` → `window.open()`
- `navigation.ts` — AUTH_WORD, DESTINATIONS, NAV_INSTRUCTIONS
- `orb.states.ts` — máquina de estados tipada del Orb

### Cambiado
- Modelo inicial `llama-3.3-70b-versatile` (deprecado, migrado en Alpha 0.4)

---

## [Alpha 0.1] — Junio 2026 · Fase 1 (Fundación)

### Agregado
- Proyecto Next.js 15 con App Router + TypeScript + Tailwind CSS v4
- `src/app/page.tsx` — shell principal del OS con estado de mensajes, streaming y Orb
- `src/app/api/chat/route.ts` — endpoint SSE hacia Groq API
- `src/app/api/memory/route.ts` — extracción de memoria de largo plazo con modelo ligero
- `src/config/system.prompt.ts` — primer kernel de personalidad de SOFIAA
- `src/components/orb/Orb.tsx` — Neural Orb con SVG animado, neuronas y conexiones dinámicas
- Tema visual liquid glass: `backdrop-filter`, `rgba`, gradientes pastel Apple
- `globals.css` con keyframes de animación (orbIdle, orbListening, orbThinking, orbResponding, neuronPulse, connPulse, waveExpand, cursorBlink)
- `localStorage` para memoria de sesión (`sofiaa_memory`) y largo plazo (`sofiaa_long_memory`)
- Streaming de respuestas con `ReadableStream` y `TextDecoder`
- `react-markdown` + `remark-gfm` para render de markdown en mensajes
- `src/core/` — stubs de engines cognitivos (context, decision, goal, intent) reservados para Fase 2

### Arquitectura
- Stack definido: Next.js 15 / Groq / Web Speech API / localStorage / Tailwind v4
- Patrón visual: liquid glass (backdropFilter + rgba + bordes blancos)
- Sistema de identidad: SOFIAA = IX-OS, no chatbot

---

## Registro de decisiones técnicas

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Groq API sobre OpenAI directa | OpenAI API | Latencia menor, pricing, compatibilidad de interface |
| localStorage sobre DB externa | Supabase / Firebase | Privacidad, sin cuenta requerida, velocidad de MVP |
| Web Speech API nativa | Librería externa (react-speech-recognition) | Cero dependencias, funciona offline |
| Tailwind v4 `@theme` inline | `tailwind.config.ts` | Requerido por Next.js 15 con Turbopack |
| App Router sobre Pages Router | Pages Router | Convención actual de Next.js 15, mejor soporte de streaming |
| Streaming SSE | Respuesta JSON completa | Percepción de velocidad — el usuario ve la respuesta mientras llega |
| `openai/gpt-oss-120b` sobre modelos Llama | Llama 3.3 70B | Modelos Llama deprecados en plataforma Groq (agosto 2026) |

---

*Mantenido por Abrahan Cruz Urrutia · SOFIAA LAB · Junio 2026*
