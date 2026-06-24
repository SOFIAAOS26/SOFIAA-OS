"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Route {
  path: string;
  label: string;
  icon?: string;
}

interface Props {
  routes: Route[];
  accentColor: string;
  accentBg: string;
}

export default function ExtHamburger({ routes, accentColor, accentBg }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="ext-hamburger-wrap">
      {/* Backdrop invisible — cierra al tocar fuera */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 90 }}
        />
      )}

      {/* Popup de navegación */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
            left: 16,
            zIndex: 95,
            background: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            borderRadius: 20,
            boxShadow:
              "0 12px 48px rgba(0,0,0,0.14), 0 0 0 1px rgba(255,255,255,0.85) inset",
            padding: "8px",
            minWidth: 210,
            transformOrigin: "bottom left",
            animation: "popIn 0.22s cubic-bezier(0.34,1.5,0.64,1) both",
          }}
        >
          {routes.map((route) => {
            const active = pathname === route.path;
            return (
              <Link
                key={route.path}
                href={route.path}
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "10px 14px",
                  borderRadius: 13,
                  textDecoration: "none",
                  color: active ? accentColor : "#2d2d3a",
                  background: active ? accentBg : "transparent",
                  fontWeight: active ? 700 : 400,
                  fontSize: 14,
                  letterSpacing: "-0.01em",
                  transition: "background 0.12s",
                }}
              >
                <span style={{ fontSize: 19, lineHeight: 1 }}>{route.icon}</span>
                {route.label}
                {active && (
                  <span
                    style={{
                      marginLeft: "auto",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: accentColor,
                      flexShrink: 0,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Botón hamburguesa flotante */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        style={{
          position: "fixed",
          bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          left: 16,
          zIndex: 96,
          width: 50,
          height: 50,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.95)",
          boxShadow: open
            ? `0 6px 28px rgba(0,0,0,0.16), 0 0 0 2px ${accentColor}55`
            : "0 4px 20px rgba(0,0,0,0.11)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: open ? 22 : 17,
          transition: "all 0.2s cubic-bezier(0.34,1.5,0.64,1)",
          transform: open ? "scale(1.08)" : "scale(1)",
          color: open ? accentColor : "#555",
        }}
      >
        {open ? "✕" : "☰"}
      </button>
    </div>
  );
}
