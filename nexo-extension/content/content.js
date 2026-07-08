/**
 * N.E.X.O. — Content Script
 *
 * Inyectado en cada página. Extrae:
 * - Texto seleccionado por el usuario
 * - Meta description / og:description
 * - og:image para captura visual
 * - Texto visible relevante (primeros 2000 chars del body)
 */

// Responder a mensajes del popup (via service worker)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_SELECTED_TEXT") {
    const selected = window.getSelection()?.toString().trim() ?? "";
    sendResponse({ text: selected });
    return true;
  }

  if (message.type === "GET_PAGE_CONTEXT") {
    sendResponse(extractPageContext());
    return true;
  }
});

function extractPageContext() {
  const selected = window.getSelection()?.toString().trim() ?? "";

  // Meta tags
  const metaDesc =
    document.querySelector('meta[name="description"]')?.getAttribute("content") ??
    document.querySelector('meta[property="og:description"]')?.getAttribute("content") ??
    "";

  const ogImage =
    document.querySelector('meta[property="og:image"]')?.getAttribute("content") ??
    "";

  const ogTitle =
    document.querySelector('meta[property="og:title"]')?.getAttribute("content") ??
    "";

  // Texto del body (limpio, primeros 2000 chars)
  const bodyText = extractBodyText();

  // Precio si lo hay (heurística simple)
  const price = extractPrice();

  return {
    url:         window.location.href,
    title:       ogTitle || document.title,
    selected,
    description: metaDesc,
    ogImage,
    bodyText:    selected || metaDesc || bodyText,
    price,
  };
}

function extractBodyText() {
  // Clonar para no afectar el DOM real
  const clone = document.body.cloneNode(true);

  // Eliminar scripts, styles, nav, footer
  ["script", "style", "nav", "footer", "header", "aside"].forEach((tag) => {
    clone.querySelectorAll(tag).forEach((el) => el.remove());
  });

  return (clone.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

function extractPrice() {
  // Busca patrones de precio comunes
  const text = document.body.innerText;
  const match = text.match(/\$\s?[\d,]+(\.\d{2})?|MXN\s?[\d,]+/);
  return match ? match[0].trim() : null;
}
