import { CompanyForm } from "@/components/company-form";
import { RequireStep } from "@/components/gate";
import { AuthedHeader } from "@/components/status-screen";
import { PageShell } from "@/components/ui";
import { DEFAULT_LOCALE, getCopy, isLocale } from "@/i18n";

export default async function EmpresaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = getCopy(isLocale(locale) ? locale : DEFAULT_LOCALE);
  return (
    <RequireStep allow={["COMPANY_FORM"]}>
      <AuthedHeader />
      <PageShell title={c.empresa.title} subtitle={c.empresa.sub}>
        <CompanyForm />
      </PageShell>
    </RequireStep>
  );
}
