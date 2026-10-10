"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { friendlyMessage } from "@/lib/errors";
import type { AdminProfileType } from "@/lib/types";
import { useCopy, useLocale } from "@/i18n/provider";
import { Alert, Button, Card, FullPageLoader } from "./ui";

export function AdminCatalog() {
  const c = useCopy();
  const locale = useLocale();
  const a = c.admin;
  const [tipos, setTipos] = useState<AdminProfileType[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setTipos(await api.listProfileTypesAdmin());
    } catch (err) {
      setErro(friendlyMessage(err, c.errors));
      setTipos([]);
    }
  }, [c.errors]);

  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar]);

  async function toggleAtivo(t: AdminProfileType) {
    setBusy(t.codigo);
    setErro(null);
    try {
      const novo = await api.patchProfileType(t.codigo, { ativo: !t.ativo });
      if (novo) setTipos((ts) => ts?.map((x) => (x.codigo === t.codigo ? novo : x)) ?? ts);
    } catch (err) {
      setErro(friendlyMessage(err, c.errors));
    } finally {
      setBusy(null);
    }
  }

  const txt = (pt: string, en: string | null) => (locale === "en" ? (en ?? pt) : pt);

  if (tipos === null && !erro) return <FullPageLoader label={a.loading} />;
  return (
    <div>
      {erro ? (
        <div className="mb-4">
          <Alert tone="error">{erro}</Alert>
        </div>
      ) : null}
      <div className="flex flex-col gap-3">
        {(tipos ?? []).map((t) => (
          <Card key={t.codigo} className="p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={() => setAberto(aberto === t.codigo ? null : t.codigo)}
                className="flex-1 text-left font-semibold text-verde-floresta"
              >
                {txt(t.nomePt, t.nomeEn)}
                <span className="ml-2 font-mono text-xs font-normal text-verde-musgo">
                  {t.codigo}
                </span>
              </button>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  t.ativo
                    ? "bg-verde-banda text-verde-floresta"
                    : "bg-zinc-200 text-zinc-600"
                }`}
              >
                {t.ativo ? a.active : a.inactive}
              </span>
              <Button
                type="button"
                variant="ghost"
                className="min-h-8 px-3 py-1 text-xs"
                loading={busy === t.codigo}
                onClick={() => toggleAtivo(t)}
              >
                {t.ativo ? a.deactivate : a.activate}
              </Button>
            </div>
            {aberto === t.codigo ? (
              <div className="mt-3 border-t border-verde-floresta/10 pt-3 text-sm">
                {txt(t.descricaoPt ?? "", t.descricaoEn) ? (
                  <p className="mb-3 text-verde-musgo">
                    {txt(t.descricaoPt ?? "", t.descricaoEn)}
                  </p>
                ) : null}
                {t.passos.map((p) => (
                  <div key={p.codigo} className="mb-3">
                    <h4 className="font-semibold text-verde-floresta">
                      {txt(p.tituloPt, p.tituloEn)}
                    </h4>
                    <ul className="mt-1 divide-y divide-verde-floresta/10">
                      {p.atributos.map((at) => (
                        <li
                          key={at.codigo}
                          className="flex items-center gap-2 py-1 text-verde-musgo"
                        >
                          <span className="flex-1">
                            {txt(at.definicao.rotuloPt, at.definicao.rotuloEn)}
                          </span>
                          <span className="font-mono text-xs">{at.codigo}</span>
                          <span className="text-xs">
                            {at.definicao.tipo === "DOCUMENT" ? a.kindDoc : a.kindData}
                            {at.obrigatorio ? ` · ${a.requiredShort}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
