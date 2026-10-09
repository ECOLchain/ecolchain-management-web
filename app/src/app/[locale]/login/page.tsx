import { Leaf } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { BrandMark } from "@/components/ui";
import { DEFAULT_LOCALE, getCopy, isLocale, localPath } from "@/i18n";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ motivo?: string }>;
}) {
  const [{ locale }, { motivo }] = await Promise.all([params, searchParams]);
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const c = getCopy(l);
  return (
    <main className="flex min-h-dvh flex-col bg-creme">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <BrandMark home={localPath("/", l)} />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-24 pt-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-full bg-verde-banda p-2.5 text-verde-musgo">
            <Leaf className="h-5 w-5" aria-hidden />
          </span>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-verde-musgo">
            {c.login.portalTag}
          </p>
        </div>
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-verde-floresta">
          {c.login.welcome}
        </h1>
        <LoginForm sessionExpired={motivo === "sessao-expirada"} />
        <p className="mt-6 text-center text-xs text-verde-musgo/80">
          {c.login.tagline}
        </p>
      </div>
    </main>
  );
}
