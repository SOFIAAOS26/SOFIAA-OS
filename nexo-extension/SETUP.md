# N.E.X.O. Chrome Extension — Setup

## Pasos para activar

### 1. Google OAuth Client ID

1. Ve a [Google Cloud Console](https://console.cloud.google.com/) → el proyecto `sofiaa-tec-bi`
2. APIs & Services → Credentials → Create Credentials → **OAuth 2.0 Client ID**
3. Application type: **Chrome Extension**
4. En "Item ID" pega el ID de tu extensión (lo obtienes en el paso 3)
5. Copia el Client ID generado (termina en `.apps.googleusercontent.com`)
6. Pégalo en `manifest.json` → campo `oauth2.client_id`

### 2. Firebase API Key

1. Firebase Console → sofiaa-tec-bi → Project Settings → General → Your apps
2. Copia el valor de `apiKey`
3. Pégalo en `lib/config.js` → `FIREBASE_CONFIG.apiKey`

### 3. Instalar en Chrome

1. Abre Chrome → `chrome://extensions/`
2. Activa **Developer mode** (toggle arriba a la derecha)
3. Click **"Load unpacked"** → selecciona la carpeta `nexo-extension/`
4. Copia el **Extension ID** que aparece (formato: `abcdefghijklmnopqrstuvwxyzabcdef`)
5. Úsalo en el paso 1 para crear el OAuth Client ID

### 4. Firebase Authorized Domains

1. Firebase Console → Authentication → Settings → Authorized domains
2. Agrega: `chrome-extension://TU_EXTENSION_ID`

### 5. URL de producción

En `lib/config.js`, verifica que `SOFIAA_API_URL` apunte a tu deploy:
```js
export const SOFIAA_API_URL = "https://sofiaa-os.vercel.app"; // ajusta si es diferente
```

## Estructura
```
nexo-extension/
├── manifest.json          ← Manifest V3
├── lib/
│   └── config.js          ← Firebase config + API URL (editar aquí)
├── popup/
│   ├── popup.html         ← UI del popup
│   └── popup.js           ← Lógica: auth + captura
├── content/
│   └── content.js         ← Extrae contexto de la página
├── background/
│   └── service-worker.js  ← Gestión de tokens + badge
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## Flujo de captura

1. Usuario hace clic en el ícono de N.E.X.O. → popup abre
2. Si no está logueado → pantalla de login con Google
3. `chrome.identity.getAuthToken` obtiene token OAuth de Google
4. Firebase `signInWithCredential` convierte ese token a sesión Firebase
5. Popup muestra título + URL de la página activa
6. Si hay texto seleccionado en la página → se muestra en preview
7. Usuario puede añadir nota opcional
8. Clic en "Capturar" → POST a `/api/nexo/ingest` con Bearer token
9. SOFIAA confirma captura → pantalla de éxito → popup se cierra en 2.5s
