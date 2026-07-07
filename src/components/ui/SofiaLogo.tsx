"use client";

/**
 * SofiaLogo — Isotipo PHI de SOFIAA
 * Diseñado por Abrahan Cruz Urrutia. Basado en la letra griega PHI y el concepto de hoyo negro.
 *
 * Props:
 *   size     — tamaño en px (default: 36)
 *   animated — pulso suave en el orbe (default: false)
 *   className
 */

interface SofiaLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export default function SofiaLogo({ size = 36, animated = false, className = "" }: SofiaLogoProps) {
  const id = `sl-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className={className}
      aria-label="SOFIAA isotipo"
    >
      <defs>
        <linearGradient id={`${id}-pink`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F9A8D4" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>
        <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
        <linearGradient id={`${id}-aurora`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F9A8D4" />
          <stop offset="50%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
        <radialGradient id={`${id}-orb`} cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#F9A8D4" />
          <stop offset="55%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#7DD3FC" />
        </radialGradient>
      </defs>

      {/* Arco exterior izquierdo — rosa */}
      <path
        d="M 100 14 A 86 86 0 0 0 100 186"
        stroke={`url(#${id}-pink)`}
        strokeWidth="6.5"
        strokeLinecap="round"
      />

      {/* Arco exterior derecho — azul */}
      <path
        d="M 100 14 A 86 86 0 0 1 100 186"
        stroke={`url(#${id}-blue)`}
        strokeWidth="6.5"
        strokeLinecap="round"
      />

      {/* Bracket interior izquierdo */}
      <path
        d="M 100 56 A 30 30 0 0 0 100 144"
        stroke={`url(#${id}-pink)`}
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Bracket interior derecho */}
      <path
        d="M 100 56 A 30 30 0 0 1 100 144"
        stroke={`url(#${id}-blue)`}
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Eje vertical superior */}
      <line
        x1="100" y1="14" x2="100" y2="56"
        stroke={`url(#${id}-aurora)`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Eje vertical inferior */}
      <line
        x1="100" y1="144" x2="100" y2="186"
        stroke={`url(#${id}-aurora)`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Orbe nuclear */}
      <circle
        cx="100"
        cy="100"
        r="17"
        fill={`url(#${id}-orb)`}
        style={animated ? { animation: "orbPulse 3s ease-in-out infinite" } : undefined}
      />

      {animated && (
        <style>{`
          @keyframes orbPulse {
            0%, 100% { opacity: 0.85; r: 17; }
            50%       { opacity: 1;    r: 19; }
          }
        `}</style>
      )}
    </svg>
  );
}
