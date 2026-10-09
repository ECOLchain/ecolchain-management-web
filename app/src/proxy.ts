import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/i18n";

/**
 * Rotas por idioma (`/pt-br`, `/en`). Qualquer path de página sem prefixo de
 * locale é redirecionado para o default (pt-br) — ex.: `/login` →
 * `/pt-br/login`. `/` cai no `page.tsx` da raiz, que redireciona também.
 * Paths de API (`/auth`, `/public`, `/me`, `/.well-known`, `/dev-mailbox`)
 * e arquivos estáticos saem pelo matcher/config.
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (first === "" || isLocale(first)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/|auth/|public/|me/|dev-mailbox|\\.well-known/|.*\\..*).*)",
  ],
};
