import { Home } from "lucide-react";
import { RequireStep } from "@/components/gate";
import { StatusScreen } from "@/components/status-screen";
import { DEFAULT_LOCALE, getCopy, isLocale } from "@/i18n";
import { EmpresaInfo } from "./empresa-info";

export default async function PainelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = getCopy(isLocale(locale) ? locale : DEFAULT_LOCALE);
  return (
    <RequireStep allow={["HOME"]}>
      <StatusScreen
        icon={<Home className="h-7 w-7" aria-hidden />}
        tone="success"
        title={c.status.painelTitle}
      >
        <p>{c.status.painelBody}</p>
        <EmpresaInfo />
      </StatusScreen>
    </RequireStep>
  );
}
