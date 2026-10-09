import { describe, expect, it, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import proxy from "../src/proxy";
import {
  DEFAULT_LOCALE,
  LOCALES,
  apiLanguage,
  getCopy,
  isLocale,
  localPath,
} from "../src/i18n";
import { copy as ptBr } from "../src/i18n/pt-br";
import { copy as en } from "../src/i18n/en";
import { apiFetch, setApiLanguage } from "../src/lib/api";
import { clearSession } from "../src/lib/session";

function shapeOf(value: unknown): unknown {
  if (typeof value === "function")
    return `fn/${(value as (...args: unknown[]) => unknown).length}`;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        shapeOf(v),
      ]),
    );
  }
  return typeof value;
}

describe("paridade pt-br/en", () => {
  it("os dois arquivos de conteúdo têm exatamente a mesma estrutura", () => {
    expect(shapeOf(en)).toEqual(shapeOf(ptBr));
  });

  it("nenhum texto visível está vazio", () => {
    const walk = (o: Record<string, unknown>, path: string) => {
      for (const [k, v] of Object.entries(o)) {
        const p = `${path}.${k}`;
        if (typeof v === "string") expect(v.trim().length, p).toBeGreaterThan(0);
        else if (typeof v === "object" && v)
          walk(v as Record<string, unknown>, p);
      }
    };
    walk(ptBr as unknown as Record<string, unknown>, "pt");
    walk(en as unknown as Record<string, unknown>, "en");
  });
});

describe("locales", () => {
  it("locales suportados e default pt-br", () => {
    expect(LOCALES).toEqual(["pt-br", "en"]);
    expect(DEFAULT_LOCALE).toBe("pt-br");
    expect(isLocale("pt-br")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("es")).toBe(false);
    expect(isLocale("")).toBe(false);
  });

  it("getCopy devolve o copy do locale", () => {
    expect(getCopy("pt-br")).toBe(ptBr);
    expect(getCopy("en")).toBe(en);
  });

  it("localPath prefixa o path com o locale", () => {
    expect(localPath("/login", "pt-br")).toBe("/pt-br/login");
    expect(localPath("/empresa", "en")).toBe("/en/empresa");
    expect(localPath("/", "en")).toBe("/en");
  });

  it("Accept-Language por locale (a API negocia pt/en)", () => {
    expect(apiLanguage("pt-br")).toBe("pt-BR");
    expect(apiLanguage("en")).toBe("en");
  });
});

describe("redirects de locale (proxy)", () => {
  const redirectTo = (path: string) => {
    const res = proxy(new NextRequest(`http://localhost:3000${path}`));
    return { status: res.status, location: res.headers.get("location") };
  };

  it("path sem locale → redirect para /pt-br", () => {
    const r = redirectTo("/login");
    expect(r.status).toBe(307);
    expect(r.location).toBe("http://localhost:3000/pt-br/login");
  });

  it("path aninhado sem locale → /pt-br/<path>", () => {
    const r = redirectTo("/onboarding");
    expect(r.status).toBe(307);
    expect(r.location).toBe("http://localhost:3000/pt-br/onboarding");
  });

  it("preserva query string no redirect", () => {
    const r = redirectTo("/login?motivo=sessao-expirada");
    expect(r.location).toBe(
      "http://localhost:3000/pt-br/login?motivo=sessao-expirada",
    );
  });

  it("paths já localizados passam direto", () => {
    for (const p of ["/pt-br/login", "/en/empresa", "/pt-br", "/en"]) {
      const r = redirectTo(p);
      expect(r.status, p).toBe(200);
      expect(r.location, p).toBeNull();
    }
  });

  it("paths de API nunca são redirecionados (bare ou com subpath)", () => {
    for (const p of ["/me", "/me/onboarding", "/auth/refresh", "/public/profile-types"]) {
      const r = redirectTo(p);
      expect(r.status, p).toBe(200);
      expect(r.location, p).toBeNull();
    }
  });

  it("primeiro segmento inválido cai no redirect do default", () => {
    // /es/login não é locale → vira /pt-br/es/login (a rota não existe → 404
    // do router, consistente com qualquer path desconhecido).
    const r = redirectTo("/es/login");
    expect(r.status).toBe(307);
    expect(r.location).toBe("http://localhost:3000/pt-br/es/login");
  });
});

describe("sessão expirada", () => {
  it("URL de login com motivo nos dois locales", () => {
    for (const l of LOCALES) {
      const url = `${localPath("/login", l)}?motivo=sessao-expirada`;
      expect(url).toBe(`/${l}/login?motivo=sessao-expirada`);
    }
  });

  it("mensagem existe e é traduzida", () => {
    expect(ptBr.login.sessionExpired).toContain("sessão expirou");
    expect(en.login.sessionExpired).toContain("session has expired");
    expect(en.login.sessionExpired).not.toBe(ptBr.login.sessionExpired);
  });

  it("AUTH_REQUIRED/REFRESH_REUSED têm friendly localizado", () => {
    expect(ptBr.errors.friendly.AUTH_REQUIRED).toContain("sessão expirou");
    expect(en.errors.friendly.AUTH_REQUIRED).toContain("session");
    expect(en.errors.friendly.REFRESH_REUSED).toContain("session");
  });
});

describe("Accept-Language nas chamadas da API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearSession();
    setApiLanguage("pt-BR");
  });

  it("apiFetch envia o header do idioma configurado", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { ok: true }, links: [], erros: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    setApiLanguage("en");
    await apiFetch("/public/profile-types", { auth: "public" });
    expect(fetchMock.mock.calls[0][1].headers["Accept-Language"]).toBe("en");
    setApiLanguage("pt-BR");
    await apiFetch("/public/profile-types", { auth: "public" });
    expect(fetchMock.mock.calls[1][1].headers["Accept-Language"]).toBe("pt-BR");
  });
});
