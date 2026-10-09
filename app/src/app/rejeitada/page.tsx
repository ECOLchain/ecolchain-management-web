import { XCircle } from "lucide-react";
import { RequireStep } from "@/components/gate";
import { StatusScreen } from "@/components/status-screen";

export default function RejeitadaPage() {
  return (
    <RequireStep allow={["REJECTED"]}>
      <StatusScreen icon={<XCircle className="h-7 w-7" aria-hidden />} tone="error" title="Cadastro não aprovado">
        <p>
          Após a revisão, o cadastro desta empresa não foi aprovado para
          participar da rede ECOLchain neste momento.
        </p>
        <p className="mt-3">
          Se você acredita que houve um engano, fale com a equipe ECOLchain
          pelo e-mail{" "}
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
