/**
 * N.E.X.O. — Service Worker (Manifest V3)
 *
 * Responsabilidades:
 * - Manejo de mensajes entre popup y content scripts
 * - Caché del token de Firebase en chrome.storage
 * - Badge de estado de la extensión
 */

// ── Listeners ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    console.log("[N.E.X.O.] Extension instalada — v0.1.0");
  }
});

// Relay de mensajes entre popup y content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "NEXO_GET_SELECTED_TEXT") {
    // Forwarded desde popup al content script de la tab activa
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return sendResponse({ text: "" });

      chrome.tabs.sendMessage(tab.id, { type: "GET_SELECTED_TEXT" }, (res) => {
        sendResponse(res ?? { text: "" });
      });
    });
    return true; // async
  }

  if (message.type === "NEXO_SET_TOKEN") {
    chrome.storage.local.set({ nexo_firebase_token: message.token }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "NEXO_GET_TOKEN") {
    chrome.storage.local.get("nexo_firebase_token", (result) => {
      sendResponse({ token: result.nexo_firebase_token ?? null });
    });
    return true;
  }

  if (message.type === "NEXO_CLEAR_TOKEN") {
    chrome.storage.local.remove("nexo_firebase_token", () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});

// Badge visual: verde = autenticado, gris = sin sesión
chrome.storage.local.get("nexo_firebase_token", ({ nexo_firebase_token }) => {
  updateBadge(!!nexo_firebase_token);
});

chrome.storage.onChanged.addListener((changes) => {
  if ("nexo_firebase_token" in changes) {
    updateBadge(!!changes.nexo_firebase_token.newValue);
  }
});

function updateBadge(authenticated) {
  chrome.action.setBadgeText({ text: authenticated ? "●" : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#A855F7" });
}
