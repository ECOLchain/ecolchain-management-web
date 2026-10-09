"use client";

import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { LoaderCircle, AlertCircle, CheckCircle2 } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function cn(...args: Parameters<typeof clsx>) {
  return twMerge(clsx(...args));
}

export function Spinner({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <LoaderCircle
      className={cn("h-5 w-5 animate-spin text-verde-musgo", className)}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

export function FullPageLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-creme">
      <BrandMark />
      <Spinner className="h-7 w-7" />
      {label ? <p className="text-sm text-verde-musgo">{label}</p> : null}
    </div>
  );
}

export function BrandMark({
  compact = false,
  home = "/",
}: {
  compact?: boolean;
  home?: string;
}) {
  return (
    <Link href={home} className="flex items-center gap-2.5" aria-label="ECOLchain">
      <Image src="/favicon.svg" alt="" width={30} height={30} priority />
      {!compact && (
        <Image
          src="/img/ecolchain-logo.png"
          alt="ECOLchain"
          width={120}
          height={28}
          className="h-6 w-auto"
          priority
        />
      )}
    </Link>
  );
}

export function AppHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="border-b border-verde-banda bg-creme">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <BrandMark />
        <div className="flex items-center gap-3">{right}</div>
      </div>
    </header>
  );
}

type ButtonVariant = "primary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-verde-floresta text-creme hover:bg-verde-tinta",
        variant === "ghost" &&
          "border border-verde-floresta/30 bg-transparent text-verde-floresta hover:bg-verde-banda",
        variant === "danger" && "bg-erro-terra text-creme hover:opacity-90",
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner className="h-4 w-4 text-current" /> : null}
      {children}
    </button>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
  ref?: React.Ref<HTMLInputElement>;
}

export function Field({ label, hint, error, id, className, ref, ...rest }: FieldProps) {
  const inputId = id ?? rest.name ?? label;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-verde-musgo"
      >
        {label}
        {rest.required ? <span className="text-erro-terra"> *</span> : null}
      </label>
      <input
        id={inputId}
        ref={ref}
        className={cn(
          "min-h-11 w-full rounded-lg border border-verde-floresta/25 bg-white px-3.5 py-2.5 text-base text-verde-floresta placeholder:text-verde-floresta/40 focus:border-verde-musgo",
          error && "border-erro-terra",
          className,
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-erro` : hint ? `${inputId}-hint` : undefined}
        {...rest}
      />
      {hint && !error ? (
        <p id={`${inputId}-hint`} className="text-xs text-verde-musgo/80">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-erro`} className="text-xs font-medium text-erro-terra" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string | null;
}

export function TextareaField({ label, hint, error, id, className, ...rest }: TextareaFieldProps) {
  const inputId = id ?? rest.name ?? label;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-verde-musgo"
      >
        {label}
        {rest.required ? <span className="text-erro-terra"> *</span> : null}
      </label>
      <textarea
        id={inputId}
        className={cn(
          "min-h-24 w-full rounded-lg border border-verde-floresta/25 bg-white px-3.5 py-2.5 text-base text-verde-floresta placeholder:text-verde-floresta/40 focus:border-verde-musgo",
          error && "border-erro-terra",
          className,
        )}
        aria-invalid={!!error}
        {...rest}
      />
      {hint && !error ? <p className="text-xs text-verde-musgo/80">{hint}</p> : null}
      {error ? (
        <p className="text-xs font-medium text-erro-terra" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "error" | "success";
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-4 text-sm",
        tone === "info" && "border-verde-musgo/30 bg-verde-banda text-verde-tinta",
        tone === "error" && "border-erro-terra/30 bg-erro-fundo text-erro-terra",
        tone === "success" && "border-verde-musgo/40 bg-ok-fundo text-verde-tinta",
        className,
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div>
        {title ? <p className="mb-1 font-semibold">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-verde-floresta/15 bg-white p-6 shadow-[0_1px_3px_rgba(14,67,48,0.08)] sm:p-8",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PageShell({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full px-5 py-10",
        wide ? "max-w-5xl" : "max-w-xl",
      )}
    >
      <h1 className="text-2xl font-bold tracking-tight text-verde-floresta sm:text-3xl">
        {title}
      </h1>
      {subtitle ? <p className="mt-2 text-verde-musgo">{subtitle}</p> : null}
      <div className="mt-8">{children}</div>
    </main>
  );
}
