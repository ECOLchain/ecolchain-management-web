import { CircleSlash } from "lucide-react";
import { RequireStep } from "@/components/gate";
import { StatusScreen } from "@/components/status-screen";

export default function SuspendidaPage() {
  return (
    <RequireStep allow={["SUSPENDED"]}>
      <StatusScreen
        icon={<CircleSlash className="h-7 w-7" aria-hidden />}
        tone="error"
        title="Conta suspensa"
      >
        <p>
          A participação desta empresa na rede ECOLchain está suspensa.
        </p>
        <p className="mt-3">
          Para entender o motivo ou pedir a reativação, fale com a equipe
          ECOLchain pelo e-mail{" "}
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
