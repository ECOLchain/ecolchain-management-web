import { CircleSlash } from "lucide-react";
import { RequireStep } from "@/components/gate";
import { StatusScreen } from "@/components/status-screen";
import { DEFAULT_LOCALE, getCopy, isLocale } from "@/i18n";

export default async function SuspendidaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = getCopy(isLocale(locale) ? locale : DEFAULT_LOCALE);
  return (
    <RequireStep allow={["SUSPENDED"]}>
      <StatusScreen
        icon={<CircleSlash className="h-7 w-7" aria-hidden />}
        tone="error"
        title={c.status.suspendidaTitle}
      >
        <p>{c.status.suspendidaBody}</p>
        <p className="mt-3">
          {c.status.suspendidaBody2}{" "}
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
