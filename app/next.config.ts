import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

// Proxy same-origin para a API em desenvolvimento: a SPA chama caminhos
// relativos (/auth/*, /me/*) e o Next repassa para o backend. Assim o cookie
// de refresh (Path=/auth) fica first-party e não dependemos de CORS/credenciais
// cross-origin. No deploy, quem responde é a origem de NEXT_PUBLIC_API_URL.
const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8080";

const sharedConfig: NextConfig = {
  // Monorepo/git pai acima de app/ faz o Turbopack subir demais procurando a
  // raiz. Fixa a raiz neste diretório (mesmo motivo da landing page).
  turbopack: {
    root: new URL(".", import.meta.url).pathname,
  },
};

const devConfig: NextConfig = {
  ...sharedConfig,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async rewrites() {
    return [
      { source: "/auth/:path*", destination: `${apiUrl}/auth/:path*` },
      { source: "/public/:path*", destination: `${apiUrl}/public/:path*` },
      { source: "/me/:path*", destination: `${apiUrl}/me/:path*` },
      { source: "/admin/:path*", destination: `${apiUrl}/admin/:path*` },
      { source: "/.well-known/:path*", destination: `${apiUrl}/.well-known/:path*` },
      // Ferramenta de dev do backend (mailer mock): lê o OTP enviado no E2E local.
      { source: "/dev-mailbox", destination: `${apiUrl}/dev-mailbox` },
    ];
  },
};

// Build/deploy: SPA 100% estática em app/out/ (sync para o bucket OCI pela
// esteira). Rewrites e proxy.ts não existem em runtime estático — por isso
// ficam restritos à fase de dev server.
const prodConfig: NextConfig = {
  ...sharedConfig,
  output: "export",
  images: { unoptimized: true },
};

export default function nextConfig(phase: string): NextConfig {
  return phase === PHASE_DEVELOPMENT_SERVER ? devConfig : prodConfig;
}
