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

/** Rota para o passo que a tela atual serve; aceita pathname com ou sem locale. */
export function stepForRoute(pathname: string): NextStep | null {
  const [, maybeLocale, ...rest] = pathname.split("/");
  const bare = isLocale(maybeLocale) ? `/${rest.join("/")}` : pathname;
  const entry = Object.entries(STEP_ROUTE).find(([, route]) => route === bare);
  return (entry?.[0] as NextStep | undefined) ?? null;
}
