import { Badge } from "@/components/ui/badge";
import { getGoalSheetStatusTone, getStatusLabel } from "@/lib/goal-sheet";
import type { GoalSheetStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: GoalSheetStatus }) {
  const tone = getGoalSheetStatusTone(status);
  const variant =
    tone === "success"
      ? "default"
      : tone === "warning"
        ? "secondary"
        : tone === "danger"
          ? "destructive"
          : "outline";

  return <Badge variant={variant}>{getStatusLabel(status)}</Badge>;
}
