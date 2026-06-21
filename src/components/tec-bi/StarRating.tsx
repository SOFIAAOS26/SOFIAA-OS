"use client";

import { useState } from "react";

interface Props {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: number;
}

export default function StarRating({ value, onChange, readonly = false, size = 22 }: Props) {
  const [hover, setHover] = useState(0);

  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hover || value) >= star;
        return (
          <span
            key={star}
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
            style={{
              fontSize: size,
              cursor: readonly ? "default" : "pointer",
              color: filled ? "#FF9F0A" : "#E0E0E0",
              transition: "color 0.1s",
              lineHeight: 1,
              userSelect: "none",
            }}
          >
            ★
          </span>
        );
      })}
      {!readonly && (
        <span style={{ fontSize: 12, color: "#888", marginLeft: 6, alignSelf: "center" }}>
          {value > 0 ? ["", "Deficiente", "Regular", "Bueno", "Muy bueno", "Excelente"][value] : "Sin calificar"}
        </span>
      )}
    </div>
  );
}
