import { AdminConsole } from "@/components/admin-console";
import { RequireAdmin } from "@/components/gate";

export default function AdminPage() {
  return (
    <RequireAdmin>
      <AdminConsole />
    </RequireAdmin>
  );
}
