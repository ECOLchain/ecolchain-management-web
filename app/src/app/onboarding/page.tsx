import { OnboardingFlow } from "@/components/onboarding-flow";
import { RequireStep } from "@/components/gate";
import { AuthedHeader } from "@/components/status-screen";
import { PageShell } from "@/components/ui";

export default function OnboardingPage() {
  return (
    <RequireStep allow={["ONBOARDING"]}>
      <AuthedHeader />
      <PageShell
        title="Onboarding"
        subtitle="Complete os requisitos do seu perfil para entrar na rede."
        wide
      >
        <OnboardingFlow />
      </PageShell>
    </RequireStep>
  );
}
