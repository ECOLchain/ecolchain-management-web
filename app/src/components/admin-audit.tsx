"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { friendlyMessage } from "@/lib/errors";
import type { AuditLogItem } from "@/lib/types";
import { useCopy } from "@/i18n/provider";
import { fmtDate } from "./admin-console";
import { Alert, Card, FullPageLoader } from "./ui";

export function AdminAudit() {
  const c = useCopy();
  const a = c.admin;
  const [itens, setItens] = useState<AuditLogItem[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const data = await api.listAuditLog(0);
      setItens(data?.itens ?? []);
    } catch (err) {
      setErro(friendlyMessage(err, c.errors));
      setItens([]);
    }
  }, [c.errors]);

  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar]);

  if (itens === null && !erro) return <FullPageLoader label={a.loading} />;
  return (
    <div>
      {erro ? (
        <div className="mb-4">
          <Alert tone="error">{erro}</Alert>
        </div>
      ) : null}
      <Card className="divide-y divide-verde-floresta/10 p-0">
        {(itens ?? []).length === 0 ? (
          <p className="p-4 text-sm text-verde-musgo">{a.empty}</p>
        ) : (
          (itens ?? []).map((i) => (
            <div
              key={i.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
            >
              <span className="w-36 text-xs text-verde-musgo">
                {fmtDate(i.criadoEm)}
              </span>
              <span className="font-mono text-xs font-semibold text-verde-floresta">
                {i.acao}
              </span>
              <span className="text-verde-musgo">
                {i.entidade}
                {i.entidadeId ? `:${i.entidadeId.slice(0, 8)}` : ""}
              </span>
              <span className="text-xs text-verde-musgo">{i.ator}</span>
              {i.depois ? (
                <span className="w-full text-xs text-verde-musgo">{i.depois}</span>
              ) : null}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
