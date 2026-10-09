import { Hourglass } from "lucide-react";
import { RequireStep } from "@/components/gate";
import { StatusScreen } from "@/components/status-screen";
import { DEFAULT_LOCALE, getCopy, isLocale } from "@/i18n";

export default async function RevisaoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = getCopy(isLocale(locale) ? locale : DEFAULT_LOCALE);
  return (
    <RequireStep allow={["AWAITING_REVIEW"]}>
      <StatusScreen
        icon={<Hourglass className="h-7 w-7" aria-hidden />}
        title={c.status.revisaoTitle}
      >
        <p>{c.status.revisaoBody}</p>
        <p className="mt-3">{c.status.revisaoBody2}</p>
      </StatusScreen>
    </RequireStep>
  );
}
