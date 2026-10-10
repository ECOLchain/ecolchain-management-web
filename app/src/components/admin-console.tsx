"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { friendlyMessage } from "@/lib/errors";
import { maskCnpj } from "@/lib/cnpj";
import type {
  AdminCompany,
  AdminCompanyListItem,
  CompanyStatus,
  ReviewDecision,
} from "@/lib/types";
import { useCopy, useLocale } from "@/i18n/provider";
import {
  Alert,
  Button,
  Card,
  FullPageLoader,
  TextareaField,
} from "./ui";

type Tab = "UNDER_REVIEW" | "ALL";

const STATUS_TONE: Record<CompanyStatus, string> = {
  UNDER_REVIEW: "bg-amber-100 text-amber-900",
  PENDING_UPDATE: "bg-amber-100 text-amber-900",
  PENDING_DOCUMENTS: "bg-zinc-200 text-zinc-700",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-900",
  APPROVED: "bg-verde-banda text-verde-floresta",
  REJECTED: "bg-erro-fundo text-erro-terra",
  SUSPENDED: "bg-erro-fundo text-erro-terra",
};

export function StatusBadge({ status, label }: { status: CompanyStatus; label: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[status]}`}
    >
      {label}
    </span>
  );
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function AdminCompanies() {
  const c = useCopy();
  const locale = useLocale();
  const a = c.admin;

  const [tab, setTab] = useState<Tab>("UNDER_REVIEW");
  const [lista, setLista] = useState<AdminCompanyListItem[] | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [sel, setSel] = useState<AdminCompany | null>(null);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [erroRevisao, setErroRevisao] = useState<string | null>(null);
  const [okRevisao, setOkRevisao] = useState(false);
  const [busy, setBusy] = useState<ReviewDecision | null>(null);

  const carregar = useCallback(
    async (t: Tab) => {
      try {
        const data = await api.listCompanies(
          t === "UNDER_REVIEW" ? "UNDER_REVIEW" : undefined,
        );
        setLista(data?.empresas ?? []);
      } catch (err) {
        setErroLista(friendlyMessage(err, c.errors));
        setLista([]);
      }
    },
    [c.errors],
  );

  useEffect(() => {
    void Promise.resolve().then(() => carregar(tab));
  }, [tab, carregar]);

  async function abrir(item: AdminCompanyListItem) {
    setSel(null);
    setErroDetalhe(null);
    setNota("");
    setErroRevisao(null);
    setOkRevisao(false);
    try {
      setSel(await api.getCompany(item.id));
    } catch (err) {
      setErroDetalhe(friendlyMessage(err, c.errors));
    }
  }

  async function revisar(decisao: ReviewDecision) {
    if (!sel) return;
    setErroRevisao(null);
    setOkRevisao(false);
    const n = nota.trim();
    if (decisao !== "APPROVE" && !n) {
      setErroRevisao(a.noteRequired);
      return;
    }
    setBusy(decisao);
    try {
      const atualizada = await api.reviewCompany(sel.id, {
        decisao,
        ...(n ? { nota: n } : {}),
      });
      setSel(atualizada);
      setOkRevisao(true);
      setNota("");
      carregar(tab);
    } catch (err) {
      setErroRevisao(friendlyMessage(err, c.errors));
    } finally {
      setBusy(null);
    }
  }

  async function baixarDoc(codigo: string) {
    if (!sel) return;
    try {
      const d = await api.companyDocumentUrl(sel.id, codigo);
      if (d?.url) window.open(d.url, "_blank", "noopener");
    } catch (err) {
      setErroDetalhe(friendlyMessage(err, c.errors));
    }
  }

  const revisavel =
    sel &&
    ["UNDER_REVIEW", "PENDING_UPDATE", "CHANGES_REQUESTED"].includes(sel.status);

  const rotulo = (v: { rotuloPt: string; rotuloEn: string }) =>
    locale === "en" ? v.rotuloEn : v.rotuloPt;

  return (
    <div>
        <div className="mb-4 flex gap-2">
          {(["UNDER_REVIEW", "ALL"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setLista(null);
                setErroLista(null);
                setTab(t);
              }}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                tab === t
                  ? "bg-verde-floresta text-creme"
                  : "bg-verde-banda/50 text-verde-floresta hover:bg-verde-banda"
              }`}
            >
              {t === "UNDER_REVIEW" ? a.tabReview : a.tabAll}
            </button>
          ))}
        </div>

        {erroLista ? <Alert tone="error">{erroLista}</Alert> : null}
        {lista === null ? (
          <FullPageLoader label={a.loading} />
        ) : lista.length === 0 ? (
          <Card className="text-sm text-verde-musgo">{a.empty}</Card>
        ) : (
          <Card className="divide-y divide-verde-floresta/10 p-0">
            {lista.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => abrir(e)}
                className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-creme"
              >
                <span className="min-w-48 flex-1 font-semibold text-verde-floresta">
                  {e.razaoSocial}
                  <span className="ml-2 font-mono text-xs font-normal text-verde-musgo">
                    {maskCnpj(e.cnpj)}
                  </span>
                </span>
                <span className="text-xs text-verde-musgo">
                  {e.tiposPerfil.join(", ")}
                </span>
                <StatusBadge status={e.status} label={a.status[e.status]} />
                <span className="w-36 text-right text-xs text-verde-musgo">
                  {fmtDate(e.submetidoEm)}
                </span>
              </button>
            ))}
          </Card>
        )}

        {erroDetalhe ? (
          <div className="mt-4">
            <Alert tone="error">{erroDetalhe}</Alert>
          </div>
        ) : null}

        {sel ? (
          <Card className="mt-6 flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-verde-floresta">
                {sel.razaoSocial}
                <span className="ml-2 font-mono text-sm font-normal text-verde-musgo">
                  {maskCnpj(sel.cnpj)}
                </span>
              </h2>
              <StatusBadge status={sel.status} label={a.status[sel.status]} />
            </div>

            {sel.contato ? (
              <dl className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-verde-musgo">{a.contactEmail}</dt>
                  <dd className="text-verde-floresta">{sel.contato.email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-verde-musgo">{a.contactName}</dt>
                  <dd className="text-verde-floresta">
                    {sel.contato.nomeCompleto}
                  </dd>
                </div>
              </dl>
            ) : null}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-verde-floresta">
                {a.valuesTitle}
              </h3>
              <ul className="divide-y divide-verde-floresta/10 text-sm">
                {sel.valores.map((v) => (
                  <li
                    key={v.codigo}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
                  >
                    <span className="min-w-40 flex-1 text-verde-musgo">
                      {rotulo(v)}
                      {v.obrigatorio ? " *" : ""}
                    </span>
                    {v.tipo === "DOCUMENT" ? (
                      v.documento ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-8 px-3 py-1 text-xs"
                          onClick={() => baixarDoc(v.codigo)}
                        >
                          {a.docDownload}
                        </Button>
                      ) : (
                        <span className="text-xs text-verde-musgo">
                          {a.docPending}
                        </span>
                      )
                    ) : (
                      <span className="text-verde-floresta">
                        {v.valor ?? "—"}
                      </span>
                    )}
                    {v.revisao && v.revisao.status !== "PENDING" ? (
                      <span
                        className={
                          v.revisao.status === "REJECTED"
                            ? "text-xs text-erro-terra"
                            : "text-xs text-verde-musgo"
                        }
                      >
                        {v.revisao.status}
                        {v.revisao.nota ? ` — ${v.revisao.nota}` : ""}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            {revisavel ? (
              <div className="border-t border-verde-floresta/10 pt-4">
                <h3 className="mb-2 text-sm font-semibold text-verde-floresta">
                  {a.reviewTitle}
                </h3>
                <TextareaField
                  label={a.reviewNoteLabel}
                  hint={a.reviewNoteHint}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={2}
                />
                {erroRevisao ? (
                  <div className="mt-2">
                    <Alert tone="error">{erroRevisao}</Alert>
                  </div>
                ) : null}
                {okRevisao ? (
                  <p className="mt-2 text-sm text-verde-musgo">{a.reviewedOk}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    loading={busy === "APPROVE"}
                    onClick={() => revisar("APPROVE")}
                  >
                    {a.approve}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    loading={busy === "REQUEST_CHANGES"}
                    onClick={() => revisar("REQUEST_CHANGES")}
                  >
                    {a.requestChanges}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    loading={busy === "REJECT"}
                    onClick={() => revisar("REJECT")}
                  >
                    {a.reject}
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        ) : null}
    </div>
  );
}
