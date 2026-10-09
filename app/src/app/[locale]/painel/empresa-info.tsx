"use client";

import { maskCnpj } from "@/lib/cnpj";
import { useSession } from "@/components/session-context";
import { useCopy } from "@/i18n/provider";

export function EmpresaInfo() {
  const { me } = useSession();
  const c = useCopy();
  if (!me?.empresa) return null;
  return (
    <dl className="mt-2 w-full rounded-lg bg-creme p-4 text-sm">
      <div className="flex justify-between gap-4 py-1">
        <dt className="text-verde-musgo">{c.status.razaoSocial}</dt>
        <dd className="font-semibold text-verde-floresta">
          {me.empresa.razaoSocial}
        </dd>
      </div>
      <div className="flex justify-between gap-4 py-1">
        <dt className="text-verde-musgo">{c.status.cnpj}</dt>
        <dd className="font-mono text-verde-floresta">
          {maskCnpj(me.empresa.cnpj)}
        </dd>
      </div>
      <div className="flex justify-between gap-4 py-1">
        <dt className="text-verde-musgo">{c.status.perfis}</dt>
        <dd className="text-verde-floresta">
          {me.empresa.tiposPerfil.join(", ")}
        </dd>
      </div>
    </dl>
  );
}
