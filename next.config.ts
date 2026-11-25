import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg é uma dependência nativa de driver (dispensa bundle ao lado do código
  // de rota); pdf-lib roda em Node puro e é mantido fora do bundle cliente.
  serverExternalPackages: ["pg", "pdf-lib", "drizzle-orm"],
};

export default nextConfig;
