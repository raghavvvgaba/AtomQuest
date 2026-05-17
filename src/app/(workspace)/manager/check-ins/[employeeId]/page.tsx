import { ManagerCheckInReview } from "@/components/app/manager-check-in-review";
import { requireRole } from "@/lib/auth/session";

export default async function ManagerCheckInReviewPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requireRole("manager");
  const { employeeId } = await params;

  return <ManagerCheckInReview employeeId={employeeId} />;
}
