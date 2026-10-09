import type { Problem } from "./types";

/**
 * Erro de API: carrega o primeiro Problem do envelope + todos os problems.
 * `code` é o código estável do contrato (OTP_INVALID, CNPJ_IN_USE...) —
 * a UI decide mensagens por `code`, nunca por string-match em title.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly campo: string | null;
  readonly detail: string;
  readonly problems: Problem[];

  constructor(status: number, problems: Problem[], fallbackDetail?: string) {
    const first = problems[0];
    const detail = first?.detail ?? fallbackDetail ?? "Erro inesperado";
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.code = first?.code ?? "UNKNOWN";
    this.campo = first?.campo ?? null;
    this.detail = detail;
    this.problems = problems;
  }

  is(code: string): boolean {
    return this.problems.some((p) => p.code === code);
  }
}

/** Falha de rede/5xx sem envelope: a UI mostra mensagem genérica. */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super("Falha de comunicação com o servidor");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

export interface ErrorMessages {
  friendly: Record<string, string>;
  generic: string;
}

/**
 * Traduz um erro para a mensagem a exibir na UI (sem expor detalhes técnicos).
 * `msgs` = `copy.errors` do locale ativo; o fallback é o `detail` do servidor
 * (que a própria API localiza via Accept-Language) ou o texto genérico.
 */
export function friendlyMessage(err: unknown, msgs: ErrorMessages): string {
  if (err instanceof ApiError) {
    return msgs.friendly[err.code] ?? err.detail ?? msgs.generic;
  }
  return msgs.generic;
}
