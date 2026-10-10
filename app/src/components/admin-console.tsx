"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { friendlyMessage } from "@/lib/errors";
import { maskCnpj } from "@/lib/cnpj";
import type {
  AdminCompany,
  AdminCompanyList,
  CompanyStatus,
  ItemDecision,
  ReviewDecision,
  ReviewItem,
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

const PAGE_SIZE = 20;

const STATUS_TONE: Record<CompanyStatus, string> = {
  UNDER_REVIEW: "bg-amber-100 text-amber-900",
  PENDING_UPDATE: "bg-amber-100 text-amber-900",
  PENDING_DOCUMENTS: "bg-zinc-200 text-zinc-700",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-900",
  APPROVED: "bg-verde-banda text-verde-floresta",
  REJECTED: "bg-erro-fundo text-erro-terra",
  SUSPENDED: "bg-erro-fundo text-erro-terra",
};

const ITEM_TONE: Record<ItemDecision, string> = {
  ACCEPT: "bg-verde-banda text-verde-floresta border-verde-musgo",
  REJECT: "bg-erro-fundo text-erro-terra border-erro-terra",
};

interface ItemMark {
  decisao: ItemDecision | null;
  nota: string;
}

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
  const [pagina, setPagina] = useState(0);
  const [lista, setLista] = useState<AdminCompanyList | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [sel, setSel] = useState<AdminCompany | null>(null);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [itens, setItens] = useState<Record<string, ItemMark>>({});
  const [erroRevisao, setErroRevisao] = useState<string | null>(null);
  const [okRevisao, setOkRevisao] = useState(false);
  const [busy, setBusy] = useState<ReviewDecision | null>(null);

  const carregar = useCallback(
    async (t: Tab, p: number) => {
      try {
        const data = await api.listCompanies(
          t === "UNDER_REVIEW" ? "UNDER_REVIEW" : undefined,
          p,
          PAGE_SIZE,
        );
        setLista(
          data ?? { empresas: [], pagina: 0, tamanho: PAGE_SIZE, total: 0 },
        );
      } catch (err) {
        setErroLista(friendlyMessage(err, c.errors));
        setLista({ empresas: [], pagina: 0, tamanho: PAGE_SIZE, total: 0 });
      }
    },
    [c.errors],
  );

  useEffect(() => {
    void Promise.resolve().then(() => carregar(tab, pagina));
  }, [tab, pagina, carregar]);

  async function abrir(id: string) {
    setSel(null);
    setErroDetalhe(null);
    setNota("");
    setItens({});
    setErroRevisao(null);
    setOkRevisao(false);
    try {
      const detalhe = await api.getCompany(id);
      setSel(detalhe);
      // Inicializa as marcas a partir da revisão já registrada.
      const marcas: Record<string, ItemMark> = {};
      for (const v of detalhe?.valores ?? []) {
        const st = v.revisao?.status;
        marcas[v.codigo] = {
          decisao: st === "ACCEPTED" ? "ACCEPT" : st === "REJECTED" ? "REJECT" : null,
          nota: v.revisao?.nota ?? "",
        };
      }
      setItens(marcas);
    } catch (err) {
      setErroDetalhe(friendlyMessage(err, c.errors));
    }
  }

  function marcar(codigo: string, decisao: ItemDecision | null) {
    setItens((m) => ({
      ...m,
      [codigo]: { decisao, nota: m[codigo]?.nota ?? "" },
    }));
  }

  function notaItem(codigo: string, texto: string) {
    setItens((m) => ({
      ...m,
      [codigo]: { decisao: m[codigo]?.decisao ?? null, nota: texto },
    }));
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
    const itensReview: ReviewItem[] = Object.entries(itens)
      .filter(([, m]) => m.decisao !== null)
      .map(([atributo, m]) => ({
        atributo,
        decisao: m.decisao as ItemDecision,
        ...(m.nota.trim() ? { nota: m.nota.trim() } : {}),
      }));
    setBusy(decisao);
    try {
      const atualizada = await api.reviewCompany(sel.id, {
        decisao,
        ...(n ? { nota: n } : {}),
        ...(itensReview.length > 0 ? { itens: itensReview } : {}),
      });
      setSel(atualizada);
      setOkRevisao(true);
      setNota("");
      carregar(tab, pagina);
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

  const totalPaginas = lista ? Math.ceil(lista.total / lista.tamanho) : 0;

  const rotulo = (v: { rotuloPt: string; rotuloEn: string }) =>
    locale === "en" ? v.rotuloEn : v.rotuloPt;

  const itemStatusLabel = (v: AdminCompany["valores"][number]) => {
    const st = v.revisao?.status;
    if (st === "ACCEPTED") return a.itemAccepted;
    if (st === "REJECTED") return a.itemRejected;
    if (st === "UPLOADED" || v.documento) return a.itemStatusUploaded;
    return a.itemReviewPending;
  };

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
                setPagina(0);
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
        ) : lista.empresas.length === 0 ? (
          <Card className="text-sm text-verde-musgo">{a.empty}</Card>
        ) : (
          <>
            <Card className="divide-y divide-verde-floresta/10 p-0">
              {lista.empresas.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => abrir(e.id)}
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
                <span>{a.pageOf(lista.pagina, totalPaginas)}</span>
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
          </>
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

            <dl className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
              {sel.contato ? (
                <>
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
                </>
              ) : null}
              {sel.carteira ? (
                <div className="flex justify-between gap-4 sm:col-span-2">
                  <dt className="text-verde-musgo">{a.wallet}</dt>
                  <dd className="break-all font-mono text-xs text-verde-floresta">
                    {sel.carteira}
                  </dd>
                </div>
              ) : null}
            </dl>

            <div>
              <h3 className="mb-1 text-sm font-semibold text-verde-floresta">
                {a.valuesTitle}
              </h3>
              {revisavel ? (
                <p className="mb-2 text-xs text-verde-musgo/80">{a.itemsHint}</p>
              ) : null}
              <ul className="divide-y divide-verde-floresta/10 text-sm">
                {sel.valores.map((v) => {
                  const marca = itens[v.codigo];
                  return (
                    <li key={v.codigo} className="py-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="min-w-40 flex-1 text-verde-musgo">
                          {rotulo(v)}
                          {v.obrigatorio ? " *" : ""}
                          <span className="ml-2 text-xs text-verde-musgo/70">
                            ({v.tipo === "DOCUMENT" ? a.kindDoc : a.kindData})
                          </span>
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
                          <span className="break-all text-verde-floresta">
                            {v.valor ?? "—"}
                          </span>
                        )}
                        <span
                          className={
                            v.revisao?.status === "REJECTED"
                              ? "text-xs font-semibold text-erro-terra"
                              : v.revisao?.status === "ACCEPTED"
                                ? "text-xs font-semibold text-verde-musgo"
                                : "text-xs text-verde-musgo/70"
                          }
                        >
                          {itemStatusLabel(v)}
                          {v.revisao?.nota ? ` — ${v.revisao.nota}` : ""}
                        </span>
                        {revisavel ? (
                          <span className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`${a.itemAccept} ${v.codigo}`}
                              title={a.itemAccept}
                              onClick={() =>
                                marcar(
                                  v.codigo,
                                  marca?.decisao === "ACCEPT" ? null : "ACCEPT",
                                )
                              }
                              className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                                marca?.decisao === "ACCEPT"
                                  ? ITEM_TONE.ACCEPT
                                  : "border-verde-floresta/20 text-verde-musgo hover:bg-verde-banda"
                              }`}
                            >
                              <Check className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              aria-label={`${a.itemReject} ${v.codigo}`}
                              title={a.itemReject}
                              onClick={() =>
                                marcar(
                                  v.codigo,
                                  marca?.decisao === "REJECT" ? null : "REJECT",
                                )
                              }
                              className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                                marca?.decisao === "REJECT"
                                  ? ITEM_TONE.REJECT
                                  : "border-verde-floresta/20 text-verde-musgo hover:bg-erro-fundo"
                              }`}
                            >
                              <X className="h-4 w-4" aria-hidden />
                            </button>
                          </span>
                        ) : null}
                      </div>
                      {revisavel && marca?.decisao === "REJECT" ? (
                        <input
                          type="text"
                          className="mt-2 w-full rounded-md border border-erro-terra/40 bg-white px-3 py-1.5 text-xs text-verde-floresta placeholder:text-verde-musgo/60"
                          placeholder={a.itemNotePh}
                          value={marca.nota}
                          onChange={(e) => notaItem(v.codigo, e.target.value)}
                        />
                      ) : null}
                    </li>
                  );
                })}
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
                  <Button
                    type="button"
                    variant="danger"
                    loading={busy === "SUSPEND"}
                    onClick={() => revisar("SUSPEND")}
                  >
                    {a.suspend}
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        ) : null}
    </div>
  );
}
