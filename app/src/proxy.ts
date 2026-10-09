import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/i18n";

/** Primeiros segmentos que são da API (rewrites), nunca páginas localizadas. */
const API_SEGMENTS = new Set([
  "auth",
  "public",
  "me",
  "dev-mailbox",
  ".well-known",
]);

/**
 * Rotas por idioma (`/pt-br`, `/en`). Qualquer path de página sem prefixo de
 * locale é redirecionado para o default (pt-br) — ex.: `/login` →
 * `/pt-br/login`. `/` cai no `page.tsx` da raiz, que redireciona também.
 * Paths de API (bare ou com subpath: `/me`, `/auth/...`) e arquivos estáticos
 * passam direto — o matcher abaixo + a lista acima cobrem os dois casos.
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (first === "" || isLocale(first) || API_SEGMENTS.has(first)) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next(?:/|$)|auth(?:/|$)|public(?:/|$)|me(?:/|$)|dev-mailbox(?:/|$)|\\.well-known(?:/|$)|.*\\..*).*)",
  ],
};
