// ── Generative UI — tipos de componentes que SOFIAA puede renderizar en el chat

export interface QuickActionsBlock {
  type: "quick_actions";
  actions: { label: string; msg: string; icon?: string }[];
}

export interface InfoCardBlock {
  type: "info_card";
  icon: string;
  title: string;
  text: string;
  variant?: "default" | "success" | "warning" | "purple";
}

export interface ExtensionCardBlock {
  type: "extension_card";
  icon: string;
  name: string;
  desc: string;
  path: string;
}

export type UIBlock = QuickActionsBlock | InfoCardBlock | ExtensionCardBlock;

// ── Parser: extrae bloques [UI:tipo:json] del texto del modelo
export function parseUIBlocks(text: string): { clean: string; blocks: UIBlock[] } {
  const blocks: UIBlock[] = [];
  const clean = text.replace(/\[UI:([a-z_]+):(\{.*?\})\]/g, (_, type, jsonStr) => {
    try {
      const data = JSON.parse(jsonStr);
      blocks.push({ type, ...data } as UIBlock);
    } catch {
      // JSON inválido — ignorar
    }
    return "";
  }).trim();
  return { clean, blocks };
}
