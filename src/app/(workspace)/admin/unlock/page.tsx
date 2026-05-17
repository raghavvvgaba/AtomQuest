import { AdminUnlock } from "@/components/app/admin-unlock";
import { requireRole } from "@/lib/auth/session";

export default async function AdminUnlockPage() {
  await requireRole("admin");

  return <AdminUnlock />;
}
