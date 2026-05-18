import { AdminOrgHierarchy } from "@/components/app/admin-org-hierarchy";
import { requireRole } from "@/lib/auth/session";

export default async function AdminOrgHierarchyPage() {
  await requireRole("admin");

  return <AdminOrgHierarchy />;
}
