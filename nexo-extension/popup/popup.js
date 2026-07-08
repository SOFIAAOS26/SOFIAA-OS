/**
 * N.E.X.O. — Popup Logic (ES Module, Manifest V3)
 *
 * Auth: chrome.identity.getAuthToken → Firebase GoogleAuthProvider.credential
 * Capture: GET_PAGE_CONTEXT desde content script → POST /api/nexo/ingest
 */

import { initializeApp, getApps, getApp, getAuth, GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged } from "../lib/firebase-bundle.js";
import { FIREBASE_CONFIG, SOFIAA_API_URL } from "../lib/config.js";

// ── Firebase init ─────────────────────────────────────────────────────────────
const app  = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);

// ── DOM refs ──────────────────────────────────────────────────────────────────
const screenLogin   = document.getElementById("screen-login");
const screenCapture = document.getElementById("screen-capture");
const screenSuccess = document.getElementById("screen-success");

const btnLogin      = document.getElementById("btn-login");
const btnLogout     = document.getElementById("btn-logout");
const btnCapture    = document.getElementById("btn-capture");

const pageTitle     = document.getElementById("page-title");
const pageUrl       = document.getElementById("page-url");
const selectedEl    = document.getElementById("selected-preview");
const selectedText  = document.getElementById("selected-text");
const noteInput     = document.getElementById("note-input");
const toastEl       = document.getElementById("toast");

const userEmail     = document.getElementById("user-email");
const userAvatar    = document.getElementById("user-avatar");

const successSub    = document.getElementById("success-sub");
const successCat    = document.getElementById("success-category");

// ── State ─────────────────────────────────────────────────────────────────────
let currentUser  = null;
let pageContext  = null;
let idToken      = null;

// ── UI helpers ────────────────────────────────────────────────────────────────
function showScreen(name) {
  screenLogin.classList.add("hidden");
  screenCapture.classList.add("hidden");
  screenSuccess.classList.add("hidden");
  document.getElementById(`screen-${name}`).classList.remove("hidden");
}

function showToast(msg, type = "error") {
  toastEl.textContent = msg;
  toastEl.className = `toast ${type}`;
}

function clearToast() {
  toastEl.className = "toast";
}

function setCaptureBusy(busy) {
  if (busy) {
    btnCapture.innerHTML = '<span class="spinner"></span> Capturando...';
    btnCapture.disabled = true;
  } else {
    btnCapture.innerHTML = "⚡ Capturar";
    btnCapture.disabled = false;
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    idToken = await user.getIdToken(/* forceRefresh */ false);
    // Guardar token para service worker
    chrome.runtime.sendMessage({ type: "NEXO_SET_TOKEN", token: idToken });

    // Actualizar UI de usuario
    userEmail.textContent = user.email ?? "–";
    if (user.photoURL) {
      userAvatar.innerHTML = `<img src="${user.photoURL}" alt="avatar" />`;
    } else {
      userAvatar.textContent = (user.displayName?.[0] ?? user.email?.[0] ?? "?").toUpperCase();
    }

    showScreen("capture");
    loadPageContext();
  } else {
    chrome.runtime.sendMessage({ type: "NEXO_CLEAR_TOKEN" });
    showScreen("login");
  }
});

// Login con Google usando chrome.identity
btnLogin.addEventListener("click", async () => {
  btnLogin.disabled = true;
  btnLogin.textContent = "Conectando...";

  try {
    const token = await getChromeAuthToken();
    const credential = GoogleAuthProvider.credential(null, token);
    await signInWithCredential(auth, credential);
    // onAuthStateChanged se encarga del resto
  } catch (err) {
    console.error("[N.E.X.O.] Login error:", err);
    btnLogin.disabled = false;
    btnLogin.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.108 17.64 11.84 17.64 9.2z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
      Continuar con Google`;

    // Mostrar error en pantalla
    const errDiv = document.createElement("p");
    errDiv.style.cssText = "margin-top:12px;color:#F87171;font-size:11px;";
    errDiv.textContent = err.message?.includes("oauth2")
      ? "Configura el client_id en manifest.json"
      : "Error al iniciar sesión. Intenta de nuevo.";
    document.getElementById("screen-login").appendChild(errDiv);
  }
});

// Logout
btnLogout.addEventListener("click", async () => {
  await signOut(auth);
  showScreen("login");
});

function getChromeAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

// ── Page context ──────────────────────────────────────────────────────────────
async function loadPageContext() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  pageTitle.textContent = tab.title ?? "Sin título";
  pageUrl.textContent   = tab.url ?? "";

  // Intentar obtener contexto completo del content script
  try {
    const ctx = await sendToContentScript(tab.id, { type: "GET_PAGE_CONTEXT" });
    pageContext = { ...ctx, url: tab.url, title: tab.title ?? ctx.title };

    // Mostrar texto seleccionado si hay
    if (pageContext.selected) {
      selectedText.textContent = pageContext.selected;
      selectedEl.classList.remove("hidden");
    } else {
      selectedEl.classList.add("hidden");
    }
  } catch {
    // Content script no disponible (chrome://, about:, etc.)
    pageContext = { url: tab.url, title: tab.title, bodyText: "", selected: "" };
  }
}

function sendToContentScript(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (res) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(res);
    });
  });
}

// ── Capture ───────────────────────────────────────────────────────────────────
btnCapture.addEventListener("click", async () => {
  if (!currentUser || !pageContext) return;
  clearToast();
  setCaptureBusy(true);

  try {
    // Refrescar token si expiró
    idToken = await currentUser.getIdToken(false);

    const note = noteInput.value.trim();
    const text = [
      pageContext.selected,
      note,
      pageContext.description,
      pageContext.bodyText,
    ].filter(Boolean).join("\n\n").slice(0, 8000);

    const payload = {
      url:        pageContext.url ?? null,
      title:      pageContext.title ?? "Sin título",
      text:       text || pageContext.title,
      imageUrl:   pageContext.ogImage ?? undefined,
      source:     "chrome_extension",
      capturedAt: Date.now(),
    };

    const res = await fetch(`${SOFIAA_API_URL}/api/nexo/ingest`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error ?? `Error ${res.status}`);
    }

    const data = await res.json();

    // Mostrar éxito
    const catLabels = {
      food: "🍜 Comida", work: "💼 Trabajo", travel: "✈️ Viaje",
      shopping: "🛍️ Compras", research: "🔬 Investigación",
      social: "👥 Social", media: "🎬 Media", other: "📌 Otro",
    };
    successCat.textContent = catLabels[data.category] ?? data.category;
    successSub.innerHTML   = `SOFIAA ha guardado este contexto<br/>en tu grafo de memoria.`;
    showScreen("success");

    // Auto-cerrar en 2.5s
    setTimeout(() => window.close(), 2500);

  } catch (err) {
    console.error("[N.E.X.O.] Capture error:", err);
    showToast(err.message ?? "Error al capturar. Intenta de nuevo.");
    setCaptureBusy(false);
  }
});
