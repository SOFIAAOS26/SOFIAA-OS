import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint corre en CI/pre-commit — no bloquear builds de Vercel
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
