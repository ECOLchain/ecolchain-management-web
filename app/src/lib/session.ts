import { API_BASE } from "./api-base";
import type { ContaInfo, Envelope, SessionData } from "./types";

/**
 * Sessão em memória: o access token (15 min) NUNCA vai para
 * localStorage/sessionStorage. O refresh fica no cookie HttpOnly
 * `ecolchain_refresh` (Path=/auth) — um reload da página chama
 * `refreshSession()` para recuperar a sessão.
 */
interface SessionState {
  accessToken: string;
  /** Epoch em SEGUNDOS (como no contrato `expiraEm`). */
  expiraEm: number;
  conta: ContaInfo;
}

let session: SessionState | null = null;
let refreshInflight: Promise<RefreshResult> | null = null;

export type RefreshResult = "ok" | "unauthorized" | "error";

export function getSession(): SessionState | null {
  return session;
}

export function setSession(data: SessionData): void {
  session = {
    accessToken: data.accessToken,
    // O OpenAPI documenta `expiraEm` como epoch, mas a API devolve o TTL em
    // segundos (900). Convertemos para expiração absoluta aqui — se o backend
    // passar a mandar epoch, valores futuros continuam corretos.
    expiraEm:
      data.expiraEm > Date.now() / 1000
        ? data.expiraEm
        : Math.floor(Date.now() / 1000) + data.expiraEm,
    conta: data.conta,
  };
}

export function clearSession(): void {
  session = null;
}

/** Margem para considerar o token expirado (evita 401 a cada request). */
const EXPIRY_SKEW_SECONDS = 30;

export function tokenExpiringSoon(): boolean {
  if (!session) return true;
  return session.expiraEm - Date.now() / 1000 < EXPIRY_SKEW_SECONDS;
}

/**
 * Rotaciona o refresh cookie e devolve novo access token.
 * Lock de single-flight: N chamadas paralelas compartilham a mesma promise,
 * então várias respostas 401 simultâneas disparam apenas UM /auth/refresh.
 */
export function refreshSession(): Promise<RefreshResult> {
  if (refreshInflight) return refreshInflight;
  refreshInflight = (async (): Promise<RefreshResult> => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.status === 401) {
        clearSession();
        return "unauthorized";
      }
      if (!res.ok) return "error";
      const body = (await res.json()) as Envelope<SessionData>;
      if (!body.data?.accessToken) return "error";
      setSession(body.data);
      return "ok";
    } catch {
      return "error";
    } finally {
      refreshInflight = null;
    }
  })();
  return refreshInflight;
}
