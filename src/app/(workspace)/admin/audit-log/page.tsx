import { AdminAuditLog } from "@/components/app/admin-audit-log";
import { requireRole } from "@/lib/auth/session";

export default async function AdminAuditLogPage() {
  await requireRole("admin");

  return <AdminAuditLog />;
}
