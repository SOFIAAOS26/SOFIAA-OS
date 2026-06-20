// SOFIAA — Orb Controller
// Gestiona transiciones de estado del orbe con:
// - Auto-retorno a idle para estados transitorios
// - Prevención de transiciones conflictivas
// - Sincronización con el estado cognitivo real del sistema

import { ORB_STATES, type OrbState } from "./orb.states";

type SetOrbState = (state: OrbState) => void;

export class OrbController {
  private _setOrbState: SetOrbState;
  private _current: OrbState = "idle";
  private _timer: ReturnType<typeof setTimeout> | null = null;

  constructor(setOrbState: SetOrbState) {
    this._setOrbState = setOrbState;
  }

  get current(): OrbState {
    return this._current;
  }

  /**
   * Transiciona el orbe a un nuevo estado.
   * Si el estado es transitorio, programa el retorno automático a idle.
   */
  transition(next: OrbState): void {
    // Cancelar timer previo si existe
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    this._current = next;
    this._setOrbState(next);

    const cfg = ORB_STATES[next];
    if (cfg.transient && cfg.transientDuration) {
      this._timer = setTimeout(() => {
        this._current = "idle";
        this._setOrbState("idle");
        this._timer = null;
      }, cfg.transientDuration);
    }
  }

  /**
   * Secuencia: thinking → responding → idle (después de N ms)
   * Para el flujo de respuesta del modelo.
   */
  startResponse(): void {
    this.transition("responding");
  }

  finishResponse(delayMs = 1800): void {
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._current = "idle";
      this._setOrbState("idle");
      this._timer = null;
    }, delayMs);
  }

  /** Flash de cache hit — cian breve */
  flashCacheHit(): void {
    this.transition("cache_hit");
  }

  /** Estado de error — rojo pulsante que vuelve a idle */
  showError(): void {
    this.transition("error");
  }

  /** Flash de éxito — verde breve */
  flashSuccess(): void {
    this.transition("success");
  }

  destroy(): void {
    if (this._timer) clearTimeout(this._timer);
  }
}
