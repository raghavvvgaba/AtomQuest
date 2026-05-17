import { AdminDashboard } from "@/components/app/admin-dashboard";
import { requireRole } from "@/lib/auth/session";

export default async function AdminPage() {
  await requireRole("admin");

  return <AdminDashboard />;
}
