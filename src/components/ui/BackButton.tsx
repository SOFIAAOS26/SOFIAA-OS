"use client";
import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        background: "rgba(255,255,255,0.65)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.9)",
        borderRadius: "999px",
        padding: "8px 18px",
        fontSize: "13px",
        fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
        fontWeight: 500,
        color: "rgba(0,0,0,0.55)",
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: "0 2px 12px rgba(100,100,200,0.07)",
      }}
      onMouseEnter={e => (e.currentTarget.style.color = "#4F7CFF")}
      onMouseLeave={e => (e.currentTarget.style.color = "rgba(0,0,0,0.55)")}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
      Volver a SOFIAA
    </button>
  );
}
