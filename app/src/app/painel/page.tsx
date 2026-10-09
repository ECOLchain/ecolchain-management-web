import { Home } from "lucide-react";
import { RequireStep } from "@/components/gate";
import { StatusScreen } from "@/components/status-screen";
import { EmpresaInfo } from "./empresa-info";

export default function PainelPage() {
  return (
    <RequireStep allow={["HOME"]}>
      <StatusScreen icon={<Home className="h-7 w-7" aria-hidden />} tone="success" title="Bem-vinda à ECOLchain">
        <p>
          Sua empresa foi aprovada e já faz parte da rede. Esta é a tela
          inicial da área logada — as funcionalidades do produto entram aqui nas
          próximas entregas.
        </p>
        <EmpresaInfo />
      </StatusScreen>
    </RequireStep>
  );
}
