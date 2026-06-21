"use client";

/**
 * Skeleton — placeholders animados para estados de carga.
 *
 * Uso:
 *   <SkeletonCard />               → tarjeta KPI
 *   <SkeletonRow columns={5} />    → fila de tabla
 *   <SkeletonTable rows={4} cols={5} />  → tabla completa
 *   <SkeletonText width="60%" />   → línea de texto
 */

const SHIMMER = `
  @keyframes tbi-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
`;

const shimmerStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e8f0 50%, #f0f0f0 75%)",
  backgroundSize: "800px 100%",
  animation: "tbi-shimmer 1.4s ease-in-out infinite",
  borderRadius: 8,
};

function InjectKeyframes() {
  return <style>{SHIMMER}</style>;
}

/* ── Primitivo ─────────────────────────────────────────────────── */
export function SkeletonBox({
  width = "100%",
  height = 16,
  style,
}: {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}) {
  return (
    <>
      <InjectKeyframes />
      <div style={{ width, height, ...shimmerStyle, ...style }} />
    </>
  );
}

/* ── Línea de texto ─────────────────────────────────────────────── */
export function SkeletonText({ width = "80%" }: { width?: string }) {
  return <SkeletonBox width={width} height={14} style={{ borderRadius: 6 }} />;
}

/* ── Tarjeta KPI ────────────────────────────────────────────────── */
export function SkeletonCard() {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(14,165,233,0.12)",
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <SkeletonBox width={32} height={32} style={{ borderRadius: 99 }} />
      <SkeletonBox width="50%" height={28} />
      <SkeletonText width="70%" />
    </div>
  );
}

/* ── Grid de KPI cards ──────────────────────────────────────────── */
export function SkeletonKPIGrid({ count = 4 }: { count?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 16,
        marginBottom: 32,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/* ── Fila de tabla ──────────────────────────────────────────────── */
export function SkeletonRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} style={{ padding: "12px 12px" }}>
          <SkeletonBox
            width={i === 0 ? "80%" : i === columns - 1 ? "50%" : "65%"}
            height={13}
          />
        </td>
      ))}
    </tr>
  );
}

/* ── Tabla completa ─────────────────────────────────────────────── */
export function SkeletonTable({
  rows = 5,
  cols = 5,
  headers,
}: {
  rows?: number;
  cols?: number;
  headers?: string[];
}) {
  const colCount = headers?.length ?? cols;
  return (
    <>
      <InjectKeyframes />
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          {headers && (
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(14,165,233,0.15)" }}>
                {headers.map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#bbb",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <SkeletonRow key={i} columns={colCount} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
