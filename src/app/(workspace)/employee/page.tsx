import { EmployeeDashboard } from "@/components/app/employee-dashboard";
import { requireRole } from "@/lib/auth/session";

export default async function EmployeePage() {
  await requireRole("employee");

  return <EmployeeDashboard />;
}
