"use client";

import { useState } from "react";
import logoAsset from "@/assets/logo.png";

interface BrandLogoProps {
  height?: number;
  className?: string;
  decorative?: boolean;
}

export function BrandLogo({
  height = 26,
  className = "",
  decorative = false,
}: BrandLogoProps) {
  const [useSvgFallback, setUseSvgFallback] = useState(false);

  if (useSvgFallback) {
    const width = Math.round(height * 5.6);
    return (
      <svg
        viewBox="0 0 280 50"
        width={width}
        height={height}
        className={`w-auto max-w-full ${className}`}
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : "Gerencial — Governança Condominial"}
        aria-hidden={decorative ? "true" : undefined}
      >
        {/* Símbolo G Gerencial */}
        <path
          d="M6 4C3.8 4 2 5.8 2 8V42C2 44.2 3.8 46 6 46H38L30 37H11V13H38V4H6Z"
          fill="#FAB12A"
        />
        <path
          d="M19 19C17.9 19 17 19.9 17 21V28C17 29.1 17.9 30 19 30H28V35L39 45V21C39 19.9 38.1 19 37 19H19Z"
          fill="#FFFFFF"
        />
        <text
          x="52"
          y="31"
          fill="#FFFFFF"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="800"
          fontSize="29"
          letterSpacing="1.5"
        >
          GERENCIAL
        </text>
        <text
          x="53"
          y="45"
          fill="#FAB12A"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="700"
          fontSize="10.2"
          letterSpacing="2.4"
        >
          Governança Condominial
        </text>
      </svg>
    );
  }

  return (
    <img
      src={logoAsset.src}
      alt={decorative ? "" : "Gerencial — Governança Condominial"}
      aria-hidden={decorative ? "true" : undefined}
      style={{ height }}
      className={`w-auto max-w-full ${className}`}
      onError={() => setUseSvgFallback(true)}
    />
  );
}
