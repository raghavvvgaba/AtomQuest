import { ManagerReview } from "@/components/app/manager-review";

export default async function ManagerGoalReviewPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;

  return <ManagerReview employeeId={employeeId} />;
}
