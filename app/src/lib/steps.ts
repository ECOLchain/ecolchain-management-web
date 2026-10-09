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

export function routeForStep(step: NextStep): string {
  return STEP_ROUTE[step] ?? "/";
}

/** Rota para o passo que a tela atual serve; usada pelo guard das páginas. */
export function stepForRoute(pathname: string): NextStep | null {
  const entry = Object.entries(STEP_ROUTE).find(([, route]) => route === pathname);
  return (entry?.[0] as NextStep | undefined) ?? null;
}
