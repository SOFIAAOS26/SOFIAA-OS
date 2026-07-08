"use client";

/**
 * N.E.X.O. — PWA Share Target
 * Sprint N-6
 *
 * El OS mobile redirige aquí cuando el usuario comparte un link/texto a SOFIAA.
 * Configurado en /public/manifest.json → share_target.action: "/nexo/share"
 *
 * Parámetros GET:
 *   ?title=...&text=...&url=...
 */

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

// ── Estados ───────────────────────────────────────────────────────────────────
type Status = "loading" | "unauthenticated" | "ready" | "capturing" | "success" | "error";

// ── Share page interior (necesita useSearchParams → Suspense) ─────────────────
function SharePageInner() {
  const params   = useSearchParams();
  const router   = useRouter();

  const sharedTitle = params.get("title") ?? "";
  const sharedText  = params.get("text")  ?? "";
  const sharedUrl   = params.get("url")   ?? "";

  const [user,   setUser]   = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [note,   setNote]   = useState("");
  const [result, setResult] = useState<{ category: string; summary: string } | null>(null);
  const [errMsg, setErrMsg] = useState("");

  // ── Auth listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setStatus(u ? "ready" : "unauthenticated");
    });
    return unsub;
  }, []);

  // ── Capturar ──────────────────────────────────────────────────────────────
  async function handleCapture() {
    if (!user) return;
    setStatus("capturing");
    setErrMsg("");

    try {
      const token = await user.getIdToken();
      const text  = [sharedText, note, sharedTitle].filter(Boolean).join("\n\n");

      const res = await fetch("/api/nexo/ingest", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          url:        sharedUrl  || null,
          title:      sharedTitle || sharedText.slice(0, 100) || "Captura desde móvil",
          text:       text || sharedUrl || "Sin contenido",
          source:     "pwa_share",
          capturedAt: Date.now(),
        }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(e.error ?? "Error al capturar");
      }

      const data = await res.json();
      setResult({ category: data.category, summary: data.summary });
      setStatus("success");

      // Volver al chat después de 2.5s
      setTimeout(() => router.replace("/"), 2500);

    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Error desconocido");
      setStatus("error");
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  const displayTitle = sharedTitle || sharedUrl || "Contenido compartido";
  const displayUrl   = sharedUrl || sharedText;

  const CAT_LABELS: Record<string, string> = {
    food: "🍜 Comida", work: "💼 Trabajo", travel: "✈️ Viaje",
    shopping: "🛍️ Compras", research: "🔬 Investigación",
    social: "👥 Social", media: "🎬 Media", other: "📌 Otro",
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(145deg, #0F0B1E 0%, #1A0F2E 55%, #0F1628 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 20px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: "#E2D9F3",
    }}>

      {/* Logo */}
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sofiaa-isotipo.png"
          alt="N.E.X.O."
          width={52}
          height={52}
          style={{ filter: "drop-shadow(0 0 12px rgba(168,85,247,0.6))", marginBottom: 8 }}
        />
        <div style={{
          fontSize: 13, fontWeight: 700, letterSpacing: "0.12em",
          background: "linear-gradient(90deg, #F472B6, #A855F7, #60A5FA)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>N.E.X.O.</div>
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 400,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(168,85,247,0.2)",
        borderRadius: 20, padding: "24px 20px",
        backdropFilter: "blur(20px)",
      }}>

        {/* LOADING */}
        {status === "loading" && (
          <div style={{ textAlign: "center", color: "rgba(226,217,243,0.5)" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
            <p style={{ margin: 0, fontSize: 14 }}>Verificando sesión...</p>
          </div>
        )}

        {/* UNAUTHENTICATED */}
        {status === "unauthenticated" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🔐</div>
            <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Necesitas iniciar sesión</p>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "rgba(226,217,243,0.55)", lineHeight: 1.5 }}>
              Abre SOFIAA en tu navegador, inicia sesión y vuelve a compartir.
            </p>
            <button
              onClick={() => router.replace("/")}
              style={{
                width: "100%", padding: "12px",
                borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #F472B6, #A855F7)",
                color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              Ir a SOFIAA
            </button>
          </div>
        )}

        {/* READY */}
        {(status === "ready" || status === "error") && (
          <>
            <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, color: "rgba(168,85,247,0.8)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Capturar con N.E.X.O.
            </p>

            {/* Preview del contenido compartido */}
            <div style={{
              background: "rgba(168,85,247,0.06)",
              border: "1px solid rgba(168,85,247,0.15)",
              borderRadius: 12, padding: "12px 14px", marginBottom: 14,
            }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "#E2D9F3", lineHeight: 1.4,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {displayTitle}
              </p>
              {displayUrl && (
                <p style={{ margin: 0, fontSize: 11, color: "rgba(226,217,243,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {displayUrl}
                </p>
              )}
            </div>

            {/* Nota opcional */}
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Añade una nota (opcional)..."
              rows={3}
              style={{
                width: "100%", padding: "10px 12px",
                borderRadius: 10, border: "1px solid rgba(168,85,247,0.2)",
                background: "rgba(168,85,247,0.05)",
                color: "#E2D9F3", fontSize: 13, resize: "none",
                outline: "none", fontFamily: "inherit",
                boxSizing: "border-box", marginBottom: 14,
              }}
            />

            {status === "error" && (
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#F87171", textAlign: "center" }}>
                {errMsg}
              </p>
            )}

            <button
              onClick={handleCapture}
              style={{
                width: "100%", padding: "13px",
                borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #F472B6, #A855F7)",
                color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.02em",
              }}
            >
              ⚡ Capturar
            </button>
          </>
        )}

        {/* CAPTURING */}
        {status === "capturing" && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{
              width: 36, height: 36, margin: "0 auto 12px",
              border: "3px solid rgba(168,85,247,0.3)",
              borderTopColor: "#A855F7",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ margin: 0, fontSize: 14, color: "rgba(226,217,243,0.7)" }}>
              SOFIAA está procesando...
            </p>
          </div>
        )}

        {/* SUCCESS */}
        {status === "success" && result && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>⚡</div>
            <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#A855F7" }}>
              ¡Capturado!
            </p>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "rgba(226,217,243,0.6)", lineHeight: 1.5 }}>
              {result.summary}
            </p>
            <span style={{
              display: "inline-block", padding: "4px 12px",
              borderRadius: 99, fontSize: 12, fontWeight: 600,
              background: "rgba(168,85,247,0.15)",
              border: "1px solid rgba(168,85,247,0.3)",
              color: "#A855F7",
            }}>
              {CAT_LABELS[result.category] ?? result.category}
            </span>
            <p style={{ margin: "14px 0 0", fontSize: 12, color: "rgba(226,217,243,0.35)" }}>
              Volviendo al chat...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Export con Suspense boundary (requerido por useSearchParams) ──────────────
export default function NexoSharePage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100dvh",
        background: "linear-gradient(145deg, #0F0B1E 0%, #1A0F2E 55%, #0F1628 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "rgba(226,217,243,0.5)", fontFamily: "system-ui",
      }}>
        ⚡
      </div>
    }>
      <SharePageInner />
    </Suspense>
  );
}
