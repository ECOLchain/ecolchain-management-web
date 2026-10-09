import { CompanyForm } from "@/components/company-form";
import { RequireStep } from "@/components/gate";
import { AuthedHeader } from "@/components/status-screen";
import { PageShell } from "@/components/ui";

export default function EmpresaPage() {
  return (
    <RequireStep allow={["COMPANY_FORM"]}>
      <AuthedHeader />
      <PageShell
        title="Cadastro da empresa"
        subtitle="Conte sobre a empresa que vai participar da rede."
      >
        <CompanyForm />
      </PageShell>
    </RequireStep>
  );
}
