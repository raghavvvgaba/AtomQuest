import { ManagerCheckInReview } from "@/components/app/manager-check-in-review";

export default async function ManagerCheckInReviewPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;

  return <ManagerCheckInReview employeeId={employeeId} />;
}
