import { API_BASE } from "./api-base";
import { ApiError, NetworkError } from "./errors";
import {
  getSession,
  refreshSession,
  tokenExpiringSoon,
} from "./session";
import type { Envelope } from "./types";

/**
 * Wrapper de fetch para a API (mesma origem via rewrites do Next, ou a
 * origem de `NEXT_PUBLIC_API_URL` quando a esteira a define no build).
 *
 * - Toda resposta é um envelope `{data, links, erros}`; erro vira `ApiError`.
 * - Chamadas autenticadas mandam `Authorization: Bearer <token em memória>`.
 * - Em 401 fora de /auth/*: chama POST /auth/refresh UMA vez (o lock em
 *   session.ts impede refreshes paralelos) e repete a request. Se o refresh
 *   falhar → a sessão está morta (`unauthorized`), a camada de UI redireciona
 *   para /login.
 */

export class UnauthorizedError extends Error {
  constructor() {
    super("Sessão expirada");
    this.name = "UnauthorizedError";
  }
}

let apiLang = "pt-BR";

/**
 * Idioma enviado em Accept-Language — a API negocia pt-BR/en e devolve
 * rótulos/details no idioma pedido. O I18nProvider chama isto com o locale
 * da rota (`/pt-br` ou `/en`); default pt-BR.
 */
export function setApiLanguage(lang: string): void {
  apiLang = lang;
}

interface FetchOptions {
  method?: string;
  body?: unknown;
  /** `bearer` (default) exige sessão; `public` não manda Authorization. */
  auth?: "bearer" | "public";
  signal?: AbortSignal;
}

async function rawFetch<T>(
  path: string,
  opts: FetchOptions,
): Promise<{ status: number; body: Envelope<T> }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": apiLang,
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth !== "public") {
    const token = getSession()?.accessToken;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? "GET",
      credentials: "include",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new NetworkError(err);
  }
  let body: Envelope<T>;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError(res.status, [], "Resposta inválida do servidor");
  }
  return { status: res.status, body };
}

export async function apiFetch<T = null>(
  path: string,
  opts: FetchOptions = {},
): Promise<T | null> {
  const auth = opts.auth ?? "bearer";

  // Token quase vencido: refresh proativo (single-flight) antes da chamada.
  if (auth === "bearer" && tokenExpiringSoon()) {
    const r = await refreshSession();
    if (r === "unauthorized") throw new UnauthorizedError();
  }

  let { status, body } = await rawFetch<T>(path, { ...opts, auth });

  if (status === 401 && auth === "bearer") {
    const r = await refreshSession();
    if (r !== "ok") throw new UnauthorizedError();
    ({ status, body } = await rawFetch<T>(path, { ...opts, auth }));
  }

  if (status === 401) throw new UnauthorizedError();
  if (!res2xx(status)) throw new ApiError(status, body.erros ?? []);
  return body.data;
}

function res2xx(status: number): boolean {
  return status >= 200 && status < 300;
}

// ---------- Endpoints ----------

import type {
  AdminAccount,
  AdminAttribute,
  AdminCompany,
  AdminCompanyList,
  AdminProfileType,
  AttributeDefinitionBody,
  AuditLogPage,
  CompanyStatus,
  CompanyUpsertBody,
  DownloadUrlData,
  EmpresaResumo,
  FlowStepInput,
  MeData,
  OnboardingData,
  ProfileTypeSummary,
  ProfileTypeUpsertBody,
  ReviewDecision,
  ReviewItem,
  SessionData,
  UploadUrlData,
} from "./types";

export const api = {
  requestOtp: (email: string) =>
    apiFetch("/auth/otp/request", {
      method: "POST",
      body: { email },
      auth: "public",
    }),

  verifyOtp: async (email: string, codigo: string) => {
    const data = await apiFetch<SessionData>("/auth/otp/verify", {
      method: "POST",
      body: { email, codigo },
      auth: "public",
    });
    return data;
  },

  logout: () => apiFetch("/auth/logout", { method: "POST", auth: "public" }),

  listProfileTypes: async () => {
    const data = await apiFetch<{ tipos: ProfileTypeSummary[] }>(
      "/public/profile-types",
      { auth: "public" },
    );
    return data?.tipos ?? [];
  },

  me: () => apiFetch<MeData>("/me"),

  upsertCompany: (body: CompanyUpsertBody) =>
    apiFetch<EmpresaResumo>("/me/company", { method: "PUT", body }),

  getOnboarding: () => apiFetch<OnboardingData>("/me/onboarding"),

  putAttribute: (code: string, valor: string) =>
    apiFetch(`/me/onboarding/attributes/${encodeURIComponent(code)}`, {
      method: "PUT",
      body: { valor },
    }),

  createUploadUrl: (
    code: string,
    file: { nomeArquivo: string; contentType: string; tamanhoBytes: number },
  ) =>
    apiFetch<UploadUrlData>(
      `/me/onboarding/documents/${encodeURIComponent(code)}/upload-url`,
      { method: "POST", body: file },
    ),

  confirmUpload: (code: string, objectKey: string) =>
    apiFetch(`/me/onboarding/documents/${encodeURIComponent(code)}/confirm`, {
      method: "POST",
      body: { objectKey },
    }),

  downloadUrl: (code: string) =>
    apiFetch<DownloadUrlData>(
      `/me/onboarding/documents/${encodeURIComponent(code)}/download-url`,
    ),

  submitOnboarding: () =>
    apiFetch<{ status: string }>("/me/onboarding/submit", { method: "POST" }),

  // ---------- Admin (PLATFORM_ADMIN) ----------

  listCompanies: (status?: CompanyStatus, pagina = 0, tamanho = 20) => {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    q.set("pagina", String(pagina));
    q.set("tamanho", String(tamanho));
    return apiFetch<AdminCompanyList>(`/admin/companies?${q}`);
  },

  getCompany: (id: string) =>
    apiFetch<AdminCompany>(`/admin/companies/${encodeURIComponent(id)}`),

  reviewCompany: (
    id: string,
    body: { decisao: ReviewDecision; nota?: string; itens?: ReviewItem[] },
  ) =>
    apiFetch<AdminCompany>(
      `/admin/companies/${encodeURIComponent(id)}/review`,
      { method: "POST", body },
    ),

  companyDocumentUrl: (id: string, code: string) =>
    apiFetch<DownloadUrlData>(
      `/admin/companies/${encodeURIComponent(id)}/documents/${encodeURIComponent(code)}/download-url`,
    ),

  listProfileTypesAdmin: async () => {
    const data = await apiFetch<{ tipos: AdminProfileType[] }>(
      "/admin/profile-types",
    );
    return data?.tipos ?? [];
  },

  patchProfileType: (
    code: string,
    patch: Partial<
      Pick<
        AdminProfileType,
        "ativo" | "nomePt" | "nomeEn" | "descricaoPt" | "descricaoEn" | "ordem"
      >
    >,
  ) =>
    apiFetch<AdminProfileType>(
      `/admin/profile-types/${encodeURIComponent(code)}`,
      { method: "PATCH", body: patch },
    ),

  createProfileType: (body: ProfileTypeUpsertBody) =>
    apiFetch<AdminProfileType>("/admin/profile-types", {
      method: "POST",
      body,
    }),

  replaceProfileTypeFlow: (code: string, passos: FlowStepInput[]) =>
    apiFetch<AdminProfileType>(
      `/admin/profile-types/${encodeURIComponent(code)}/flow`,
      { method: "PUT", body: { passos } },
    ),

  upsertAttribute: (body: AttributeDefinitionBody) =>
    apiFetch<AdminAttribute>(
      `/admin/attributes/${encodeURIComponent(body.codigo)}`,
      { method: "PUT", body },
    ),

  listAttributesAdmin: async () => {
    const data = await apiFetch<{ atributos: AdminAttribute[] }>(
      "/admin/attributes",
    );
    return data?.atributos ?? [];
  },

  listAuditLog: (pagina = 0, tamanho = 50) =>
    apiFetch<AuditLogPage>(`/admin/audit-log?pagina=${pagina}&tamanho=${tamanho}`),

  listAdminAccounts: async () => {
    const data = await apiFetch<{ admins: AdminAccount[] }>(
      "/admin/accounts",
    );
    return data?.admins ?? [];
  },

  createAdminAccount: (body: {
    email: string;
    nomeCompleto: string;
    telefone: string;
  }) => apiFetch<AdminAccount>("/admin/accounts", { method: "POST", body }),
};

/**
 * PUT direto na URL pré-assinada do bucket (OCI). Os headers Content-Type e
 * Content-Length fazem parte da assinatura — divergência devolve 403.
 * O browser define Content-Length sozinho a partir do body.
 */
export async function uploadToPresignedUrl(
  url: string,
  file: File,
  contentType: string,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
  } catch (err) {
    throw new NetworkError(err);
  }
  if (!res.ok) {
    throw new ApiError(res.status, [
      {
        type: "urn:ecolchain:problem:upload-failed",
        title: "Falha no upload",
        status: res.status,
        detail: "O servidor de armazenamento recusou o arquivo.",
        instance: url,
        code: "DOCUMENT_UPLOAD_FAILED",
      },
    ]);
  }
}
