import { SharedGoalsManager } from "@/components/app/shared-goals-manager";
import { requireRole } from "@/lib/auth/session";

export default async function ManagerSharedGoalsPage() {
  await requireRole("manager");

  return <SharedGoalsManager role="manager" />;
}
