"use client";

/**
 * N.E.X.O. — Biblioteca (Sprint M-1)
 *
 * Biblioteca de documentos PDF.
 * El usuario sube PDFs → Gemini los analiza → se crean NexoNodes.
 * SOFIAA integra el conocimiento en sus respuestas automáticamente.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { onAuthStateChanged, type User }             from "firebase/auth";
import { collection, onSnapshot, orderBy, query }   from "firebase/firestore";
import { auth, db }                                  from "@/lib/firebase";
import type { BibliotecaDoc }                        from "@/types/nexo";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(b: number): string {
  if (b < 1024)       return `${b} B`;
  if (b < 1048576)    return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function timeAgo(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 86_400_000);
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  return `hace ${d}d`;
}

// ── Doc card ─────────────────────────────────────────────────────────────────
function DocCard({
  doc,
  onDelete,
  deleting,
}: { doc: BibliotecaDoc; onDelete: () => void; deleting: boolean }) {
  const isProcessing = doc.status === "processing";
  const isError      = doc.status === "error";

  return (
    <div style={{
      background:   "rgba(255,255,255,0.03)",
      border:       `1px solid ${isError ? "rgba(248,113,113,0.25)" : "rgba(99,102,241,0.2)"}`,
      borderLeft:   `3px solid ${isError ? "#F87171" : isProcessing ? "#FBBF24" : "#818CF8"}`,
      borderRadius: 14, padding: "14px 16px",
      opacity:      deleting ? 0.4 : 1,
      transition:   "opacity 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Icono */}
        <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.2 }}>
          {isProcessing ? "⏳" : isError ? "❌" : "📄"}
        </span>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#E2D9F3",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {doc.title || doc.filename}
          </p>
          {doc.author && (
            <p style={{ margin: "0 0 4px", fontSize: 11, color: "rgba(226,217,243,0.45)" }}>
              {doc.author}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {isProcessing ? (
              <span style={{ fontSize: 10, color: "#FBBF24" }}>⚡ Procesando…</span>
            ) : isError ? (
              <span style={{ fontSize: 10, color: "#F87171" }}>⚠️ Error al procesar</span>
            ) : (
              <>
                <span style={{
                  fontSize: 10, padding: "2px 7px", borderRadius: 99,
                  background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.25)",
                  color: "#818CF8", fontWeight: 600,
                }}>
                  {doc.nodesCreated} nodos
                </span>
                <span style={{ fontSize: 10, color: "rgba(226,217,243,0.35)" }}>
                  {formatBytes(doc.sizeBytes)} · {timeAgo(doc.createdAt)}
                </span>
              </>
            )}
          </div>
          {isError && doc.errorMsg && (
            <p style={{
              margin: "4px 0 0", fontSize: 10, color: "rgba(248,113,113,0.6)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {doc.errorMsg.slice(0, 80)}
            </p>
          )}
        </div>

        {/* Botón borrar */}
        {!isProcessing && (
          <button
            onClick={onDelete}
            disabled={deleting}
            title="Eliminar documento"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(226,217,243,0.2)", fontSize: 14, padding: "2px 4px",
              transition: "color 0.15s", flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(226,217,243,0.2)")}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ── Drop zone ─────────────────────────────────────────────────────────────────
function DropZone({
  onFile,
  uploading,
}: { onFile: (f: File) => void; uploading: boolean }) {
  const [dragging, setDragging] = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") onFile(file);
  };

  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border:       `2px dashed ${dragging ? "#818CF8" : "rgba(129,140,248,0.25)"}`,
        borderRadius: 16, padding: "32px 20px",
        textAlign:    "center", cursor: uploading ? "default" : "pointer",
        background:   dragging ? "rgba(129,140,248,0.06)" : "rgba(255,255,255,0.02)",
        transition:   "all 0.2s",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <div style={{ fontSize: 36, marginBottom: 10 }}>
        {uploading ? "⏳" : "📚"}
      </div>
      <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#E2D9F3" }}>
        {uploading ? "Procesando con Gemini…" : "Sube un PDF"}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: "rgba(226,217,243,0.4)" }}>
        {uploading ? "Esto puede tardar 10-30 segundos" : "Arrastra aquí o toca para seleccionar · máx 9MB"}
      </p>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function BibliotecaPage() {
  const [user,     setUser]     = useState<User | null>(null);
  const [docs,     setDocs]     = useState<BibliotecaDoc[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  // Auth
  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      if (!u) setLoading(false);
    });
  }, []);

  // Suscripción Firestore — biblioteca
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const q = query(
      collection(db, "users", user.uid, "biblioteca"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      snap => {
        setDocs(snap.docs.map(d => d.data() as BibliotecaDoc));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [user]);

  // Subir PDF
  const handleFile = useCallback(async (file: File) => {
    if (!user || uploading) return;

    // Validación client-side: 9MB para dejar margen al límite de Vercel (4.5MB Hobby / ~10MB Pro)
    const MAX_CLIENT_MB = 9;
    if (file.size > MAX_CLIENT_MB * 1024 * 1024) {
      setUploadMsg({ type: "err", text: `El PDF supera el límite de ${MAX_CLIENT_MB}MB. Usa un documento más pequeño o divídelo en partes.` });
      setTimeout(() => setUploadMsg(null), 6000);
      return;
    }

    setUploading(true);
    setUploadMsg(null);

    try {
      const token    = await user.getIdToken();
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/nexo/pdf", {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });

      // Parsear respuesta de forma segura — el servidor puede devolver texto plano en errores 413/502
      let data: Record<string, unknown> = {};
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        if (res.status === 413) throw new Error("El PDF es demasiado grande para el servidor. Intenta con un documento menor a 4MB.");
        if (res.status === 504 || res.status === 502) throw new Error("El servidor tardó demasiado. Intenta con un PDF más pequeño.");
        throw new Error(text.slice(0, 120) || `Error del servidor (${res.status})`);
      }

      if (!res.ok || !data.success) {
        throw new Error((data.error as string) ?? "Error al procesar el PDF");
      }

      setUploadMsg({
        type: "ok",
        text: `✅ "${data.title}" procesado — ${data.nodesCreated} conceptos integrados en tu grafo`,
      });
    } catch (err) {
      setUploadMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadMsg(null), 8000);
    }
  }, [user, uploading]);

  // Borrar documento
  const handleDelete = useCallback(async (docId: string) => {
    if (!user) return;
    setDeleting(prev => new Set(prev).add(docId));
    try {
      const token = await user.getIdToken();
      await fetch(`/api/nexo/pdf?docId=${encodeURIComponent(docId)}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } finally {
      setDeleting(prev => { const s = new Set(prev); s.delete(docId); return s; });
    }
  }, [user]);

  // ── Estilos base ─────────────────────────────────────────────────────────
  const bg = "linear-gradient(145deg, #0F0B1E 0%, #1A0F2E 55%, #0F1628 100%)";
  const ff = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  // ── Sin auth ──────────────────────────────────────────────────────────────
  if (!user && !loading) {
    return (
      <div style={{ minHeight: "100dvh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff, color: "#E2D9F3" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
          <p style={{ fontSize: 15 }}>Inicia sesión para acceder a tu biblioteca</p>
        </div>
      </div>
    );
  }

  const totalNodes = docs.reduce((s, d) => s + (d.nodesCreated ?? 0), 0);

  return (
    <div style={{ minHeight: "100dvh", background: bg, fontFamily: ff, color: "#E2D9F3" }}>
      {/* Header */}
      <div style={{
        padding:        "20px 20px 16px",
        borderBottom:   "1px solid rgba(129,140,248,0.12)",
        position:       "sticky", top: 0, zIndex: 10,
        background:     "rgba(15,11,30,0.85)", backdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 600, margin: "0 auto" }}>
          <span style={{ fontSize: 22 }}>📚</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Biblioteca</h1>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(226,217,243,0.4)" }}>
              N.E.X.O. · Documentos PDF
            </p>
          </div>
          {totalNodes > 0 && (
            <div style={{
              marginLeft: "auto", padding: "5px 12px", borderRadius: 99,
              background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.2)",
              fontSize: 11, color: "#818CF8", fontWeight: 600,
            }}>
              {totalNodes} nodos aprendidos
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px 48px" }}>

        {/* Drop zone */}
        <div style={{ marginBottom: 20 }}>
          <DropZone onFile={handleFile} uploading={uploading} />
        </div>

        {/* Mensaje de resultado */}
        {uploadMsg && (
          <div style={{
            marginBottom: 16, padding: "12px 16px", borderRadius: 12,
            background:   uploadMsg.type === "ok" ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
            border:       `1px solid ${uploadMsg.type === "ok" ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}`,
            color:        uploadMsg.type === "ok" ? "#34D399" : "#F87171",
            fontSize:     13, lineHeight: 1.5,
          }}>
            {uploadMsg.text}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(226,217,243,0.4)" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📚</div>
            <p style={{ fontSize: 13 }}>Cargando biblioteca…</p>
          </div>
        )}

        {/* Empty */}
        {!loading && docs.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 20px" }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600 }}>Tu biblioteca está vacía</p>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(226,217,243,0.45)", lineHeight: 1.6 }}>
              Sube libros, artículos o papers en PDF.<br />
              SOFIAA los lee, aprende y los integra en sus respuestas.
            </p>
          </div>
        )}

        {/* Lista de documentos */}
        {!loading && docs.length > 0 && (
          <>
            <p style={{ margin: "0 0 12px", fontSize: 11, color: "rgba(226,217,243,0.3)", letterSpacing: "0.06em", fontWeight: 700 }}>
              DOCUMENTOS ({docs.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {docs.map(doc => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  onDelete={() => handleDelete(doc.id)}
                  deleting={deleting.has(doc.id)}
                />
              ))}
            </div>
          </>
        )}

        {/* Info */}
        {!loading && docs.length > 0 && (
          <p style={{
            marginTop: 24, textAlign: "center", fontSize: 11,
            color: "rgba(226,217,243,0.22)", lineHeight: 1.6,
          }}>
            Los conceptos extraídos de tus documentos aparecen en Mi Grafo<br />
            y se integran automáticamente en las respuestas de SOFIAA.
          </p>
        )}
      </div>
    </div>
  );
}
