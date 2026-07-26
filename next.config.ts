import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint corre en pre-commit / CI manual — no bloquear el build de producción
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
