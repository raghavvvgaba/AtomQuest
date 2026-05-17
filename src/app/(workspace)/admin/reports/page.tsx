import { AdminReports } from "@/components/app/admin-reports";
import { requireRole } from "@/lib/auth/session";

export default async function AdminReportsPage() {
  await requireRole("admin");

  return <AdminReports />;
}
