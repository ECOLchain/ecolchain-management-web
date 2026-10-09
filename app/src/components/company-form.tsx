"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { api, UnauthorizedError } from "@/lib/api";
import { ApiError, friendlyMessage } from "@/lib/errors";
import { isValidCnpj, maskCnpj, normalizeCnpj } from "@/lib/cnpj";
import { useSession } from "./session-context";
import { Alert, Button, Card, Field, Spinner } from "./ui";
import type { ProfileTypeSummary } from "@/lib/types";

const TERMS_VERSION = "v1-placeholder"; // app.auth.terms-version do backend

export function CompanyForm() {
  const { me, reloadMe, expire } = useSession();

  const [tipos, setTipos] = useState<ProfileTypeSummary[] | null>(null);
  // Edição (empresa já existe): valores iniciais vêm de `me.empresa`.
  const [cnpj, setCnpj] = useState(() => maskCnpj(me?.empresa?.cnpj ?? ""));
  const [razaoSocial, setRazaoSocial] = useState(
    () => me?.empresa?.razaoSocial ?? "",
  );
  const [nomeCompleto, setNomeCompleto] = useState(me?.conta.nomeCompleto ?? "");
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
        if (alive) setErroGeral("Não foi possível carregar os tipos de perfil.");
      })
      .finally(() => alive && setLoadingTipos(false));
    return () => {
      alive = false;
    };
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
    if (!isValidCnpj(cnpj)) erros.cnpj = "CNPJ inválido. Confira os dígitos.";
    if (!razaoSocial.trim()) erros.razaoSocial = "Informe a razão social.";
    if (!nomeCompleto.trim())
      erros.nomeCompleto = "Informe seu nome completo.";
    if (selecionados.length === 0)
      erros.tiposPerfil = "Selecione ao menos um tipo de perfil.";
    if (!declaracao)
      erros.declaracao =
        "É preciso declarar que você é dono(a) ou representante legal.";
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
        setErroGeral(friendlyMessage(err));
      } else {
        setErroGeral(friendlyMessage(err));
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
              Dados da empresa
            </h2>
            <p className="mt-1 text-sm text-verde-musgo">
              Estas informações identificam sua empresa na rede ECOLchain.
            </p>
          </div>
        </div>

        <Field
          label="CNPJ"
          name="cnpj"
          inputMode="text"
          placeholder="00.000.000/0000-00"
          value={cnpj}
          onChange={(e) => setCnpj(maskCnpj(e.target.value))}
          error={errosCampo.cnpj}
          hint="Aceitamos o novo formato alfanumérico da Receita."
          required
          autoFocus
          maxLength={18}
        />
        <Field
          label="Razão social"
          name="razaoSocial"
          placeholder="Empresa Exemplo Ltda."
          value={razaoSocial}
          onChange={(e) => setRazaoSocial(e.target.value)}
          error={errosCampo.razaoSocial}
          required
        />
        <Field
          label="Seu nome completo"
          name="nomeCompleto"
          autoComplete="name"
          placeholder="Nome do responsável legal"
          value={nomeCompleto}
          onChange={(e) => setNomeCompleto(e.target.value)}
          error={errosCampo.nomeCompleto}
          required
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-verde-musgo">
            Tipos de perfil <span className="text-erro-terra">*</span>
          </legend>
          <p className="text-xs text-verde-musgo/80">
            Marque todos que se aplicam — o onboarding combina os requisitos de
            cada um.
          </p>
          {loadingTipos ? (
            <div className="flex items-center gap-2 py-2 text-sm text-verde-musgo">
              <Spinner className="h-4 w-4" /> Carregando tipos...
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
              Declaro que sou dono(a) ou representante legal desta empresa e
              aceito os{" "}
              <span className="font-semibold">
                Termos de Uso ({TERMS_VERSION})
              </span>
              .
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
          Salvar e continuar
        </Button>
      </form>
    </Card>
  );
}
