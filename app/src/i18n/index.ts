import { copy as ptBr, type Copy } from "./pt-br";
import { copy as en } from "./en";

export const LOCALES = ["pt-br", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pt-br";

const COPIES: Record<Locale, Copy> = { "pt-br": ptBr, en };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function getCopy(locale: Locale): Copy {
  return COPIES[locale];
}

/** Valor do header Accept-Language enviado à API (ela negocia pt-BR/en). */
export function apiLanguage(locale: Locale): string {
  return locale === "en" ? "en" : "pt-BR";
}

/** Prefixa um path de app com o locale: localPath("/empresa", "en") → "/en/empresa". */
export function localPath(path: string, locale: Locale): string {
  return `/${locale}${path === "/" ? "" : path}`;
}
