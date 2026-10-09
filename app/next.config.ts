import type { NextConfig } from "next";

// Proxy same-origin para a API: a SPA chama caminhos relativos (/auth/*, /me/*)
// e o Next repassa para o backend. Assim o cookie de refresh (Path=/auth) fica
// first-party e não dependemos de CORS/credenciais cross-origin.
const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // Monorepo/git pai acima de app/ faz o Turbopack subir demais procurando a
  // raiz. Fixa a raiz neste diretório (mesmo motivo da landing page).
  turbopack: {
    root: new URL(".", import.meta.url).pathname,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async rewrites() {
    return [
      { source: "/auth/:path*", destination: `${apiUrl}/auth/:path*` },
      { source: "/public/:path*", destination: `${apiUrl}/public/:path*` },
      { source: "/me/:path*", destination: `${apiUrl}/me/:path*` },
      { source: "/.well-known/:path*", destination: `${apiUrl}/.well-known/:path*` },
      // Ferramenta de dev do backend (mailer mock): lê o OTP enviado no E2E local.
      { source: "/dev-mailbox", destination: `${apiUrl}/dev-mailbox` },
    ];
  },
};

export default nextConfig;
