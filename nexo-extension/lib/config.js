/**
 * N.E.X.O. Chrome Extension — Configuración central
 *
 * SETUP:
 *  1. SOFIAA_API_URL → URL de tu deploy en Vercel (ej: https://sofiaa-os.vercel.app)
 *  2. FIREBASE_CONFIG → copiar de Firebase Console (Project Settings → General → Your apps)
 *  3. GOOGLE_CLIENT_ID → Google Cloud Console → APIs & Credentials → OAuth 2.0 Client ID
 *     (tipo "Chrome Extension", con tu extension ID)
 */

export const SOFIAA_API_URL = "https://sofiaa-os.vercel.app"; // ← cambiar si tu URL es diferente

export const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCJET-4tYUAA8JAx6XIZ308n8bYxR7jzPo",
  authDomain:        "sofiaa-tec-bi.firebaseapp.com",
  projectId:         "sofiaa-tec-bi",
  storageBucket:     "sofiaa-tec-bi.firebasestorage.app",
  messagingSenderId: "533078710354",
  appId:             "1:533078710354:web:c2b110f719822c0a15e78b",
};

export const NEXO_VERSION = "0.1.0";
