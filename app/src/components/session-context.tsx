"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api, UnauthorizedError } from "@/lib/api";
import {
  clearSession,
  getSession,
  refreshSession,
  setSession,
} from "@/lib/session";
import type { MeData, SessionData } from "@/lib/types";

type SessionState = "booting" | "anon" | "expired" | "authed";

interface SessionContextValue {
  state: SessionState;
  me: MeData | null;
  /** Marca a sessão após verify/refresh e carrega /me. */
  login(data: SessionData): Promise<MeData | null>;
  reloadMe(): Promise<MeData | null>;
  logout(): Promise<void>;
  /** Sessão morreu (refresh 401): limpa estado → guards levam ao login com aviso. */
  expire(): void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession fora de SessionProvider");
  return ctx;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>("booting");
  const [me, setMe] = useState<MeData | null>(null);
  const booted = useRef(false);

  const expire = useCallback(() => {
    clearSession();
    setMe(null);
    setState("expired");
  }, []);

  const reloadMe = useCallback(async (): Promise<MeData | null> => {
    try {
      const data = await api.me();
      if (!data) throw new Error("empty");
      setMe(data);
      setState("authed");
      return data;
    } catch (err) {
      if (err instanceof UnauthorizedError) expire();
      return null;
    }
  }, [expire]);

  const login = useCallback(
    async (data: SessionData): Promise<MeData | null> => {
      setSession(data);
      return reloadMe();
    },
    [reloadMe],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Logout é idempotente; falha de rede não impede saída local.
    }
    // Logout voluntário: volta ao login sem aviso de expiração.
    clearSession();
    setMe(null);
    setState("anon");
  }, []);

  // Bootstrap: sem token em memória (reload/F5) → tenta o cookie de refresh.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    (async () => {
      if (!getSession()) {
        const r = await refreshSession();
        if (r === "unauthorized") {
          setState("anon");
          return;
        }
        if (r === "error") {
          // Falha transitória (rede/5xx): tenta /me com o que houver; o
          // guard trata o UnauthorizedError se não houver sessão.
          setState(getSession() ? "authed" : "anon");
          return;
        }
      }
      await reloadMe();
    })();
  }, [reloadMe]);

  return (
    <SessionContext.Provider
      value={{ state, me, login, reloadMe, logout, expire }}
    >
      {children}
    </SessionContext.Provider>
  );
}
