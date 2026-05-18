import { AdminCycleManagement } from "@/components/app/admin-cycle-management";
import { requireRole } from "@/lib/auth/session";

export default async function AdminCyclesPage() {
  await requireRole("admin");

  return <AdminCycleManagement />;
}
