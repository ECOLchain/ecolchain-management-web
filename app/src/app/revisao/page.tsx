import { Hourglass } from "lucide-react";
import { RequireStep } from "@/components/gate";
import { StatusScreen } from "@/components/status-screen";

export default function RevisaoPage() {
  return (
    <RequireStep allow={["AWAITING_REVIEW"]}>
      <StatusScreen
        icon={<Hourglass className="h-7 w-7" aria-hidden />}
        title="Cadastro em revisão"
      >
        <p>
          Recebemos todos os seus dados e documentos. Nossa equipe está
          analisando o cadastro e você será avisada por e-mail quando a revisão
          terminar.
        </p>
        <p className="mt-3">
          Não é preciso fazer mais nada por aqui — você pode sair e voltar
          quando quiser para acompanhar o status.
        </p>
      </StatusScreen>
    </RequireStep>
  );
}
