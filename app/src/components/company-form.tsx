"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { api, UnauthorizedError } from "@/lib/api";
import { ApiError, friendlyMessage } from "@/lib/errors";
import { isValidCnpj, maskCnpj, normalizeCnpj } from "@/lib/cnpj";
import { useSession } from "./session-context";
import { useCopy } from "@/i18n/provider";
import { Alert, Button, Card, Field, Spinner } from "./ui";
import type { ProfileTypeSummary } from "@/lib/types";

const TERMS_VERSION = "v1-placeholder"; // app.auth.terms-version do backend

// Mesma regra do backend (WalletValidator): Solana base58 32-44 ou EVM 0x+40 hex.
const WALLET_RE = /^([1-9A-HJ-NP-Za-km-z]{32,44}|0x[0-9a-fA-F]{40})$/;

export function CompanyForm() {
  const { me, reloadMe, expire } = useSession();
  const c = useCopy();

  const [tipos, setTipos] = useState<ProfileTypeSummary[] | null>(null);
  // Edição (empresa já existe): valores iniciais vêm de `me.empresa`.
  const [cnpj, setCnpj] = useState(() => maskCnpj(me?.empresa?.cnpj ?? ""));
  const [razaoSocial, setRazaoSocial] = useState(
    () => me?.empresa?.razaoSocial ?? "",
  );
  const [nomeCompleto, setNomeCompleto] = useState(me?.conta.nomeCompleto ?? "");
  const [carteira, setCarteira] = useState(() => me?.empresa?.carteira ?? "");
  const [selecionados, setSelecionados] = useState<string[]>(
    () => me?.empresa?.tiposPerfil ?? [],
  );
  const [declaracao, setDeclaracao] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loadingTipos, setLoadingTipos] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .listProfileTypes()
      .then((t) => {
        if (alive) setTipos(t);
      })
      .catch(() => {
        if (alive) setErroGeral(c.empresa.tiposLoadError);
      })
      .finally(() => alive && setLoadingTipos(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- o copy muda só com o locale (remount da página)
  }, []);

  function toggleTipo(codigo: string) {
    setSelecionados((sel) =>
      sel.includes(codigo)
        ? sel.filter((c) => c !== codigo)
        : [...sel, codigo],
    );
  }

  function validar(): boolean {
    const erros: Record<string, string> = {};
    if (!isValidCnpj(cnpj)) erros.cnpj = c.empresa.errCnpj;
    if (!razaoSocial.trim()) erros.razaoSocial = c.empresa.errRazao;
    if (!nomeCompleto.trim()) erros.nomeCompleto = c.empresa.errNome;
    if (!WALLET_RE.test(carteira.trim())) erros.carteira = c.empresa.errCarteira;
    if (selecionados.length === 0) erros.tiposPerfil = c.empresa.errTipos;
    if (!declaracao) erros.declaracao = c.empresa.errDeclaracao;
    setErrosCampo(erros);
    return Object.keys(erros).length === 0;
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErroGeral(null);
    if (!validar()) return;
    setBusy(true);
    try {
      await api.upsertCompany({
        cnpj: normalizeCnpj(cnpj),
        razaoSocial: razaoSocial.trim(),
        nomeCompleto: nomeCompleto.trim(),
        carteira: carteira.trim(),
        tiposPerfil: selecionados,
        declaracaoRepresentante: declaracao,
        versaoTermos: TERMS_VERSION,
      });
      await reloadMe(); // RequireStep redireciona para o novo proximoPasso
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        expire();
      } else if (err instanceof ApiError) {
        const porCampo: Record<string, string> = {};
        for (const p of err.problems) {
          if (p.campo) porCampo[p.campo] = p.detail;
        }
        if (Object.keys(porCampo).length > 0) setErrosCampo(porCampo);
        setErroGeral(friendlyMessage(err, c.errors));
      } else {
        setErroGeral(friendlyMessage(err, c.errors));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={salvar} className="flex flex-col gap-6" noValidate>
        <div className="flex items-start gap-3">
          <Building2 className="mt-1 h-6 w-6 shrink-0 text-verde-musgo" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold text-verde-floresta">
              {c.empresa.sectionTitle}
            </h2>
            <p className="mt-1 text-sm text-verde-musgo">
              {c.empresa.sectionSub}
            </p>
          </div>
        </div>

        <Field
          label={c.empresa.cnpjLabel}
          name="cnpj"
          inputMode="text"
          placeholder={c.empresa.cnpjPlaceholder}
          value={cnpj}
          onChange={(e) => setCnpj(maskCnpj(e.target.value))}
          error={errosCampo.cnpj}
          hint={c.empresa.cnpjHint}
          required
          autoFocus
          maxLength={18}
        />
        <Field
          label={c.empresa.razaoLabel}
          name="razaoSocial"
          placeholder={c.empresa.razaoPlaceholder}
          value={razaoSocial}
          onChange={(e) => setRazaoSocial(e.target.value)}
          error={errosCampo.razaoSocial}
          required
        />
        <Field
          label={c.empresa.nomeLabel}
          name="nomeCompleto"
          autoComplete="name"
          placeholder={c.empresa.nomePlaceholder}
          value={nomeCompleto}
          onChange={(e) => setNomeCompleto(e.target.value)}
          error={errosCampo.nomeCompleto}
          required
        />
        <Field
          label={c.empresa.carteiraLabel}
          name="carteira"
          inputMode="text"
          placeholder={c.empresa.carteiraPlaceholder}
          value={carteira}
          onChange={(e) => setCarteira(e.target.value)}
          error={errosCampo.carteira}
          hint={c.empresa.carteiraHint}
          required
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-verde-musgo">
            {c.empresa.tiposLabel} <span className="text-erro-terra">*</span>
          </legend>
          <p className="text-xs text-verde-musgo/80">{c.empresa.tiposHint}</p>
          {loadingTipos ? (
            <div className="flex items-center gap-2 py-2 text-sm text-verde-musgo">
              <Spinner className="h-4 w-4" /> {c.empresa.loadingTipos}
            </div>
          ) : (
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {tipos?.map((t) => (
                <label
                  key={t.codigo}
                  className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    selecionados.includes(t.codigo)
                      ? "border-verde-musgo bg-verde-banda"
                      : "border-verde-floresta/20 bg-white hover:bg-creme"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-verde-tinta"
                    checked={selecionados.includes(t.codigo)}
                    onChange={() => toggleTipo(t.codigo)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-verde-floresta">
                      {t.nome}
                    </span>
                    {t.descricao ? (
                      <span className="block text-xs text-verde-musgo/80">
                        {t.descricao}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          )}
          {errosCampo.tiposPerfil ? (
            <p className="text-xs font-medium text-erro-terra" role="alert">
              {errosCampo.tiposPerfil}
            </p>
          ) : null}
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-verde-floresta/20 bg-creme p-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-verde-tinta"
              checked={declaracao}
              onChange={(e) => setDeclaracao(e.target.checked)}
            />
            <span className="text-sm text-verde-floresta">
              {c.empresa.declaracaoPre}{" "}
              <span className="font-semibold">{c.empresa.termos(TERMS_VERSION)}</span>
              {c.empresa.declaracaoPost}
            </span>
          </label>
          {errosCampo.declaracao ? (
            <p className="text-xs font-medium text-erro-terra" role="alert">
              {errosCampo.declaracao}
            </p>
          ) : null}
        </div>

        {erroGeral ? <Alert tone="error">{erroGeral}</Alert> : null}
        <Button type="submit" loading={busy}>
          {c.common.saveContinue}
        </Button>
      </form>
    </Card>
  );
}
