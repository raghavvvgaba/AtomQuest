import { ManagerCheckIns } from "@/components/app/manager-check-ins";
import { requireRole } from "@/lib/auth/session";

export default async function ManagerCheckInsPage() {
  await requireRole("manager");

  return <ManagerCheckIns />;
}
