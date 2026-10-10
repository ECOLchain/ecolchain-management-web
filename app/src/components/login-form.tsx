"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { api } from "@/lib/api";
import { friendlyMessage } from "@/lib/errors";
import { routeForMe } from "@/lib/steps";
import { useSession } from "./session-context";
import { useCopy, useLocale } from "@/i18n/provider";
import { Alert, Button, Card, Field } from "./ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 60;

export function LoginForm({ sessionExpired = false }: { sessionExpired?: boolean }) {
  const router = useRouter();
  const { state, me, login } = useSession();
  const locale = useLocale();
  const c = useCopy();

  const [email, setEmail] = useState("");
  const [fase, setFase] = useState<"email" | "codigo">("email");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  // Já autenticado (ex.: voltou ao /login logado) → segue o fluxo.
  useEffect(() => {
    if (state === "authed" && me)
      router.replace(routeForMe(me, locale));
  }, [state, me, router, locale]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function pedirCodigo(e?: React.FormEvent) {
    e?.preventDefault();
    setErro(null);
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) {
      setErro(c.login.invalidEmail);
      return;
    }
    setBusy(true);
    try {
      await api.requestOtp(mail);
      setFase("codigo");
      setCooldown(RESEND_SECONDS);
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      setErro(friendlyMessage(err, c.errors));
    } finally {
      setBusy(false);
    }
  }

  async function reenviar() {
    if (cooldown > 0 || busy) return;
    setErro(null);
    setBusy(true);
    try {
      await api.requestOtp(email.trim().toLowerCase());
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setErro(friendlyMessage(err, c.errors));
    } finally {
      setBusy(false);
    }
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const code = codigo.trim();
    if (!/^[0-9]{6}$/.test(code)) {
      setErro(c.login.invalidCode);
      return;
    }
    setBusy(true);
    try {
      const session = await api.verifyOtp(email.trim().toLowerCase(), code);
      if (!session) throw new Error("empty");
      // Entrada direta: o proximoPasso do /me decide a rota — sem tela extra.
      const m = await login(session);
      if (m) router.replace(routeForMe(m, locale));
    } catch (err) {
      setErro(friendlyMessage(err, c.errors));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      {sessionExpired ? (
        <Alert tone="info" className="mb-5">
          {c.login.sessionExpired}
        </Alert>
      ) : null}
      {fase === "email" ? (
        <form onSubmit={pedirCodigo} className="flex flex-col gap-5" noValidate>
          <div>
            <h2 className="text-lg font-semibold text-verde-floresta">
              {c.login.cardTitle}
            </h2>
            <p className="mt-1 text-sm text-verde-musgo">{c.login.cardSub}</p>
          </div>
          <Field
            label={c.login.emailLabel}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={c.login.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          {erro ? <Alert tone="error">{erro}</Alert> : null}
          <Button type="submit" loading={busy}>
            {c.login.sendCode}
          </Button>
        </form>
      ) : (
        <form onSubmit={verificar} className="flex flex-col gap-5" noValidate>
          <div className="flex items-start gap-3">
            <MailCheck className="mt-1 h-6 w-6 shrink-0 text-verde-musgo" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold text-verde-floresta">
                {c.login.codeTitle}
              </h2>
              <p className="mt-1 text-sm text-verde-musgo">
                {c.login.codeSentPre} <strong>{email}</strong>
                {c.login.codeSentPost}
              </p>
            </div>
          </div>
          <Field
            label={c.login.codeLabel}
            name="codigo"
            ref={codeRef}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            pattern="[0-9]{6}"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
            className="text-center font-mono text-2xl tracking-[0.5em]"
            required
          />
          {erro ? <Alert tone="error">{erro}</Alert> : null}
          <Button type="submit" loading={busy}>
            {c.login.signIn}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setFase("email");
                setCodigo("");
                setErro(null);
              }}
              className="font-medium text-verde-musgo underline-offset-4 hover:underline"
            >
              {c.login.useOtherEmail}
            </button>
            <button
              type="button"
              onClick={reenviar}
              disabled={cooldown > 0 || busy}
              className="font-medium text-verde-musgo underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cooldown > 0 ? c.login.resendIn(cooldown) : c.login.resendCode}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
