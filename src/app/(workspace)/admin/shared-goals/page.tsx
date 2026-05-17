import { SharedGoalsManager } from "@/components/app/shared-goals-manager";
import { requireRole } from "@/lib/auth/session";

export default async function AdminSharedGoalsPage() {
  await requireRole("admin");

  return <SharedGoalsManager role="admin" />;
}
