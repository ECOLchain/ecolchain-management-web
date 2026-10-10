import { AdminPlatform } from "@/components/admin-platform";
import { RequireAdmin } from "@/components/gate";

export default function AdminPage() {
  return (
    <RequireAdmin>
      <AdminPlatform />
    </RequireAdmin>
  );
}
