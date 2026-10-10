"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { friendlyMessage } from "@/lib/errors";
import type { AdminAccount } from "@/lib/types";
import { useCopy } from "@/i18n/provider";
import { fmtDate } from "./admin-console";
import { Alert, Button, Card, Field, FullPageLoader } from "./ui";

export function AdminAccounts() {
  const c = useCopy();
  const a = c.admin;
  const [admins, setAdmins] = useState<AdminAccount[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [fone, setFone] = useState("");
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [okForm, setOkForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setAdmins(await api.listAdminAccounts());
    } catch (err) {
      setErro(friendlyMessage(err, c.errors));
      setAdmins([]);
    }
  }, [c.errors]);

  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar]);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErroForm(null);
    setOkForm(false);
    if (!email.trim() || !nome.trim() || !fone.trim()) {
      setErroForm(a.fieldsRequired);
      return;
    }
    setBusy(true);
    try {
      await api.createAdminAccount({
        email: email.trim().toLowerCase(),
        nomeCompleto: nome.trim(),
        telefone: fone.trim(),
      });
      setOkForm(true);
      setEmail("");
      setNome("");
      setFone("");
      await carregar();
    } catch (err) {
      setErroForm(friendlyMessage(err, c.errors));
    } finally {
      setBusy(false);
    }
  }

  if (admins === null && !erro) return <FullPageLoader label={a.loading} />;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-4">
        <h3 className="mb-3 font-semibold text-verde-floresta">{a.adminsTitle}</h3>
        {erro ? <Alert tone="error">{erro}</Alert> : null}
        <ul className="divide-y divide-verde-floresta/10 text-sm">
          {(admins ?? []).map((ad) => (
            <li key={ad.id} className="flex flex-wrap gap-x-3 py-2">
              <span className="flex-1 font-semibold text-verde-floresta">
                {ad.nomeCompleto ?? ad.email}
              </span>
              <span className="text-verde-musgo">{ad.email}</span>
              <span className="text-verde-musgo">{ad.telefone ?? "—"}</span>
              <span className="w-36 text-right text-xs text-verde-musgo">
                {fmtDate(ad.criadoEm)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-4">
        <h3 className="mb-3 font-semibold text-verde-floresta">{a.newAdminTitle}</h3>
        <form onSubmit={criar} className="flex flex-col gap-3">
          <Field
            label={a.emailLabel}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Field
            label={a.nameLabel}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
          <Field
            label={a.phoneLabel}
            value={fone}
            onChange={(e) => setFone(e.target.value)}
            required
          />
          {erroForm ? <Alert tone="error">{erroForm}</Alert> : null}
          {okForm ? (
            <Alert tone="success">{a.adminCreated}</Alert>
          ) : null}
          <Button type="submit" loading={busy} className="self-start">
            {a.createAdmin}
          </Button>
        </form>
      </Card>
    </div>
  );
}
