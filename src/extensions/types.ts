/**
 * SEE — SOFIAA Extension Ecosystem
 * Defines the contract every extension must implement.
 */

export interface SofiaExtension {
  /** Unique identifier, e.g. "tec-bi" */
  id: string;
  /** Human-readable name shown in the UI */
  name: string;
  /** Short description for the extension badge tooltip */
  description: string;
  /** Base route prefix, e.g. "/tec-bi" */
  baseRoute: string;
  /** All routes this extension registers */
  routes: ExtensionRoute[];
  /**
   * Text block injected into SOFIAA's system prompt when the
   * extension is active. Keep it concise — it costs tokens.
   */
  contextBlock: string;
  /** Visual theming when extension is active */
  theme: ExtensionTheme;
  /** Phrases SOFIAA recognizes to activate this extension */
  activationPhrases: string[];
}

export interface ExtensionRoute {
  path: string;
  label: string;
  icon?: string;
}

export interface ExtensionTheme {
  /** CSS gradient for the app background override */
  backgroundGradient: string;
  /** Accent color for borders and highlights */
  accentColor: string;
  /** Badge label shown next to "SOFIAA" in the header */
  badgeLabel: string;
  /** Badge background color */
  badgeColor: string;
}
