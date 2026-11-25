import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["pg"],
  outputFileTracingIncludes: {
    "/api/quotations/[id]/pdf": ["./public/identidade/**/*", "./src/assets/**/*"],
    "/api/indicators/pdf": ["./public/identidade/**/*", "./src/assets/**/*"],
  },
};

export default nextConfig;
