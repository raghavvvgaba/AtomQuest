"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Check, MessageSquareDashed, RotateCcw } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { RequireRole } from "@/components/app/require-role";
import { StatusBadge } from "@/components/app/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function ManagerReview({ employeeId }: { employeeId: string }) {
  const {
    currentUser,
    state,
    getGoalSheetByEmployee,
    getGoalsByGoalSheet,
    getGoalSheetTotalWeightage,
    updateManagerReview,
    returnGoalSheet,
    approveGoalSheet,
  } = useAppStore();
  const [returnComment, setReturnComment] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [approvalErrors, setApprovalErrors] = useState<string[]>([]);
  const [isReturning, setIsReturning] = useState(false);

  const employee = state.users.find((user) => user.id === employeeId && user.role === "employee");
  const goalSheet = getGoalSheetByEmployee(employeeId);
  const goals = useMemo(
    () => (goalSheet ? getGoalsByGoalSheet(goalSheet.id) : []),
    [goalSheet, getGoalsByGoalSheet],
  );

  if (!currentUser) return null;

  const isDirectReport = employee?.managerId === currentUser.id;
  const isReviewable = goalSheet?.status === "submitted";
  const totalWeightage = getGoalSheetTotalWeightage(employeeId);

  if (!employee || !goalSheet || !isDirectReport) {
    return (
      <RequireRole role="manager">
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>Sheet not found</CardTitle>
            <CardDescription>The requested employee or goal sheet is unavailable.</CardDescription>
          </CardHeader>
        </Card>
      </RequireRole>
    );
  }

  const hasReturnComment = returnComment.trim().length > 0;

  return (
    <RequireRole role="manager">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Manager review"
          title={`Review ${employee.name}'s goal sheet`}
          status={goalSheet.status}
          actions={
            <Link
              className={cn(buttonVariants({ variant: "outline" }))}
              href="/manager"
            >
              <ArrowLeft className="size-4" />
              Back to manager dashboard
            </Link>
          }
        />

        <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            {goals.map((goal, index) => (
              <Card key={goal.id} className="bg-card">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        Goal {index + 1}
                      </p>
                      <CardTitle>{goal.title}</CardTitle>
                      <CardDescription>{goal.description}</CardDescription>
                    </div>
                    <StatusBadge status={goalSheet.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-muted/50 p-4 text-sm">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        Thrust area
                      </p>
                      <p className="mt-2 font-semibold">{goal.thrustArea}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/50 p-4 text-sm">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        UoM
                      </p>
                      <p className="mt-2 font-semibold capitalize">
                        {goal.uomType} ·{" "}
                        {goal.uomDirection === "min"
                          ? "higher is better"
                          : goal.uomDirection === "max"
                            ? "lower is better"
                            : goal.uomDirection === "timeline"
                              ? "date-based"
                              : "zero is success"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Target value</Label>
                      <Input
                        disabled={!isReviewable || goal.uomType === "zero"}
                        type={goal.uomType === "timeline" ? "date" : "number"}
                        value={goal.targetValue}
                        onChange={(event) =>
                          updateManagerReview(employee.id, [
                            {
                              id: goal.id,
                              targetValue: event.target.value,
                              weightage: goal.weightage,
                            },
                          ])
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Weightage (%)</Label>
                      <Input
                        disabled={!isReviewable}
                        type="number"
                        value={goal.weightage ?? ""}
                        onChange={(event) =>
                          updateManagerReview(employee.id, [
                            {
                              id: goal.id,
                              targetValue: goal.targetValue,
                              weightage:
                                event.target.value === "" ? null : Number(event.target.value),
                            },
                          ])
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Decision panel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm">
                  Reviewing <strong>{employee.name}</strong>
                </div>
                <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm">
                  Current state: <strong className="capitalize">{goalSheet.status}</strong>
                </div>
                <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm">
                  Total weightage: <strong>{totalWeightage}%</strong>
                </div>
                {approvalErrors.length > 0 ? (
                  <Alert variant="destructive">
                    <AlertTitle>Approval blocked</AlertTitle>
                    <AlertDescription className="space-y-2">
                      {approvalErrors.map((message) => (
                        <p key={message}>{message}</p>
                      ))}
                    </AlertDescription>
                  </Alert>
                ) : null}
                <div className="space-y-2">
                  <Label>Return comment</Label>
                  <Textarea
                    disabled={!isReviewable}
                    value={returnComment}
                    onChange={(event) => {
                      setReturnComment(event.target.value);
                      setApprovalErrors([]);
                    }}
                  />
                  {hasReturnComment ? (
                    <p className="text-sm text-muted-foreground">
                      Clear the return comment to approve this sheet.
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-3">
                  <Button
                    disabled={!isReviewable || hasReturnComment}
                    onClick={async () => {
                      const result = await approveGoalSheet(employee.id);
                      if (!result.isValid) {
                        setApprovalErrors(result.summary);
                        setActionNotice(null);
                        return;
                      }

                      setApprovalErrors([]);
                      setActionNotice("Sheet approved and locked for the employee.");
                    }}
                    type="button"
                  >
                    <Check className="mr-2 size-4" />
                    Approve and lock
                  </Button>
                  <Button
                    disabled={!isReviewable || isReturning}
                    onClick={async () => {
                      setIsReturning(true);
                      setApprovalErrors([]);
                      setActionNotice(null);

                      try {
                        const returned = await returnGoalSheet(employee.id, returnComment);
                        setActionNotice(
                          returned ? "Sheet returned to the employee for rework." : null,
                        );
                      } finally {
                        setIsReturning(false);
                      }
                    }}
                    type="button"
                    variant="secondary"
                  >
                    <RotateCcw className="mr-2 size-4" />
                    {isReturning ? "Returning..." : "Return for rework"}
                  </Button>
                </div>
                {actionNotice ? (
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                    {actionNotice}
                  </div>
                ) : null}
                {goalSheet.managerComment ? (
                  <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm leading-6 text-foreground">
                    <MessageSquareDashed className="mr-2 inline size-4 text-muted-foreground" />
                    Last manager note: {goalSheet.managerComment}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </RequireRole>
  );
}
