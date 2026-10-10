import { describe, expect, it } from "vitest";
import { routeForMe, routeForStep, stepForRoute, STEP_ROUTE } from "../src/lib/steps";
import type { NextStep } from "../src/lib/types";

const ALL: NextStep[] = [
  "COMPANY_FORM",
  "ONBOARDING",
  "AWAITING_REVIEW",
  "HOME",
  "REJECTED",
  "SUSPENDED",
];

describe("roteamento por proximoPasso", () => {
  it("mapeia todos os passos do contrato para uma rota com locale", () => {
    for (const step of ALL) {
      expect(routeForStep(step, "pt-br"), step).toMatch(/^\/pt-br\//);
      expect(routeForStep(step, "en"), step).toMatch(/^\/en\//);
    }
  });

  it("rotas esperadas no locale default", () => {
    expect(routeForStep("COMPANY_FORM", "pt-br")).toBe("/pt-br/empresa");
    expect(routeForStep("ONBOARDING", "pt-br")).toBe("/pt-br/onboarding");
    expect(routeForStep("AWAITING_REVIEW", "pt-br")).toBe("/pt-br/revisao");
    expect(routeForStep("HOME", "pt-br")).toBe("/pt-br/painel");
    expect(routeForStep("REJECTED", "pt-br")).toBe("/pt-br/rejeitada");
    expect(routeForStep("SUSPENDED", "pt-br")).toBe("/pt-br/suspendida");
  });

  it("pós-verify: o passo do /me resolve a rota no locale ativo", () => {
    // verify → login() → router.replace(routeForStep(me.proximoPasso, locale))
    expect(routeForStep("COMPANY_FORM", "en")).toBe("/en/empresa");
    expect(routeForStep("ONBOARDING", "en")).toBe("/en/onboarding");
  });

  it("stepForRoute é o inverso de routeForStep (com e sem prefixo)", () => {
    for (const step of ALL) {
      expect(stepForRoute(routeForStep(step, "pt-br"))).toBe(step);
      expect(stepForRoute(routeForStep(step, "en"))).toBe(step);
      expect(stepForRoute(STEP_ROUTE[step])).toBe(step);
    }
    expect(stepForRoute("/pt-br/login")).toBeNull();
    expect(stepForRoute("/login")).toBeNull();
  });

  it("toda rota é única (uma tela por passo)", () => {
    const rotas = Object.values(STEP_ROUTE);
    expect(new Set(rotas).size).toBe(rotas.length);
  });
});

describe("routeForMe (roteamento pós-login por papel)", () => {
  const me = (papel: string, proximoPasso: NextStep) => ({
    conta: { papel },
    proximoPasso,
  });

  it("PLATFORM_ADMIN vai para /admin independente do proximoPasso", () => {
    for (const step of ALL) {
      expect(routeForMe(me("PLATFORM_ADMIN", step), "pt-br")).toBe(
        "/pt-br/admin",
      );
      expect(routeForMe(me("PLATFORM_ADMIN", step), "en")).toBe("/en/admin");
    }
  });

  it("COMPANY_OWNER segue o proximoPasso normalmente", () => {
    for (const step of ALL) {
      expect(routeForMe(me("COMPANY_OWNER", step), "pt-br")).toBe(
        routeForStep(step, "pt-br"),
      );
    }
  });
});
