"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileText,
  Send,
} from "lucide-react";
import { api, UnauthorizedError } from "@/lib/api";
import { ApiError, friendlyMessage } from "@/lib/errors";
import { useSession } from "./session-context";
import { useCopy } from "@/i18n/provider";
import { DocumentCard, docState } from "./document-card";
import {
  Alert,
  Button,
  Card,
  Field,
  FullPageLoader,
  TextareaField,
  cn,
} from "./ui";
import type {
  OnboardingAttribute,
  OnboardingData,
  OnboardingStep,
} from "@/lib/types";

export function OnboardingFlow() {
  const { expire, reloadMe } = useSession();
  const c = useCopy();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [passoAtual, setPassoAtual] = useState(0);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [sujos, setSujos] = useState<Set<string>>(new Set());
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});
  const [pendentes, setPendentes] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);
  const [submetendo, setSubmetendo] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Recarrega o schema do servidor. Valores de campos ainda "sujos"
  // (editados e não salvos) são preservados sobre os dados vindos do servidor.
  const carregar = useCallback(async () => {
    try {
      const d = await api.getOnboarding();
      if (!d) throw new Error("empty");
      setData(d);
      setValores((prev) => {
        const inicial: Record<string, string> = {};
        for (const p of d.passos)
          for (const a of p.atributos)
            if (a.tipo === "DATA")
              inicial[a.codigo] = sujosRef.current.has(a.codigo)
                ? (prev[a.codigo] ?? a.valor ?? "")
                : (a.valor ?? "");
        return inicial;
      });
      return d;
    } catch (err) {
      if (err instanceof UnauthorizedError) expire();
      else setErro(friendlyMessage(err, c.errors));
      return null;
    }
  }, [expire, c]);

  // sujos espelhado em ref (atualizado só nos handlers) para o merge de
  // carregar() não depender de estado stale dentro do setValores.
  const sujosRef = useRef<Set<string>>(new Set());

  // Callback assíncrono: a primeira carga acontece após o mount.
  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar]);

  const passos = useMemo(() => data?.passos ?? [], [data]);

  // Um atributo está completo: DATA com valor gravado, DOCUMENT confirmado.
  const completo = useCallback(
    (a: OnboardingAttribute): boolean => {
      if (a.tipo === "DOCUMENT") return docState(a) !== "PENDING_UPLOAD";
      return (a.valor ?? "").trim().length > 0;
    },
    [],
  );

  const passoCompleto = useCallback(
    (p: OnboardingStep): boolean =>
      p.atributos.every((a) => !a.obrigatorio || completo(a)),
    [completo],
  );

  const primeiroIncompleto = useCallback((): number => {
    const i = passos.findIndex((p) => !passoCompleto(p));
    return i === -1 ? 0 : i;
  }, [passos, passoCompleto]);

  function editar(code: string, v: string) {
    setValores((prev) => ({ ...prev, [code]: v }));
    sujosRef.current.add(code);
    setSujos(new Set(sujosRef.current));
    setErrosCampo((prev) => {
      if (!prev[code]) return prev;
      const next = { ...prev };
      delete next[code];
      return next;
    });
  }

  function validarPasso(passo: OnboardingStep): boolean {
    const erros: Record<string, string> = {};
    for (const a of passo.atributos) {
      if (a.tipo !== "DATA") continue;
      const v = (valores[a.codigo] ?? "").trim();
      if (a.obrigatorio && !v) {
        erros[a.codigo] = c.common.required;
        continue;
      }
      if (!v) continue;
      if (a.regras?.maxLength && v.length > a.regras.maxLength) {
        erros[a.codigo] = c.common.maxChars(a.regras.maxLength);
        continue;
      }
      if (a.regras?.regex) {
        try {
          if (!new RegExp(`^(?:${a.regras.regex})$`).test(v))
            erros[a.codigo] = c.common.invalidFormat;
        } catch {
          // Regex Java sem equivalente JS: valida só no servidor.
        }
      }
    }
    setErrosCampo((prev) => ({ ...prev, ...erros }));
    return Object.keys(erros).length === 0;
  }

  async function salvarPasso(passo: OnboardingStep, avancar: boolean) {
    setErro(null);
    if (!validarPasso(passo)) return;
    const codigos = passo.atributos
      .filter((a) => a.tipo === "DATA" && sujos.has(a.codigo))
      .map((a) => a.codigo);
    setSalvando(true);
    try {
      for (const code of codigos) {
        await api.putAttribute(code, valores[code].trim());
      }
      for (const c of codigos) sujosRef.current.delete(c);
      setSujos(new Set(sujosRef.current));
      const d = await carregar();
      if (avancar && d) {
        const idx = d.passos.findIndex((p) => p.codigo === passo.codigo);
        if (idx >= 0 && idx < d.passos.length - 1) setPassoAtual(idx + 1);
        topRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        expire();
        return;
      }
      if (err instanceof ApiError) {
        const porCampo: Record<string, string> = {};
        for (const p of err.problems) {
          if (p.campo) porCampo[p.campo] = p.detail;
          else if (err.is("ATTRIBUTE_VALUE_INVALID")) porCampo[p.instance?.split("/").pop() ?? ""] = p.detail;
        }
        if (Object.keys(porCampo).length) setErrosCampo((prev) => ({ ...prev, ...porCampo }));
      }
      setErro(friendlyMessage(err, c.errors));
    } finally {
      setSalvando(false);
    }
  }

  function codigosDoDetalhe(detail: string): string[] {
    // detail do SUBMIT_INCOMPLETE: "itens obrigatórios pendentes: a, b, c"
    const i = detail.indexOf(":");
    if (i < 0) return [];
    return detail
      .slice(i + 1)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function submeter() {
    setErro(null);
    setPendentes(new Set());
    setSubmetendo(true);
    try {
      await api.submitOnboarding();
      // proximoPasso vira AWAITING_REVIEW → RequireStep redireciona.
      await reloadMe();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        expire();
        return;
      }
      if (err instanceof ApiError && err.is("SUBMIT_INCOMPLETE")) {
        // Marca os códigos pendentes vindos do servidor e foca o 1º passo
        // incompleto; fallback: cálculo local pelo schema.
        const codigos = new Set(codigosDoDetalhe(err.detail));
        if (codigos.size === 0 && data) {
          for (const p of data.passos)
            for (const a of p.atributos)
              if (a.obrigatorio && !completo(a)) codigos.add(a.codigo);
        }
        setPendentes(codigos);
        const idx = data
          ? data.passos.findIndex((p) =>
              p.atributos.some((a) => codigos.has(a.codigo)),
            )
          : -1;
        setPassoAtual(idx >= 0 ? idx : primeiroIncompleto());
        topRef.current?.scrollIntoView({ behavior: "smooth" });
        setErro(c.onboarding.submitMissing);
      } else {
        setErro(friendlyMessage(err, c.errors));
      }
    } finally {
      setSubmetendo(false);
    }
  }

  if (!data) {
    return erro ? (
      <Alert tone="error">{erro}</Alert>
    ) : (
      <FullPageLoader label={c.onboarding.loadingOnboarding} />
    );
  }

  const passo = passos[passoAtual];
  const pct =
    data.progresso.totalObrigatorios > 0
      ? Math.round(
          (data.progresso.preenchidosObrigatorios /
            data.progresso.totalObrigatorios) *
            100,
        )
      : 100;

  return (
    <div ref={topRef} className="flex flex-col gap-6">
      {data.status === "CHANGES_REQUESTED" && (
        <Alert tone="error" title={c.onboarding.changesTitle}>
          {c.onboarding.changesBody}
        </Alert>
      )}
      {data.status === "PENDING_UPDATE" && (
        <Alert tone="info" title={c.onboarding.updateTitle}>
          {c.onboarding.updateBody}
        </Alert>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between text-sm">
          <p className="font-semibold text-verde-floresta">
            {c.onboarding.progress(
              data.progresso.preenchidosObrigatorios,
              data.progresso.totalObrigatorios,
            )}
          </p>
          <p className="font-mono text-xs text-verde-musgo">{pct}%</p>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-verde-banda"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-verde-vivo transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <nav aria-label={c.onboarding.stepsAria} className="md:sticky md:top-6 md:self-start">
          <ol className="flex gap-2 overflow-x-auto md:flex-col">
            {passos.map((p, i) => {
              const completoOk = passoCompleto(p);
              const ativo = i === passoAtual;
              return (
                <li key={p.codigo} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setPassoAtual(i)}
                    aria-current={ativo ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                      ativo
                        ? "border-verde-floresta bg-white font-semibold text-verde-floresta"
                        : "border-transparent text-verde-musgo hover:bg-verde-banda",
                    )}
                  >
                    {completoOk ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-verde-musgo" aria-hidden />
                    ) : (
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                          ativo ? "border-verde-floresta" : "border-verde-musgo/50",
                        )}
                      >
                        {i + 1}
                      </span>
                    )}
                    <span className="truncate">{p.titulo}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex flex-col gap-6">
          {passo ? (
            <Card key={passo.codigo}>
              <div className="mb-6 flex items-center gap-3">
                <FileText className="h-5 w-5 text-verde-musgo" aria-hidden />
                <h2 className="text-lg font-semibold text-verde-floresta">
                  {passo.titulo}
                </h2>
              </div>
              <div className="flex flex-col gap-5">
                {passo.atributos.map((a) =>
                  a.tipo === "DOCUMENT" ? (
                    <DocumentCard
                      key={a.codigo}
                      attr={a}
                      onChanged={() => void carregar()}
                    />
                  ) : (
                    <DataField
                      key={a.codigo}
                      attr={a}
                      valor={valores[a.codigo] ?? ""}
                      erro={errosCampo[a.codigo]}
                      pendente={pendentes.has(a.codigo)}
                      onChange={(v) => editar(a.codigo, v)}
                    />
                  ),
                )}
              </div>
              <div className="mt-7 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={passoAtual === 0 || salvando}
                  onClick={() => setPassoAtual((i) => Math.max(0, i - 1))}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden /> {c.common.previous}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    loading={salvando}
                    disabled={sujos.size === 0}
                    onClick={() => void salvarPasso(passo, false)}
                  >
                    {c.common.save}
                  </Button>
                  {passoAtual < passos.length - 1 ? (
                    <Button
                      type="button"
                      loading={salvando}
                      onClick={() => void salvarPasso(passo, true)}
                    >
                      {c.common.saveContinue}{" "}
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      loading={submetendo}
                      onClick={() => void submeter()}
                    >
                      <Send className="h-4 w-4" aria-hidden /> {c.common.submitReview}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ) : null}

          {passoAtual === passos.length - 1 && (
            <Card className="flex flex-col items-start gap-4 border-verde-musgo/30 bg-verde-banda/50 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-verde-musgo" aria-hidden />
                <p className="text-sm text-verde-tinta">
                  {c.onboarding.submitNote}
                </p>
              </div>
              <Button
                type="button"
                loading={submetendo}
                onClick={() => void submeter()}
              >
                <Send className="h-4 w-4" aria-hidden /> {c.common.submitReview}
              </Button>
            </Card>
          )}

          {erro ? <Alert tone="error">{erro}</Alert> : null}
        </div>
      </div>
    </div>
  );
}

function DataField({
  attr,
  valor,
  erro,
  pendente,
  onChange,
}: {
  attr: OnboardingAttribute;
  valor: string;
  erro?: string;
  pendente: boolean;
  onChange: (v: string) => void;
}) {
  const c = useCopy();
  const rejeitado = attr.revisao?.status === "REJECTED";
  const erroMsg = erro ?? (pendente ? c.onboarding.pendingItem : undefined);
  const input = attr.regras?.input ?? "text";

  const wrap = (children: React.ReactNode) => (
    <div
      className={cn(
        pendente && "rounded-lg ring-2 ring-erro-terra/50 p-3 -m-3",
      )}
    >
      {children}
      {rejeitado && attr.revisao?.nota ? (
        <p className="mt-1 rounded bg-erro-fundo p-2 text-xs text-erro-terra">
          {c.common.reviewerNote}: {attr.revisao.nota}
        </p>
      ) : null}
    </div>
  );

  const hint =
    attr.ajuda ??
    (attr.regras?.maxLength ? c.common.maxChars(attr.regras.maxLength) : undefined);

  if (input === "textarea") {
    return wrap(
      <TextareaField
        label={attr.rotulo}
        name={attr.codigo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        hint={hint}
        error={erroMsg ?? (rejeitado ? c.onboarding.rejectedNote : null)}
        required={attr.obrigatorio}
        maxLength={attr.regras?.maxLength ?? undefined}
      />,
    );
  }

  const typeMap: Record<string, string> = {
    date: "date",
    number: "text",
    email: "email",
    url: "url",
    tel: "tel",
    text: "text",
  };
  return wrap(
    <Field
      label={attr.rotulo}
      name={attr.codigo}
      type={typeMap[input] ?? "text"}
      inputMode={input === "number" ? "numeric" : undefined}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      hint={hint}
      error={erroMsg ?? (rejeitado ? c.onboarding.rejectedNote : null)}
      required={attr.obrigatorio}
      maxLength={attr.regras?.maxLength ?? undefined}
    />,
  );
}
