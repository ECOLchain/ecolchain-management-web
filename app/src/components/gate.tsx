"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "./session-context";
import { routeForStep } from "@/lib/steps";
import type { NextStep } from "@/lib/types";
import { FullPageLoader } from "./ui";

/**
 * Guarda de rota: exige sessão; quando `proximoPasso` (decidido no servidor)
 * não corresponde a esta tela, redireciona para a rota certa.
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

  useEffect(() => {
    if (state === "anon") {
      router.replace("/login");
      return;
    }
    if (state === "authed" && me && !allow.includes(me.proximoPasso)) {
      const destino = routeForStep(me.proximoPasso);
      if (destino !== pathname) router.replace(destino);
    }
  }, [state, me, allow, router, pathname]);

  if (state !== "authed" || !me) {
    return <FullPageLoader label="Carregando sua sessão..." />;
  }
  if (!allow.includes(me.proximoPasso)) {
    return <FullPageLoader label="Redirecionando..." />;
  }
  return <>{children}</>;
}

/** Raiz `/`: resolve a sessão e encaminha para a tela do `proximoPasso`. */
export function RootGate() {
  const { state, me } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (state === "anon") router.replace("/login");
    else if (state === "authed" && me) router.replace(routeForStep(me.proximoPasso));
  }, [state, me, router]);

  return <FullPageLoader label="Carregando..." />;
}
