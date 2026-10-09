"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { apiLanguage, getCopy, type Locale } from "@/i18n";
import type { Copy } from "@/i18n/pt-br";
import { setApiLanguage } from "@/lib/api";

interface I18n {
  locale: Locale;
  copy: Copy;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  useEffect(() => {
    document.documentElement.lang = apiLanguage(locale);
    setApiLanguage(apiLanguage(locale));
  }, [locale]);
  const value: I18n = { locale, copy: getCopy(locale) };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n fora do I18nProvider");
  return ctx;
}

export function useCopy(): Copy {
  return useI18n().copy;
}

export function useLocale(): Locale {
  return useI18n().locale;
}
