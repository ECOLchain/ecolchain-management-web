"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { friendlyMessage } from "@/lib/errors";
import type {
  AdminAttribute,
  AdminProfileType,
  AttributeDefinitionBody,
  AttributeKind,
  FlowStepInput,
} from "@/lib/types";
import { useCopy, useLocale } from "@/i18n/provider";
import { Alert, Button, Card, Field, FullPageLoader } from "./ui";

interface TypeForm {
  codigo: string;
  nomePt: string;
  nomeEn: string;
  descricaoPt: string;
  descricaoEn: string;
  ordem: string;
}

const emptyTypeForm: TypeForm = {
  codigo: "",
  nomePt: "",
  nomeEn: "",
  descricaoPt: "",
  descricaoEn: "",
  ordem: "0",
};

interface AttrForm {
  codigo: string;
  tipo: AttributeKind;
  rotuloPt: string;
  rotuloEn: string;
  ajudaPt: string;
  ajudaEn: string;
  input: string;
  regex: string;
  maxLength: string;
  extensoes: string;
  tamanhoMaxBytes: string;
  ativo: boolean;
}

const emptyAttrForm: AttrForm = {
  codigo: "",
  tipo: "DATA",
  rotuloPt: "",
  rotuloEn: "",
  ajudaPt: "",
  ajudaEn: "",
  input: "",
  regex: "",
  maxLength: "",
  extensoes: "",
  tamanhoMaxBytes: "",
  ativo: true,
};

function attrToForm(at: AdminAttribute): AttrForm {
  return {
    codigo: at.codigo,
    tipo: at.tipo,
    rotuloPt: at.rotuloPt,
    rotuloEn: at.rotuloEn,
    ajudaPt: at.ajudaPt ?? "",
    ajudaEn: at.ajudaEn ?? "",
    input: at.regras?.input ?? "",
    regex: at.regras?.regex ?? "",
    maxLength: at.regras?.maxLength ? String(at.regras.maxLength) : "",
    extensoes: (at.regras?.extensoesPermitidas ?? []).join(","),
    tamanhoMaxBytes: at.regras?.tamanhoMaxBytes
      ? String(at.regras.tamanhoMaxBytes)
      : "",
    ativo: at.ativo,
  };
}

function formToAttr(f: AttrForm): AttributeDefinitionBody {
  const exts = f.extensoes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const regras =
    f.input || f.regex || f.maxLength || exts.length || f.tamanhoMaxBytes
      ? {
          input: f.input || null,
          regex: f.regex || null,
          maxLength: f.maxLength ? Number(f.maxLength) : null,
          extensoesPermitidas: exts.length ? exts : null,
          tamanhoMaxBytes: f.tamanhoMaxBytes ? Number(f.tamanhoMaxBytes) : null,
        }
      : null;
  return {
    codigo: f.codigo.trim(),
    tipo: f.tipo,
    rotuloPt: f.rotuloPt.trim(),
    rotuloEn: f.rotuloEn.trim(),
    ajudaPt: f.ajudaPt.trim() || null,
    ajudaEn: f.ajudaEn.trim() || null,
    regras,
    ativo: f.ativo,
  };
}

function typeToFlow(t: AdminProfileType): FlowStepInput[] {
  return t.passos.map((p) => ({
    codigo: p.codigo,
    tituloPt: p.tituloPt,
    tituloEn: p.tituloEn,
    atributos: p.atributos.map((at) => ({
      codigo: at.codigo,
      obrigatorio: at.obrigatorio,
    })),
  }));
}

export function AdminCatalog() {
  const c = useCopy();
  const locale = useLocale();
  const a = c.admin;
  const [tipos, setTipos] = useState<AdminProfileType[] | null>(null);
  const [atributos, setAtributos] = useState<AdminAttribute[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<TypeForm | null>(null);
  const [flowDraft, setFlowDraft] = useState<FlowStepInput[] | null>(null);
  const [novoTipo, setNovoTipo] = useState<TypeForm | null>(null);
  const [attrForm, setAttrForm] = useState<AttrForm | null>(null);
  const [verAtributos, setVerAtributos] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [ts, ats] = await Promise.all([
        api.listProfileTypesAdmin(),
        api.listAttributesAdmin(),
      ]);
      setTipos(ts);
      setAtributos(ats);
    } catch (err) {
      setErro(friendlyMessage(err, c.errors));
      setTipos([]);
    }
  }, [c.errors]);

  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar]);

  function selecionar(t: AdminProfileType) {
    if (aberto === t.codigo) {
      setAberto(null);
      setEditForm(null);
      setFlowDraft(null);
      return;
    }
    setAberto(t.codigo);
    setEditForm({
      codigo: t.codigo,
      nomePt: t.nomePt,
      nomeEn: t.nomeEn,
      descricaoPt: t.descricaoPt ?? "",
      descricaoEn: t.descricaoEn ?? "",
      ordem: String(t.ordem),
    });
    setFlowDraft(typeToFlow(t));
  }

  async function toggleAtivo(t: AdminProfileType) {
    setBusy(t.codigo);
    setErro(null);
    setOkMsg(null);
    try {
      const novo = await api.patchProfileType(t.codigo, { ativo: !t.ativo });
      if (novo)
        setTipos((ts) => ts?.map((x) => (x.codigo === t.codigo ? novo : x)) ?? ts);
    } catch (err) {
      setErro(friendlyMessage(err, c.errors));
    } finally {
      setBusy(null);
    }
  }

  async function salvarTipo(codigo: string) {
    if (!editForm) return;
    setBusy(`edit-${codigo}`);
    setErro(null);
    setOkMsg(null);
    try {
      const novo = await api.patchProfileType(codigo, {
        nomePt: editForm.nomePt.trim(),
        nomeEn: editForm.nomeEn.trim(),
        descricaoPt: editForm.descricaoPt.trim() || null,
        descricaoEn: editForm.descricaoEn.trim() || null,
        ordem: Number(editForm.ordem) || 0,
      });
      if (novo)
        setTipos((ts) => ts?.map((x) => (x.codigo === codigo ? novo : x)) ?? ts);
      setOkMsg(a.savedOk);
    } catch (err) {
      setErro(friendlyMessage(err, c.errors));
    } finally {
      setBusy(null);
    }
  }

  async function criarTipo() {
    if (!novoTipo) return;
    setBusy("new-type");
    setErro(null);
    setOkMsg(null);
    try {
      await api.createProfileType({
        codigo: novoTipo.codigo.trim().toUpperCase(),
        nomePt: novoTipo.nomePt.trim(),
        nomeEn: novoTipo.nomeEn.trim(),
        descricaoPt: novoTipo.descricaoPt.trim() || null,
        descricaoEn: novoTipo.descricaoEn.trim() || null,
        ordem: Number(novoTipo.ordem) || 0,
      });
      setNovoTipo(null);
      setOkMsg(a.savedOk);
      await carregar();
    } catch (err) {
      setErro(friendlyMessage(err, c.errors));
    } finally {
      setBusy(null);
    }
  }

  async function salvarFluxo(codigo: string) {
    if (!flowDraft) return;
    setBusy(`flow-${codigo}`);
    setErro(null);
    setOkMsg(null);
    try {
      const novo = await api.replaceProfileTypeFlow(codigo, flowDraft);
      if (novo)
        setTipos((ts) => ts?.map((x) => (x.codigo === codigo ? novo : x)) ?? ts);
      setOkMsg(a.savedOk);
    } catch (err) {
      setErro(friendlyMessage(err, c.errors));
    } finally {
      setBusy(null);
    }
  }

  function editarPasso(
    idx: number,
    patch: Partial<Omit<FlowStepInput, "atributos">>,
  ) {
    setFlowDraft((f) =>
      f ? f.map((p, i) => (i === idx ? { ...p, ...patch } : p)) : f,
    );
  }

  function editarAttrPasso(
    passoIdx: number,
    attrIdx: number,
    patch: Partial<{ codigo: string; obrigatorio: boolean }>,
  ) {
    setFlowDraft((f) =>
      f
        ? f.map((p, i) =>
            i === passoIdx
              ? {
                  ...p,
                  atributos: p.atributos.map((at, j) =>
                    j === attrIdx ? { ...at, ...patch } : at,
                  ),
                }
              : p,
          )
        : f,
    );
  }

  async function salvarAtributo() {
    if (!attrForm) return;
    setBusy("attr");
    setErro(null);
    setOkMsg(null);
    try {
      await api.upsertAttribute(formToAttr(attrForm));
      setAttrForm(null);
      setOkMsg(a.savedOk);
      await carregar();
    } catch (err) {
      setErro(friendlyMessage(err, c.errors));
    } finally {
      setBusy(null);
    }
  }

  const txt = (pt: string, en: string | null) =>
    locale === "en" ? (en ?? pt) : pt;

  const inputCls =
    "w-full rounded-md border border-verde-floresta/20 bg-white px-3 py-1.5 text-sm text-verde-floresta placeholder:text-verde-musgo/60";

  if (tipos === null && !erro) return <FullPageLoader label={a.loading} />;
  return (
    <div className="flex flex-col gap-6">
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      {okMsg ? <Alert tone="success">{okMsg}</Alert> : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-verde-floresta">
              {a.catalogTitle}
            </h2>
            <p className="text-xs text-verde-musgo">{a.catalogSub}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="min-h-8 px-3 py-1 text-xs"
            onClick={() => setNovoTipo(novoTipo ? null : { ...emptyTypeForm })}
          >
            {a.newTypeTitle}
          </Button>
        </div>

        {novoTipo ? (
          <Card className="mb-4 flex flex-col gap-3 p-4">
            <h3 className="text-sm font-semibold text-verde-floresta">
              {a.newTypeTitle}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={a.codeLabel}
                value={novoTipo.codigo}
                onChange={(e) =>
                  setNovoTipo({ ...novoTipo, codigo: e.target.value.toUpperCase() })
                }
                placeholder="NOVO_TIPO"
                required
              />
              <Field
                label={a.orderLabel}
                type="number"
                value={novoTipo.ordem}
                onChange={(e) =>
                  setNovoTipo({ ...novoTipo, ordem: e.target.value })
                }
              />
              <Field
                label={a.namePtLabel}
                value={novoTipo.nomePt}
                onChange={(e) =>
                  setNovoTipo({ ...novoTipo, nomePt: e.target.value })
                }
                required
              />
              <Field
                label={a.nameEnLabel}
                value={novoTipo.nomeEn}
                onChange={(e) =>
                  setNovoTipo({ ...novoTipo, nomeEn: e.target.value })
                }
                required
              />
              <Field
                label={a.descPtLabel}
                value={novoTipo.descricaoPt}
                onChange={(e) =>
                  setNovoTipo({ ...novoTipo, descricaoPt: e.target.value })
                }
              />
              <Field
                label={a.descEnLabel}
                value={novoTipo.descricaoEn}
                onChange={(e) =>
                  setNovoTipo({ ...novoTipo, descricaoEn: e.target.value })
                }
              />
            </div>
            <div>
              <Button
                type="button"
                loading={busy === "new-type"}
                disabled={
                  !novoTipo.codigo.trim() ||
                  !novoTipo.nomePt.trim() ||
                  !novoTipo.nomeEn.trim()
                }
                onClick={criarTipo}
              >
                {a.createType}
              </Button>
            </div>
          </Card>
        ) : null}

        <div className="flex flex-col gap-3">
          {(tipos ?? []).map((t) => (
            <Card key={t.codigo} className="p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <button
                  type="button"
                  onClick={() => selecionar(t)}
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
                  onClick={() => selecionar(t)}
                >
                  {a.editType}
                </Button>
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

              {aberto === t.codigo && editForm && flowDraft ? (
                <div className="mt-3 flex flex-col gap-5 border-t border-verde-floresta/10 pt-3 text-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label={a.namePtLabel}
                      value={editForm.nomePt}
                      onChange={(e) =>
                        setEditForm({ ...editForm, nomePt: e.target.value })
                      }
                    />
                    <Field
                      label={a.nameEnLabel}
                      value={editForm.nomeEn}
                      onChange={(e) =>
                        setEditForm({ ...editForm, nomeEn: e.target.value })
                      }
                    />
                    <Field
                      label={a.descPtLabel}
                      value={editForm.descricaoPt}
                      onChange={(e) =>
                        setEditForm({ ...editForm, descricaoPt: e.target.value })
                      }
                    />
                    <Field
                      label={a.descEnLabel}
                      value={editForm.descricaoEn}
                      onChange={(e) =>
                        setEditForm({ ...editForm, descricaoEn: e.target.value })
                      }
                    />
                    <Field
                      label={a.orderLabel}
                      type="number"
                      value={editForm.ordem}
                      onChange={(e) =>
                        setEditForm({ ...editForm, ordem: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-8 px-3 py-1 text-xs"
                      loading={busy === `edit-${t.codigo}`}
                      onClick={() => salvarTipo(t.codigo)}
                    >
                      {a.saveType}
                    </Button>
                  </div>

                  <div>
                    <h4 className="mb-2 font-semibold text-verde-floresta">
                      {a.flowTitle}
                    </h4>
                    {flowDraft.map((p, pi) => (
                      <div
                        key={pi}
                        className="mb-3 rounded-lg border border-verde-floresta/10 p-3"
                      >
                        <div className="mb-2 grid gap-2 sm:grid-cols-3">
                          <input
                            className={inputCls}
                            placeholder={a.stepCodePh}
                            value={p.codigo}
                            onChange={(e) =>
                              editarPasso(pi, { codigo: e.target.value })
                            }
                          />
                          <input
                            className={inputCls}
                            placeholder={a.stepTitlePtPh}
                            value={p.tituloPt}
                            onChange={(e) =>
                              editarPasso(pi, { tituloPt: e.target.value })
                            }
                          />
                          <input
                            className={inputCls}
                            placeholder={a.stepTitleEnPh}
                            value={p.tituloEn}
                            onChange={(e) =>
                              editarPasso(pi, { tituloEn: e.target.value })
                            }
                          />
                        </div>
                        <p className="mb-1 text-xs font-medium text-verde-musgo">
                          {a.stepAttrs}
                        </p>
                        <ul className="divide-y divide-verde-floresta/10">
                          {p.atributos.map((at, ai) => (
                            <li
                              key={ai}
                              className="flex items-center gap-2 py-1.5"
                            >
                              <input
                                className={`${inputCls} max-w-56 font-mono text-xs`}
                                list="attr-codes"
                                value={at.codigo}
                                onChange={(e) =>
                                  editarAttrPasso(pi, ai, {
                                    codigo: e.target.value,
                                  })
                                }
                              />
                              <label className="flex items-center gap-1 text-xs text-verde-musgo">
                                <input
                                  type="checkbox"
                                  className="h-3.5 w-3.5 accent-verde-tinta"
                                  checked={at.obrigatorio}
                                  onChange={(e) =>
                                    editarAttrPasso(pi, ai, {
                                      obrigatorio: e.target.checked,
                                    })
                                  }
                                />
                                {a.attrRequired}
                              </label>
                              <button
                                type="button"
                                className="ml-auto text-xs text-erro-terra hover:underline"
                                onClick={() =>
                                  setFlowDraft((f) =>
                                    f
                                      ? f.map((x, i) =>
                                          i === pi
                                            ? {
                                                ...x,
                                                atributos: x.atributos.filter(
                                                  (_, j) => j !== ai,
                                                ),
                                              }
                                            : x,
                                        )
                                      : f,
                                  )
                                }
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            className="min-h-7 px-2 py-0.5 text-xs"
                            onClick={() =>
                              setFlowDraft((f) =>
                                f
                                  ? f.map((x, i) =>
                                      i === pi
                                        ? {
                                            ...x,
                                            atributos: [
                                              ...x.atributos,
                                              { codigo: "", obrigatorio: true },
                                            ],
                                          }
                                        : x,
                                    )
                                  : f,
                              )
                            }
                          >
                            {a.addAttr}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="min-h-7 px-2 py-0.5 text-xs text-erro-terra"
                            onClick={() =>
                              setFlowDraft((f) =>
                                f ? f.filter((_, i) => i !== pi) : f,
                              )
                            }
                          >
                            {a.removeStep}
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-8 px-3 py-1 text-xs"
                        onClick={() =>
                          setFlowDraft((f) =>
                            f
                              ? [
                                  ...f,
                                  {
                                    codigo: "",
                                    tituloPt: "",
                                    tituloEn: "",
                                    atributos: [],
                                  },
                                ]
                              : f,
                          )
                        }
                      >
                        {a.addStep}
                      </Button>
                      <Button
                        type="button"
                        className="min-h-8 px-3 py-1 text-xs"
                        loading={busy === `flow-${t.codigo}`}
                        onClick={() => salvarFluxo(t.codigo)}
                      >
                        {a.saveFlow}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-verde-floresta">
            {a.attrsTitle}
          </h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="min-h-8 px-3 py-1 text-xs"
              onClick={() => setVerAtributos((v) => !v)}
            >
              {a.attrsTitle} ({atributos.length})
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-8 px-3 py-1 text-xs"
              onClick={() =>
                setAttrForm(attrForm ? null : { ...emptyAttrForm })
              }
            >
              {a.newAttrTitle}
            </Button>
          </div>
        </div>

        {attrForm ? (
          <Card className="mb-4 flex flex-col gap-3 p-4">
            <h3 className="text-sm font-semibold text-verde-floresta">
              {attrForm.codigo
                ? `${a.editType}: ${attrForm.codigo}`
                : a.newAttrTitle}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={a.codeLabel}
                value={attrForm.codigo}
                onChange={(e) =>
                  setAttrForm({ ...attrForm, codigo: e.target.value })
                }
                placeholder="novo_atributo"
                required
              />
              <div className="flex flex-col gap-1">
                <label className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-verde-musgo">
                  {a.attrTypeLabel}
                </label>
                <select
                  className={inputCls}
                  value={attrForm.tipo}
                  onChange={(e) =>
                    setAttrForm({
                      ...attrForm,
                      tipo: e.target.value as AttributeKind,
                    })
                  }
                >
                  <option value="DATA">{a.kindData}</option>
                  <option value="DOCUMENT">{a.kindDoc}</option>
                </select>
              </div>
              <Field
                label={a.labelPtLabel}
                value={attrForm.rotuloPt}
                onChange={(e) =>
                  setAttrForm({ ...attrForm, rotuloPt: e.target.value })
                }
                required
              />
              <Field
                label={a.labelEnLabel}
                value={attrForm.rotuloEn}
                onChange={(e) =>
                  setAttrForm({ ...attrForm, rotuloEn: e.target.value })
                }
                required
              />
              <Field
                label={a.helpPtLabel}
                value={attrForm.ajudaPt}
                onChange={(e) =>
                  setAttrForm({ ...attrForm, ajudaPt: e.target.value })
                }
              />
              <Field
                label={a.helpEnLabel}
                value={attrForm.ajudaEn}
                onChange={(e) =>
                  setAttrForm({ ...attrForm, ajudaEn: e.target.value })
                }
              />
              {attrForm.tipo === "DATA" ? (
                <>
                  <Field
                    label="input"
                    value={attrForm.input}
                    onChange={(e) =>
                      setAttrForm({ ...attrForm, input: e.target.value })
                    }
                    placeholder="text"
                  />
                  <Field
                    label="regex"
                    value={attrForm.regex}
                    onChange={(e) =>
                      setAttrForm({ ...attrForm, regex: e.target.value })
                    }
                  />
                  <Field
                    label="maxLength"
                    type="number"
                    value={attrForm.maxLength}
                    onChange={(e) =>
                      setAttrForm({ ...attrForm, maxLength: e.target.value })
                    }
                  />
                </>
              ) : (
                <>
                  <Field
                    label="extensoesPermitidas"
                    value={attrForm.extensoes}
                    onChange={(e) =>
                      setAttrForm({ ...attrForm, extensoes: e.target.value })
                    }
                    placeholder="pdf,jpg,png"
                  />
                  <Field
                    label="tamanhoMaxBytes"
                    type="number"
                    value={attrForm.tamanhoMaxBytes}
                    onChange={(e) =>
                      setAttrForm({
                        ...attrForm,
                        tamanhoMaxBytes: e.target.value,
                      })
                    }
                  />
                </>
              )}
              <label className="flex items-center gap-2 text-sm text-verde-floresta">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-verde-tinta"
                  checked={attrForm.ativo}
                  onChange={(e) =>
                    setAttrForm({ ...attrForm, ativo: e.target.checked })
                  }
                />
                {a.active}
              </label>
            </div>
            <div>
              <Button
                type="button"
                loading={busy === "attr"}
                disabled={
                  !attrForm.codigo.trim() ||
                  !attrForm.rotuloPt.trim() ||
                  !attrForm.rotuloEn.trim()
                }
                onClick={salvarAtributo}
              >
                {a.createAttr}
              </Button>
            </div>
          </Card>
        ) : null}

        {verAtributos ? (
          <Card className="divide-y divide-verde-floresta/10 p-0">
            {atributos.map((at) => (
              <div
                key={at.codigo}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm"
              >
                <button
                  type="button"
                  className="flex-1 text-left text-verde-floresta hover:underline"
                  onClick={() => setAttrForm(attrToForm(at))}
                >
                  {txt(at.rotuloPt, at.rotuloEn)}
                </button>
                <span className="font-mono text-xs text-verde-musgo">
                  {at.codigo}
                </span>
                <span className="text-xs text-verde-musgo">
                  {at.tipo === "DOCUMENT" ? a.kindDoc : a.kindData}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    at.ativo
                      ? "bg-verde-banda text-verde-floresta"
                      : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {at.ativo ? a.active : a.inactive}
                </span>
              </div>
            ))}
          </Card>
        ) : null}
      </section>

      <datalist id="attr-codes">
        {atributos.map((at) => (
          <option key={at.codigo} value={at.codigo} />
        ))}
      </datalist>
    </div>
  );
}
