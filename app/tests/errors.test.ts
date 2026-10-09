import { describe, expect, it } from "vitest";
import { ApiError, GENERIC_ERROR, friendlyMessage, NetworkError } from "../src/lib/errors";

function problem(code: string, detail = "detalhe do servidor") {
  return {
    type: "urn:x",
    title: "t",
    status: 400,
    detail,
    instance: "/x",
    code,
  };
}

describe("friendlyMessage", () => {
  it("usa mensagem amigável por code conhecido", () => {
    const err = new ApiError(401, [problem("OTP_INVALID", "codigo errado")]);
    expect(friendlyMessage(err)).toContain("Código inválido");
  });

  it("429 → mensagem de rate limit", () => {
    const err = new ApiError(429, [problem("TOO_MANY_REQUESTS")]);
    expect(friendlyMessage(err)).toContain("Muitas tentativas");
  });

  it("code desconhecido cai no detail do servidor", () => {
    const err = new ApiError(422, [problem("NOVO_ERRO", "mensagem do backend")]);
    expect(friendlyMessage(err)).toBe("mensagem do backend");
  });

  it("NetworkError e erros genéricos → mensagem genérica", () => {
    expect(friendlyMessage(new NetworkError())).toBe(GENERIC_ERROR);
    expect(friendlyMessage(new Error("internals"))).toBe(GENERIC_ERROR);
    expect(friendlyMessage("qualquer coisa")).toBe(GENERIC_ERROR);
  });
});
