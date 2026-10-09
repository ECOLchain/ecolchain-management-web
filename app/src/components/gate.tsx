"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "./session-context";
import { useCopy, useLocale } from "@/i18n/provider";
import { localPath } from "@/i18n";
import { routeForStep } from "@/lib/steps";
import type { NextStep } from "@/lib/types";
import { FullPageLoader } from "./ui";

/**
 * Guarda de rota: exige sessão; quando `proximoPasso` (decidido no servidor)
 * não corresponde a esta tela, redireciona para a rota certa no locale ativo.
 */
export function RequireStep({
  allow,
  children,
}: {
  allow: NextStep[];
  children: React.ReactNode;
}) {
  const { state, me } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const c = useCopy();

  useEffect(() => {
    if (state === "expired") {
      router.replace(`${localPath("/login", locale)}?motivo=sessao-expirada`);
      return;
    }
    if (state === "anon") {
      router.replace(localPath("/login", locale));
      return;
    }
    if (state === "authed" && me && !allow.includes(me.proximoPasso)) {
      const destino = routeForStep(me.proximoPasso, locale);
      if (destino !== pathname) router.replace(destino);
    }
  }, [state, me, allow, router, pathname, locale]);

  if (state !== "authed" || !me) {
    return <FullPageLoader label={c.common.loadingSession} />;
  }
  if (!allow.includes(me.proximoPasso)) {
    return <FullPageLoader label={c.common.redirecting} />;
  }
  return <>{children}</>;
}

/** Raiz de cada locale (`/pt-br`, `/en`): resolve a sessão e encaminha para o `proximoPasso`. */
export function RootGate() {
  const { state, me } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const c = useCopy();

  useEffect(() => {
    if (state === "expired") {
      router.replace(`${localPath("/login", locale)}?motivo=sessao-expirada`);
    } else if (state === "anon") {
      router.replace(localPath("/login", locale));
    } else if (state === "authed" && me) {
      router.replace(routeForStep(me.proximoPasso, locale));
    }
  }, [state, me, router, locale]);

  return <FullPageLoader label={c.common.loadingEllipsis} />;
}
