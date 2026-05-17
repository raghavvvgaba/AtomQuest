import { ManagerReview } from "@/components/app/manager-review";
import { requireRole } from "@/lib/auth/session";

export default async function ManagerGoalReviewPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requireRole("manager");
  const { employeeId } = await params;

  return <ManagerReview employeeId={employeeId} />;
}
