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

// ── N.E.X.O. Action Cards (Sprint N-5) ───────────────────────────────────────

export interface NexoRestaurantCard {
  type: "nexo_restaurant";
  title: string;
  summary: string;
  price?: string;
  place?: string;
  cuisine?: string;
  imageUrl?: string;
  url?: string;
}

export interface NexoArticleCard {
  type: "nexo_article";
  title: string;
  summary: string;
  source?: string;
  url?: string;
  readTime?: string;
}

export interface NexoProductCard {
  type: "nexo_product";
  title: string;
  summary: string;
  price?: string;
  brand?: string;
  imageUrl?: string;
  url?: string;
}

export interface NexoPlaceCard {
  type: "nexo_place";
  title: string;
  summary: string;
  place?: string;
  country?: string;
  imageUrl?: string;
  url?: string;
}

export interface NexoGenericCard {
  type: "nexo_generic";
  title: string;
  summary: string;
  category?: string;
  imageUrl?: string;
  url?: string;
}

export type NexoCard =
  | NexoRestaurantCard
  | NexoArticleCard
  | NexoProductCard
  | NexoPlaceCard
  | NexoGenericCard;

export type UIBlock = QuickActionsBlock | InfoCardBlock | ExtensionCardBlock | NexoCard;

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
