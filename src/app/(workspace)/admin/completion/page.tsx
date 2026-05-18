import { AdminCompletionDashboard } from "@/components/app/admin-completion-dashboard";
import { requireRole } from "@/lib/auth/session";

export default async function AdminCompletionPage() {
  await requireRole("admin");

  return <AdminCompletionDashboard />;
}
