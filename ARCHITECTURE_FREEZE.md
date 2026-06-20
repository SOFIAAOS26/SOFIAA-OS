# SOFIAA — Architecture Freeze
**Versión Alpha · Junio 2026**

> Este documento congela el estado arquitectónico de SOFIAA al cierre de Fase 1 / Sprint 0.  
> Ningún módulo marcado como **CORE** debe modificarse sin revisión documentada y aprobación de Abrahan.

---

## Principio rector

SOFIAA es un **IX-OS** (Intelligent Experience Operating System), no un chatbot.  
Cada capa tiene una responsabilidad única. Las capas no se mezclan entre sí.

---

## Mapa de módulos

### 🔴 CORE — Intocables sin revisión

| Archivo | Responsabilidad | Razón del freeze |
|---|---|---|
| `src/app/page.tsx` | Shell principal del OS. Orquesta estado, voz, streaming y navegación. | Núcleo de la experiencia. Cambios aquí rompen todo. |
| `src/app/api/chat/route.ts` | Endpoint de streaming hacia Groq. Maneja modelos y SSE. | Cualquier cambio afecta latencia y estabilidad. |
| `src/app/api/memory/route.ts` | Extracción de memoria de largo plazo. Modelo separado. | Lógica de memoria crítica — cambios alteran el contexto de SOFIAA. |
| `src/config/system.prompt.ts` | Prompt kernel de personalidad y reglas de SOFIAA. | La identidad de SOFIAA vive aquí. Editar con extrema cautela. |
| `src/components/orb/Orb.tsx` | Neural Orb — SVG animado con neuronas y conexiones. | Visual signature del sistema. Refactor solo si hay rediseño aprobado. |
| `src/components/orb/orb.states.ts` | Máquina de estados del Orb (idle / listening / thinking / responding). | Contrato de estado entre UI y lógica. |

### 🟡 CONFIGURACIÓN — Modificable con cuidado

| Archivo | Responsabilidad | Regla |
|---|---|---|
| `src/config/navigation.ts` | AUTH_WORD, destinos externos, instrucciones de navegación. | Cambiar AUTH_WORD solo con aprobación explícita. |
| `src/config/metrics.config.ts` | Configuración de métricas futuras. | Reservado para Sprint 2.3. No instanciar aún. |
| `src/app/globals.css` | Variables de tema, keyframes, clase `.sofiaa-root`. | Solo agregar — no quitar keyframes existentes. |
| `src/app/layout.tsx` | Layout raíz de Next.js. Font Inter + body class. | Cambios afectan todas las rutas. |

### 🟢 EXTENSIBLE — Libre para agregar y modificar

| Archivo / Carpeta | Responsabilidad | Estado |
|---|---|---|
| `src/app/servicios/page.tsx` | Página pública de servicios (SOFIAA LAB / PASCALL / BERRYWORKS). | Activa. |
| `src/app/quienes-somos/page.tsx` | Página de equipo y perfil de Abrahan. | Activa. |
| `src/app/contacto/page.tsx` | Página de contacto con redes sociales. | Activa. |
| `src/components/admin/AdminPanel.tsx` | Panel de administración (acceso por frase secreta). | Extensible — se le agregarán métricas en Sprint 2.3. |
| `src/components/ui/` | Componentes UI reutilizables (BackButton, futuros). | Crecerá en sprints posteriores. |
| `src/core/` | Engines de intención, decisión, contexto y goal. | Stubs listos. Se activarán en Sprint 2.5–2.7. |

---

## Flujo de datos (read-only)

```
Usuario (voz / texto)
        ↓
    page.tsx  ←→  localStorage (memoria sesión + largo plazo)
        ↓
  /api/chat  →  Groq API (openai/gpt-oss-120b, streaming)
        ↓
  Orb state machine  →  UI feedback visual
        ↓
  [NAVIGATE:] token  →  router.push() / window.open()
        ↓
  /api/memory  →  Groq API (openai/gpt-oss-20b, extracción)
```

---

## Modelos activos

| Uso | Modelo | Proveedor |
|---|---|---|
| Chat principal | `openai/gpt-oss-120b` | Groq |
| Extracción de memoria | `openai/gpt-oss-20b` | Groq |

---

## Regla de modificación

Antes de tocar cualquier archivo **CORE**:
1. Abre un issue o nota en CHANGELOG_ALPHA.md describiendo el cambio.
2. Describe el riesgo y el plan de rollback.
3. Aprobación de Abrahan antes de implementar.
4. PR con un solo cambio funcional.

---

*Freeze establecido por Abrahan Cruz Urrutia · SOFIAA LAB · Junio 2026*
