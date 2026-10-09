import { XCircle } from "lucide-react";
import { RequireStep } from "@/components/gate";
import { StatusScreen } from "@/components/status-screen";
import { DEFAULT_LOCALE, getCopy, isLocale } from "@/i18n";

export default async function RejeitadaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = getCopy(isLocale(locale) ? locale : DEFAULT_LOCALE);
  return (
    <RequireStep allow={["REJECTED"]}>
      <StatusScreen
        icon={<XCircle className="h-7 w-7" aria-hidden />}
        tone="error"
        title={c.status.rejeitadaTitle}
      >
        <p>{c.status.rejeitadaBody}</p>
        <p className="mt-3">
          {c.status.rejeitadaBody2}{" "}
          <a
            className="font-semibold text-verde-musgo underline"
            href="mailto:ecolchain@gmail.com"
          >
            ecolchain@gmail.com
          </a>
          .
        </p>
      </StatusScreen>
    </RequireStep>
  );
}
