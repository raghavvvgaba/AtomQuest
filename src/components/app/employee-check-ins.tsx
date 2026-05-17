"use client";

import { useState } from "react";
import { Save, Send } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { RequireRole } from "@/components/app/require-role";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getProgressStatusLabel,
} from "@/lib/goal-sheet";
import { QUARTER_VALUES, PROGRESS_STATUS_VALUES } from "@/lib/types";
import type { CheckInGoalUpdateDraft, ProgressStatus, Quarter } from "@/lib/types";
import { useAppStore } from "@/store/app-store";

export function EmployeeCheckIns() {
  const {
    currentUser,
    getGoalSheetByEmployee,
    getGoalsByGoalSheet,
    getCheckInByEmployeeAndQuarter,
    getCheckInGoalUpdates,
    getComputedProgress,
    saveCheckInDraft,
    submitCheckIn,
  } = useAppStore();
  const [quarter, setQuarter] = useState<Quarter>("Q1");
  const [notice, setNotice] = useState<string | null>(null);
  const [submitSummary, setSubmitSummary] = useState<string[]>([]);
  const employeeId = currentUser?.id ?? "";
  const goalSheet = currentUser ? getGoalSheetByEmployee(currentUser.id) : undefined;
  const goals = goalSheet ? getGoalsByGoalSheet(goalSheet.id) : [];
  const checkIn = currentUser ? getCheckInByEmployeeAndQuarter(currentUser.id, quarter) : undefined;
  const updates = checkIn ? getCheckInGoalUpdates(checkIn.id) : [];
  const isEditable = !checkIn || checkIn.status === "draft";
  const canUseCheckIns = goalSheet?.status === "approved";

  const draftUpdates: CheckInGoalUpdateDraft[] = goals.map((goal) => {
    const update = updates.find((item) => item.goalId === goal.id);
    return {
      goalId: goal.id,
      actualAchievement: update?.actualAchievement ?? "",
      progressStatus: update?.progressStatus ?? "",
    };
  });

  if (!currentUser) return null;

  function updateDraft(goalId: string, patch: Partial<CheckInGoalUpdateDraft>) {
    const nextUpdates = draftUpdates.map((update) =>
      update.goalId === goalId ? { ...update, ...patch } : update,
    );
    saveCheckInDraft(employeeId, quarter, nextUpdates);
    setNotice(null);
    setSubmitSummary([]);
  }

  function handleSave() {
    saveCheckInDraft(employeeId, quarter, draftUpdates);
    setNotice("Draft saved.");
    setSubmitSummary([]);
  }

  function handleSubmit() {
    saveCheckInDraft(employeeId, quarter, draftUpdates);
    const result = submitCheckIn(employeeId, quarter);
    setSubmitSummary(result.summary);
    setNotice(result.isValid ? "Check-in submitted." : null);
  }

  return (
    <RequireRole role="employee">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Employee check-in"
          title="Quarterly check-in"
          actions={
            <>
              {checkIn ? <Badge variant="secondary">{checkIn.status}</Badge> : null}
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
            </>
          }
        />

        {!canUseCheckIns ? (
          <Alert>
            <AlertTitle>Check-in unavailable</AlertTitle>
            <AlertDescription>
              Check-ins are available only after the goal sheet is approved.
            </AlertDescription>
          </Alert>
        ) : null}

        {submitSummary.length > 0 ? (
          <Alert variant="destructive">
            <AlertTitle>Submission blocked</AlertTitle>
            <AlertDescription className="space-y-2">
              {submitSummary.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-4">
          {goals.map((goal) => {
            const update = draftUpdates.find((item) => item.goalId === goal.id);
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
                    {checkIn ? <Badge variant="secondary">{checkIn.status}</Badge> : null}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm">
                    <p className="text-muted-foreground">Target</p>
                    <p className="mt-2 font-semibold">{goal.targetValue}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Actual achievement</Label>
                    <Input
                      disabled={!isEditable || !canUseCheckIns}
                      type={goal.uomType === "timeline" ? "date" : "text"}
                      value={update?.actualAchievement ?? ""}
                      onChange={(event) =>
                        updateDraft(goal.id, { actualAchievement: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Progress status</Label>
                    <Select
                      disabled={!isEditable || !canUseCheckIns}
                      onValueChange={(value) =>
                        updateDraft(goal.id, { progressStatus: value as ProgressStatus })
                      }
                      value={update?.progressStatus || undefined}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROGRESS_STATUS_VALUES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {getProgressStatusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm">
                    <p className="text-muted-foreground">Computed progress</p>
                    <p className="mt-2 font-semibold">
                      {getComputedProgress(goal, update?.actualAchievement ?? "")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-sm text-muted-foreground">
              {checkIn ? `Current status: ${checkIn.status}` : "No draft saved yet."}
              {notice ? <span className="ml-3 text-foreground">{notice}</span> : null}
            </div>
            <div className="flex gap-3">
              <Button disabled={!canUseCheckIns || !isEditable} variant="secondary" onClick={handleSave}>
                <Save className="mr-2 size-4" />
                Save draft
              </Button>
              <Button disabled={!canUseCheckIns || !isEditable} onClick={handleSubmit}>
                <Send className="mr-2 size-4" />
                Submit check-in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </RequireRole>
  );
}
