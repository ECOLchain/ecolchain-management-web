import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, apiFetch, UnauthorizedError } from "../src/lib/api";
import { ApiError, NetworkError } from "../src/lib/errors";
import { clearSession, setSession } from "../src/lib/session";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function envelope<T>(data: T | null, erros: unknown[] = []) {
  return { data, links: [], erros };
}

const FUTURE = Math.floor(Date.now() / 1000) + 3600;
// A API devolve `expiraEm` como TTL em segundos: negativo = já expirado.
const EXPIRED_TTL = -10;

const SESSION: import("../src/lib/types").SessionData = {
  accessToken: "tok-1",
  expiraEm: FUTURE,
  conta: { email: "a@b.c", papel: "COMPANY_OWNER", nomeCompleto: null },
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  clearSession();
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearSession();
});

describe("apiFetch", () => {
  it("devolve data do envelope em sucesso", async () => {
    setSession(SESSION);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, envelope({ hello: "world" })),
    );
    const data = await apiFetch<{ hello: string }>("/me");
    expect(data).toEqual({ hello: "world" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/me");
    expect(init.headers.Authorization).toBe("Bearer tok-1");
    expect(init.credentials).toBe("include");
  });

  it("não envia Authorization em chamadas public", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(202, envelope(null)));
    await api.requestOtp("a@b.c");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it("mapeia erros do envelope para ApiError (code/campo/detail)", async () => {
    setSession(SESSION);
    const problem = {
      type: "urn:x",
      title: "CNPJ já cadastrado",
      status: 422,
      detail: "Este CNPJ já está em uso por outra empresa.",
      instance: "/me/company",
      code: "CNPJ_IN_USE",
      campo: "cnpj",
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(422, envelope(null, [problem])));
    const err = await apiFetch("/me/company", { method: "PUT" }).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("CNPJ_IN_USE");
    expect(err.campo).toBe("cnpj");
    expect(err.detail).toContain("em uso");
    expect(err.is("CNPJ_IN_USE")).toBe(true);
  });

  it("em 401 chama /auth/refresh uma vez e repete a request", async () => {
    setSession(SESSION);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, envelope(null))) // /me 401
      .mockResolvedValueOnce(
        jsonResponse(200, envelope({ ...SESSION, accessToken: "tok-2" })),
      ) // refresh
      .mockResolvedValueOnce(jsonResponse(200, envelope({ ok: true }))); // /me retry

    const data = await apiFetch<{ ok: boolean }>("/me");
    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe("/auth/refresh");
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe(
      "Bearer tok-2",
    );
  });

  it("lock: N chamadas 401 paralelas disparam apenas UM refresh", async () => {
    setSession(SESSION);
    const unauthorized = () =>
      jsonResponse(401, envelope(null, [{ code: "AUTH_REQUIRED" }]));
    fetchMock
      .mockImplementationOnce(() => Promise.resolve(unauthorized()))
      .mockImplementationOnce(() => Promise.resolve(unauthorized()))
      // um único refresh compartilhado
      .mockResolvedValueOnce(
        jsonResponse(200, envelope({ ...SESSION, accessToken: "tok-2" })),
      )
      .mockResolvedValue(jsonResponse(200, envelope({ ok: true })));

    const [a, b] = await Promise.all([
      apiFetch("/me"),
      apiFetch("/me/onboarding"),
    ]);
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    const refreshes = fetchMock.mock.calls.filter(
      ([u]) => u === "/auth/refresh",
    );
    expect(refreshes).toHaveLength(1);
  });

  it("refresh 401 → UnauthorizedError (sessão morta)", async () => {
    setSession(SESSION);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, envelope(null)))
      .mockResolvedValueOnce(jsonResponse(401, envelope(null)));
    await expect(apiFetch("/me")).rejects.toBeInstanceOf(UnauthorizedError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("token quase vencido → refresh proativo antes da chamada", async () => {
    setSession({ ...SESSION, expiraEm: EXPIRED_TTL, accessToken: "velho" });
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, envelope({ ...SESSION, accessToken: "novo" })),
      )
      .mockResolvedValueOnce(jsonResponse(200, envelope({ ok: true })));
    const data = await apiFetch<{ ok: boolean }>("/me");
    expect(data).toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][0]).toBe("/auth/refresh");
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer novo",
    );
  });

  it("falha de rede vira NetworkError (sem expor detalhe)", async () => {
    setSession(SESSION);
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(apiFetch("/me")).rejects.toBeInstanceOf(NetworkError);
  });
});

describe("endpoints", () => {
  it("verifyOtp posta email+codigo e devolve sessão", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, envelope(SESSION)));
    const s = await api.verifyOtp("a@b.c", "123456");
    expect(s?.accessToken).toBe("tok-1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/auth/otp/verify");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "a@b.c",
      codigo: "123456",
    });
  });

  it("createUploadUrl envia nomeArquivo/contentType/tamanhoBytes", async () => {
    setSession(SESSION);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        200,
        envelope({
          url: "https://s3/x",
          objectKey: "docs/k",
          expiraEm: 1,
          contentType: "application/pdf",
          tamanhoBytes: 3,
        }),
      ),
    );
    await api.createUploadUrl("doc_cnpj", {
      nomeArquivo: "a.pdf",
      contentType: "application/pdf",
      tamanhoBytes: 3,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/me/onboarding/documents/doc_cnpj/upload-url");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string).tamanhoBytes).toBe(3);
  });
});
