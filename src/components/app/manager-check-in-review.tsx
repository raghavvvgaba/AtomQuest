"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { RequireRole } from "@/components/app/require-role";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getProgressStatusLabel } from "@/lib/goal-sheet";
import { QUARTER_VALUES } from "@/lib/types";
import type { Quarter } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function ManagerCheckInReview({ employeeId }: { employeeId: string }) {
  const {
    currentUser,
    state,
    getGoalSheetByEmployee,
    getGoalsByGoalSheet,
    getCheckInsByGoalSheet,
    getCheckInByEmployeeAndQuarter,
    getCheckInGoalUpdates,
    getComputedProgress,
    reviewCheckIn,
  } = useAppStore();
  const employee = state.users.find((user) => user.id === employeeId && user.role === "employee");
  const goalSheet = getGoalSheetByEmployee(employeeId);
  const checkIns = goalSheet ? getCheckInsByGoalSheet(goalSheet.id) : [];
  const [quarter, setQuarter] = useState<Quarter>(checkIns[0]?.quarter ?? "Q1");
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const checkIn = getCheckInByEmployeeAndQuarter(employeeId, quarter);
  const updates = checkIn ? getCheckInGoalUpdates(checkIn.id) : [];
  const goals = useMemo(
    () => (goalSheet ? getGoalsByGoalSheet(goalSheet.id) : []),
    [goalSheet, getGoalsByGoalSheet],
  );

  if (!currentUser) return null;

  const isDirectReport = employee?.managerId === currentUser.id;

  if (!employee || !goalSheet || !isDirectReport) {
    return (
      <RequireRole role="manager">
        <Card>
          <CardHeader>
            <CardTitle>Check-in not found</CardTitle>
          </CardHeader>
        </Card>
      </RequireRole>
    );
  }

  const canReview = checkIn?.status === "submitted";

  return (
    <RequireRole role="manager">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Manager check-in"
          title={`Review ${employee.name}`}
          actions={
            <>
              <Select onValueChange={(value) => setQuarter(value as Quarter)} value={quarter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUARTER_VALUES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link className={cn(buttonVariants({ variant: "outline" }))} href="/manager/check-ins">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </>
          }
        />

        <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {goals.map((goal) => {
              const update = updates.find((item) => item.goalId === goal.id);
              return (
                <Card key={goal.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                          {goal.thrustArea}
                        </p>
                        <CardTitle>{goal.title}</CardTitle>
                      </div>
                      <Badge variant="secondary">{checkIn?.status ?? "No check-in"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-4">
                    <Metric label="Target" value={goal.targetValue} />
                    <Metric label="Actual" value={update?.actualAchievement || "Missing"} />
                    <Metric
                      label="Status"
                      value={getProgressStatusLabel(update?.progressStatus ?? "")}
                    />
                    <Metric
                      label="Computed progress"
                      value={getComputedProgress(goal, update?.actualAchievement ?? "")}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Review decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm">
                Current status: <strong className="capitalize">{checkIn?.status ?? "none"}</strong>
              </div>
              <div className="space-y-2">
                <Label>Manager comment</Label>
                <Textarea
                  disabled={!canReview}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={!canReview}
                onClick={async () => {
                  const reviewed = await reviewCheckIn(employee.id, quarter, comment);
                  setNotice(reviewed ? "Check-in marked as reviewed." : null);
                }}
              >
                <Check className="mr-2 size-4" />
                Mark reviewed
              </Button>
              {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
              {checkIn?.managerComment ? (
                <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm">
                  {checkIn.managerComment}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </RequireRole>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}
