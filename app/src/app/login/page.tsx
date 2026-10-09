import { Leaf } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { BrandMark } from "@/components/ui";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-creme">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <BrandMark />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-24 pt-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-full bg-verde-banda p-2.5 text-verde-musgo">
            <Leaf className="h-5 w-5" aria-hidden />
          </span>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-verde-musgo">
            Portal da empresa
          </p>
        </div>
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-verde-floresta">
          Bem-vinda à rede ECOLchain
        </h1>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-verde-musgo/80">
          Rastreabilidade e auditoria de resíduos sólidos via blockchain.
        </p>
      </div>
    </main>
  );
}
