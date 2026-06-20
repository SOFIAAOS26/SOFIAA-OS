// SOFIAA — Experience Disclosure
// Lógica de revelación progresiva de elementos UI según el estado cognitivo
// Principio: mostrar solo lo necesario, cuando sea necesario. La UI respira.

import type { OrbState } from "@/components/orb/orb.states";

export interface DisclosureConfig {
  /** El input de texto es editable */
  inputEnabled: boolean;
  /** El botón de voz es visible */
  voiceVisible: boolean;
  /** El botón de enviar es visible */
  sendVisible: boolean;
  /** Mostrar indicador de estado bajo el orbe */
  showStateLabel: boolean;
  /** Opacidad general del área de chat (1 = visible, 0.4 = atenuado) */
  chatOpacity: number;
  /** Mostrar quick actions */
  quickActionsVisible: boolean;
  /** Etiqueta de estado para mostrar al usuario (si showStateLabel=true) */
  stateLabel: string;
  /** Color del label de estado */
  stateLabelColor: string;
}

export const DISCLOSURE_MAP: Record<OrbState, DisclosureConfig> = {
  idle: {
    inputEnabled:        true,
    voiceVisible:        true,
    sendVisible:         true,
    showStateLabel:      false,
    chatOpacity:         1,
    quickActionsVisible: true,
    stateLabel:          "",
    stateLabelColor:     "rgba(0,0,0,0.3)",
  },
  listening: {
    inputEnabled:        true,   // el usuario puede escribir — el orbe "escucha" visualmente
    voiceVisible:        true,
    sendVisible:         true,
    showStateLabel:      false,  // no mostrar label cuando es solo foco de texto
    chatOpacity:         1,
    quickActionsVisible: false,
    stateLabel:          "Escuchando…",
    stateLabelColor:     "#4F7CFF",
  },
  thinking: {
    inputEnabled:        false,
    voiceVisible:        false,
    sendVisible:         false,
    showStateLabel:      true,
    chatOpacity:         0.85,
    quickActionsVisible: false,
    stateLabel:          "Procesando…",
    stateLabelColor:     "#9B4FD9",
  },
  responding: {
    inputEnabled:        false,
    voiceVisible:        false,
    sendVisible:         false,
    showStateLabel:      false,
    chatOpacity:         1,
    quickActionsVisible: false,
    stateLabel:          "",
    stateLabelColor:     "#E91E8C",
  },
  cache_hit: {
    inputEnabled:        false,
    voiceVisible:        false,
    sendVisible:         false,
    showStateLabel:      true,
    chatOpacity:         1,
    quickActionsVisible: false,
    stateLabel:          "⚡ Respuesta instantánea",
    stateLabelColor:     "#00D2C8",
  },
  error: {
    inputEnabled:        true,
    voiceVisible:        true,
    sendVisible:         true,
    showStateLabel:      true,
    chatOpacity:         1,
    quickActionsVisible: false,
    stateLabel:          "Error de conexión — puedes reintentar",
    stateLabelColor:     "#FF503C",
  },
  success: {
    inputEnabled:        true,
    voiceVisible:        true,
    sendVisible:         true,
    showStateLabel:      true,
    chatOpacity:         1,
    quickActionsVisible: false,
    stateLabel:          "✓ Listo",
    stateLabelColor:     "#34C759",
  },
};

/** Retorna la configuración de disclosure para el estado actual */
export function getDisclosure(state: OrbState): DisclosureConfig {
  return DISCLOSURE_MAP[state] ?? DISCLOSURE_MAP.idle;
}
