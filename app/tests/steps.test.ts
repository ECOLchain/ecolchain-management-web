import { describe, expect, it } from "vitest";
import { routeForStep, stepForRoute, STEP_ROUTE } from "../src/lib/steps";
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
  it("mapeia todos os passos do contrato para uma rota", () => {
    for (const step of ALL) {
      expect(routeForStep(step), step).toBeTruthy();
      expect(routeForStep(step)).toMatch(/^\//);
    }
  });

  it("rotas esperadas", () => {
    expect(routeForStep("COMPANY_FORM")).toBe("/empresa");
    expect(routeForStep("ONBOARDING")).toBe("/onboarding");
    expect(routeForStep("AWAITING_REVIEW")).toBe("/revisao");
    expect(routeForStep("HOME")).toBe("/painel");
    expect(routeForStep("REJECTED")).toBe("/rejeitada");
    expect(routeForStep("SUSPENDED")).toBe("/suspendida");
  });

  it("stepForRoute é o inverso de routeForStep", () => {
    for (const step of ALL) {
      expect(stepForRoute(routeForStep(step))).toBe(step);
    }
    expect(stepForRoute("/login")).toBeNull();
  });

  it("toda rota é única (uma tela por passo)", () => {
    const rotas = Object.values(STEP_ROUTE);
    expect(new Set(rotas).size).toBe(rotas.length);
  });
});
