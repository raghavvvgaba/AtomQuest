import { EmployeeCheckIns } from "@/components/app/employee-check-ins";
import { requireRole } from "@/lib/auth/session";

export default async function EmployeeCheckInsPage() {
  await requireRole("employee");

  return <EmployeeCheckIns />;
}
