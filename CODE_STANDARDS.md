# SOFIAA — Code Standards
**Versión Alpha · Junio 2026**

> Convenciones obligatorias para todo código nuevo en el proyecto SOFIAA.  
> El objetivo es que cualquier colaborador entienda la arquitectura en menos de 15 minutos.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript estricto |
| Estilos | Tailwind CSS v4 (`@theme` inline — sin `tailwind.config.ts`) |
| IA | Groq API (compatible OpenAI) con streaming SSE |
| Voz | Web Speech API nativa (SpeechRecognition + SpeechSynthesis) |
| Markdown | react-markdown + remark-gfm |
| Estado | React hooks + localStorage (sin Redux, sin Zustand) |

---

## Nomenclatura de archivos

| Tipo | Convención | Ejemplo |
|---|---|---|
| Página Next.js | `kebab-case/page.tsx` | `quienes-somos/page.tsx` |
| Componente React | `PascalCase.tsx` | `AdminPanel.tsx` |
| Engine / lógica | `kebab-case.engine.ts` | `intent.engine.ts` |
| Configuración | `kebab-case.config.ts` o `kebab-case.ts` | `metrics.config.ts` |
| Estados / tipos | `kebab-case.states.ts` | `orb.states.ts` |
| Hooks React | `useCamelCase.ts` | `useSofiaaTelemetry.ts` |
| API routes | `src/app/api/[nombre]/route.ts` | `api/chat/route.ts` |

---

## Nomenclatura de variables y funciones

```ts
// ✅ Correcto
const orbState = useState<OrbState>("idle");
const sentViaVoiceRef = useRef(false);
async function sendMessage() { ... }
export const SOFIAA_PROMPT_KERNEL = `...`;

// ❌ Evitar
const s = useState(...);          // nombres sin semántica
function handleStuff() { ... }   // verbos genéricos
const MyConst = "...";           // PascalCase en constantes no-componente
```

---

## Estructura de carpetas

```
src/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── chat/route.ts   # Endpoint de streaming
│   │   └── memory/route.ts # Extracción de memoria
│   ├── contacto/page.tsx
│   ├── quienes-somos/page.tsx
│   ├── servicios/page.tsx
│   ├── globals.css         # Tema global + keyframes
│   ├── layout.tsx          # Layout raíz
│   └── page.tsx            # Shell principal del OS
├── components/
│   ├── admin/              # Panel de administración
│   ├── orb/                # Neural Orb + estados
│   └── ui/                 # Componentes reutilizables
├── config/                 # Configuración y prompts
│   ├── navigation.ts       # Rutas + auth word
│   ├── metrics.config.ts   # Config de métricas (Sprint 2.3)
│   └── system.prompt.ts    # Prompt kernel de SOFIAA
└── core/                   # Engines cognitivos (Sprint 2.5–2.7)
    ├── context.engine.ts
    ├── decision.engine.ts
    ├── goal.engine.ts
    └── intent.engine.ts
```

---

## Componentes React

### Directiva `"use client"`
**Obligatoria** en cualquier componente que use:
- `useState`, `useRef`, `useEffect`, `useRouter`
- Event handlers (`onClick`, `onMouseEnter`, etc.)
- Web APIs (`localStorage`, `SpeechSynthesis`, etc.)

Las páginas del App Router son Server Components por defecto — no asumir que tienen acceso al DOM.

### Props e interfaces
```ts
// Definir interfaces en el mismo archivo si son locales
interface Message {
  role: "user" | "assistant";
  content: string;
}

// Exportar si se reutilizan entre archivos
export type OrbState = "idle" | "listening" | "thinking" | "responding";
```

---

## Estado y side effects

### Regla de oro
**Nunca ejecutar side effects dentro de un updater de `setState`.**

```ts
// ❌ Anti-patrón — router.push dentro de setMessages
setMessages((prev) => {
  router.push("/servicios"); // ← ROMPE React
  return [...prev];
});

// ✅ Correcto — side effect fuera del updater
const navMatch = fullResponse.match(/\[NAVIGATE:([^\]]+)\]/);
if (navMatch) {
  setMessages((prev) => cleanContent(prev)); // solo estado
  setTimeout(() => router.push(navMatch[1]), 50); // side effect separado
}
```

### localStorage
| Clave | Contenido | Scope |
|---|---|---|
| `sofiaa_memory` | Memoria de sesión (últimas interacciones) | Sesión actual |
| `sofiaa_long_memory` | Perfil de largo plazo del usuario | Persistente |

---

## API Routes

### Streaming SSE
```ts
// Siempre usar ReadableStream para respuestas de chat
return new Response(stream, {
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache",
  },
});
```

### Manejo de errores
```ts
// Loguear el error real en servidor, devolver mensaje descriptivo al cliente
console.error("Groq API Error:", response.status, errorText);
return new Response(JSON.stringify({ error: `Groq ${response.status}: ${errorText}` }), {
  status: 500,
});
```

---

## Estilos

### Tailwind v4
- Usar `@theme inline` en `globals.css` — no existe `tailwind.config.ts`
- Variables de color: `--color-sofiaa-blue: #4F7CFF`, etc.
- Keyframes de animación: definidos en `globals.css` con `@keyframes`

### Liquid Glass (patrón visual del OS)
```ts
const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.9)",
  boxShadow: "0 4px 24px rgba(100,100,200,0.07)",
  borderRadius: "24px",
};
```
Este patrón es el lenguaje visual del sistema. Aplicar en todas las tarjetas y contenedores de las páginas internas.

---

## Navegación

### Token `[NAVIGATE:]`
SOFIAA navega usando tokens que incluye en sus respuestas:
- **Interno:** `[NAVIGATE:/ruta]` → `router.push("/ruta")`
- **Externo:** `[NAVIGATE:https://...]` → `window.open(..., "_blank")`

El token debe ir al final de la respuesta, en su propia línea, y se elimina del mensaje visible antes de mostrarlo al usuario.

### Rutas activas
| Ruta | Página |
|---|---|
| `/` | Shell principal de SOFIAA |
| `/servicios` | SOFIAA LAB, PASCALL, BERRYWORKS |
| `/quienes-somos` | Perfil de Abrahan y equipo |
| `/contacto` | Redes sociales y disponibilidad |

---

## Seguridad

- **API keys**: solo en `.env.local` (gitignoreado). Nunca en código fuente ni en chat.
- **AUTH_WORD** (`freepotamo`): nunca revelar en logs, UI ni conversación.
- **Frase secreta de admin** (`espada del augurio`): detección solo en cliente, sin exposición.

---

*Estándares definidos por Abrahan Cruz Urrutia · SOFIAA LAB · Junio 2026*
