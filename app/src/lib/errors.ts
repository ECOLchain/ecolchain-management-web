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

/**
 * Mensagem amigável por código de erro do contrato.
 * Fallback = o `detail` do servidor (já vem em pt-BR) ou texto genérico.
 */
const FRIENDLY: Record<string, string> = {
  OTP_INVALID: "Código inválido ou expirado. Confira o e-mail e tente novamente.",
  TOO_MANY_REQUESTS: "Muitas tentativas. Aguarde alguns instantes e tente de novo.",
  AUTH_REQUIRED: "Sua sessão expirou. Entre novamente.",
  CNPJ_IN_USE: "Este CNPJ já está cadastrado. Fale com a Ecolchain.",
  CNPJ_INVALID: "CNPJ inválido. Confira os dígitos e tente novamente.",
  PROFILE_TYPE_INVALID: "Tipo de perfil inválido. Recarregue a página.",
  COMPANY_LOCKED: "O cadastro não pode ser alterado no estado atual.",
  ATTRIBUTE_VALUE_INVALID: "Valor inválido para o campo.",
  ATTRIBUTE_NOT_IN_FLOW: "Campo fora do fluxo desta empresa.",
  SUBMIT_INCOMPLETE: "Ainda há itens obrigatórios pendentes.",
  DOCUMENT_INVALID: "Arquivo inválido. Verifique o formato e o tamanho.",
  DOCUMENT_NOT_CONFIRMED: "O envio do documento não foi confirmado.",
  DOCUMENT_UPLOAD_FAILED: "Falha no envio do arquivo. Tente novamente.",
  REFRESH_REUSED: "Sua sessão foi encerrada por segurança. Entre novamente.",
};

export const GENERIC_ERROR =
  "Não foi possível concluir agora. Tente novamente em instantes.";

/** Traduz um erro para a mensagem a exibir na UI (sem expor detalhes técnicos). */
export function friendlyMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return FRIENDLY[err.code] ?? err.detail ?? GENERIC_ERROR;
  }
  return GENERIC_ERROR;
}
