import { GoalSheetEditor } from "@/components/app/goal-sheet-editor";
import { requireRole } from "@/lib/auth/session";

export default async function EmployeeGoalsPage() {
  await requireRole("employee");

  return <GoalSheetEditor />;
}
