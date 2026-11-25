import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["pg"],
  outputFileTracingIncludes: {
    "/api/quotations/[id]/pdf": ["./public/identidade/**/*"],
    "/api/indicators/pdf": ["./public/identidade/**/*"],
  },
};

export default nextConfig;
