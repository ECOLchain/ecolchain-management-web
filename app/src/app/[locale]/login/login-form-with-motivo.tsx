"use client";

import { useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/login-form";

/**
 * `?motivo=sessao-expirada` ativa o aviso de sessão expirada. Lido no cliente
 * porque o export estático não tem searchParams no servidor.
 */
export function LoginFormWithMotivo() {
  const params = useSearchParams();
  return <LoginForm sessionExpired={params.get("motivo") === "sessao-expirada"} />;
}
