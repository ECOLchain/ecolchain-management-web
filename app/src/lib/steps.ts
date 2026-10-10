import { isLocale, type Locale } from "@/i18n";
import type { NextStep } from "./types";

/**
 * O roteamento da SPA é dirigido por `proximoPasso` (calculado no servidor em
 * GET /me) — o front NÃO reimplementa a máquina de estados, só traduz o passo
 * para a rota correspondente.
 */
export const STEP_ROUTE: Record<NextStep, string> = {
  COMPANY_FORM: "/empresa",
  ONBOARDING: "/onboarding",
  AWAITING_REVIEW: "/revisao",
  HOME: "/painel",
  REJECTED: "/rejeitada",
  SUSPENDED: "/suspendida",
};

export function routeForStep(step: NextStep, locale: Locale): string {
  return `/${locale}${STEP_ROUTE[step] ?? "/"}`;
}

/**
 * Rota inicial pós-login: PLATFORM_ADMIN vai para o console de administração
 * (/admin) — papel, não proximoPasso: admin nunca entra no fluxo de empresa.
 */
export function routeForMe(
  me: { conta: { papel: string }; proximoPasso: NextStep },
  locale: Locale,
): string {
  if (me.conta.papel === "PLATFORM_ADMIN") return `/${locale}/admin`;
  return routeForStep(me.proximoPasso, locale);
}

/** Rota para o passo que a tela atual serve; aceita pathname com ou sem locale. */
export function stepForRoute(pathname: string): NextStep | null {
  const [, maybeLocale, ...rest] = pathname.split("/");
  const bare = isLocale(maybeLocale) ? `/${rest.join("/")}` : pathname;
  const entry = Object.entries(STEP_ROUTE).find(([, route]) => route === bare);
  return (entry?.[0] as NextStep | undefined) ?? null;
}
