"use client";

import { OrbState, ORB_STATES } from "./orb.states";

interface OrbProps {
  state: OrbState;
}

export default function Orb({ state }: OrbProps) {
  const config = ORB_STATES[state];

  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-700"
        style={{ boxShadow: config.glowIntensity }}
      />

      {/* Main orb */}
      <div
        className={`relative w-28 h-28 rounded-full ${config.animation} transition-all duration-500`}
        style={{
          background:
            "radial-gradient(circle at 35% 35%, #7AA3FF, #4F7CFF 50%, #1A3A8F)",
          boxShadow: `0 0 30px rgba(79,124,255,0.4), inset 0 0 20px rgba(255,255,255,0.1)`,
        }}
      >
        {/* Inner highlight */}
        <div
          className="absolute top-4 left-5 w-5 h-5 rounded-full opacity-70"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 70%)",
          }}
        />
      </div>
    </div>
  );
}
