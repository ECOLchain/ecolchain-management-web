import { describe, expect, it } from "vitest";
import { ApiError, friendlyMessage, NetworkError } from "../src/lib/errors";
import { copy as ptBr } from "../src/i18n/pt-br";
import { copy as en } from "../src/i18n/en";

const msgs = ptBr.errors;
const msgsEn = en.errors;

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
    expect(friendlyMessage(err, msgs)).toContain("Código inválido");
  });

  it("429 → mensagem de rate limit", () => {
    const err = new ApiError(429, [problem("TOO_MANY_REQUESTS")]);
    expect(friendlyMessage(err, msgs)).toContain("Muitas tentativas");
  });

  it("code desconhecido cai no detail do servidor", () => {
    const err = new ApiError(422, [problem("NOVO_ERRO", "mensagem do backend")]);
    expect(friendlyMessage(err, msgs)).toBe("mensagem do backend");
  });

  it("NetworkError e erros genéricos → mensagem genérica", () => {
    expect(friendlyMessage(new NetworkError(), msgs)).toBe(msgs.generic);
    expect(friendlyMessage(new Error("internals"), msgs)).toBe(msgs.generic);
    expect(friendlyMessage("qualquer coisa", msgs)).toBe(msgs.generic);
  });

  it("locale en devolve mensagens em inglês", () => {
    const err = new ApiError(401, [problem("AUTH_REQUIRED")]);
    expect(friendlyMessage(err, msgsEn)).toBe(msgsEn.friendly.AUTH_REQUIRED);
    expect(friendlyMessage(err, msgsEn)).toContain("sign in");
    expect(friendlyMessage(new NetworkError(), msgsEn)).toBe(msgsEn.generic);
  });
});
