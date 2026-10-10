"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { friendlyMessage } from "@/lib/errors";
import type { AuditLogPage } from "@/lib/types";
import { useCopy } from "@/i18n/provider";
import { fmtDate } from "./admin-console";
import { Alert, Button, Card, FullPageLoader } from "./ui";

const PAGE_SIZE = 50;

export function AdminAudit() {
  const c = useCopy();
  const a = c.admin;
  const [pagina, setPagina] = useState(0);
  const [page, setPage] = useState<AuditLogPage | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(
    async (p: number) => {
      try {
        const data = await api.listAuditLog(p, PAGE_SIZE);
        setPage(data ?? { itens: [], pagina: 0, tamanho: PAGE_SIZE, total: 0 });
      } catch (err) {
        setErro(friendlyMessage(err, c.errors));
        setPage({ itens: [], pagina: 0, tamanho: PAGE_SIZE, total: 0 });
      }
    },
    [c.errors],
  );

  useEffect(() => {
    void Promise.resolve().then(() => carregar(pagina));
  }, [pagina, carregar]);

  const itens = page?.itens ?? [];
  const totalPaginas = page ? Math.ceil(page.total / page.tamanho) : 0;

  if (page === null && !erro) return <FullPageLoader label={a.loading} />;
  return (
    <div>
      {erro ? (
        <div className="mb-4">
          <Alert tone="error">{erro}</Alert>
        </div>
      ) : null}
      <Card className="divide-y divide-verde-floresta/10 p-0">
        {itens.length === 0 ? (
          <p className="p-4 text-sm text-verde-musgo">{a.empty}</p>
        ) : (
          itens.map((i) => (
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
      {totalPaginas > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-verde-musgo">
          <Button
            type="button"
            variant="ghost"
            className="min-h-8 px-3 py-1 text-xs"
            disabled={pagina === 0}
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
          >
            {a.pagerPrev}
          </Button>
          <span>{a.pageOf(page?.pagina ?? 0, totalPaginas)}</span>
          <Button
            type="button"
            variant="ghost"
            className="min-h-8 px-3 py-1 text-xs"
            disabled={pagina + 1 >= totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
          >
            {a.pagerNext}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
