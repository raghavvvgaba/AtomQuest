import { ManagerDashboard } from "@/components/app/manager-dashboard";
import { requireRole } from "@/lib/auth/session";

export default async function ManagerPage() {
  await requireRole("manager");

  return <ManagerDashboard />;
}
