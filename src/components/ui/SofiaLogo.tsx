"use client";

/**
 * SofiaLogo — Isotipo de SOFIAA
 * Diseñado por Abrahan Cruz Urrutia. Basado en la letra PHI y el hoyo negro de Interstellar.
 *
 * Usa el PNG original del isotipo (/sofiaa-isotipo.png) con glow Aurora animado.
 *
 * Props:
 *   size     — tamaño en px (default: 36)
 *   animated — pulso de glow Aurora (default: false)
 *   className
 */

interface SofiaLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export default function SofiaLogo({ size = 36, animated = false, className = "" }: SofiaLogoProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/sofiaa-isotipo.png"
        alt="SOFIAA isotipo"
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          filter: animated
            ? undefined
            : "drop-shadow(0 0 6px rgba(168,85,247,0.45)) drop-shadow(0 0 2px rgba(244,114,182,0.30))",
          animation: animated ? "sofiaGlow 3s ease-in-out infinite" : undefined,
        }}
      />
      {animated && (
        <style>{`
          @keyframes sofiaGlow {
            0%, 100% {
              filter:
                drop-shadow(0 0  6px rgba(168, 85, 247, 0.45))
                drop-shadow(0 0  2px rgba(244,114,182, 0.30));
            }
            50% {
              filter:
                drop-shadow(0 0 14px rgba(168, 85, 247, 0.80))
                drop-shadow(0 0  6px rgba(244,114,182, 0.55))
                drop-shadow(0 0 22px rgba( 96,165,250, 0.35));
            }
          }
        `}</style>
      )}
    </span>
  );
}
