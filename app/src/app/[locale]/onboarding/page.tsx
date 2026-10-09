import { OnboardingFlow } from "@/components/onboarding-flow";
import { RequireStep } from "@/components/gate";
import { AuthedHeader } from "@/components/status-screen";
import { PageShell } from "@/components/ui";
import { DEFAULT_LOCALE, getCopy, isLocale } from "@/i18n";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = getCopy(isLocale(locale) ? locale : DEFAULT_LOCALE);
  return (
    <RequireStep allow={["ONBOARDING"]}>
      <AuthedHeader />
      <PageShell title={c.onboarding.title} subtitle={c.onboarding.sub} wide>
        <OnboardingFlow />
      </PageShell>
    </RequireStep>
  );
}
