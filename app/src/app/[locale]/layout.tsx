import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEFAULT_LOCALE, LOCALES, getCopy, isLocale, type Locale } from "@/i18n";
import { I18nProvider } from "@/i18n/provider";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const c = getCopy(l);
  return { title: c.meta.title, description: c.meta.description };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <I18nProvider locale={locale as Locale}>{children}</I18nProvider>;
}
