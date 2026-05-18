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
import { getActiveQuarter, getNextQuarterWindow, getQuarterWindow } from "@/lib/check-in-schedule";
import { PROGRESS_STATUS_VALUES } from "@/lib/types";
import type { CheckInGoalUpdateDraft, ProgressStatus } from "@/lib/types";
import { useAppStore } from "@/store/app-store";

export function EmployeeCheckIns() {
  const {
    currentUser,
    state,
    getGoalSheetByEmployee,
    getGoalsByGoalSheet,
    getCheckInByEmployeeAndQuarter,
    getCheckInGoalUpdates,
    getComputedProgress,
    getSharedGoalById,
    saveCheckInDraft,
    submitCheckIn,
  } = useAppStore();
  const [notice, setNotice] = useState<string | null>(null);
  const [submitSummary, setSubmitSummary] = useState<string[]>([]);
  const activeQuarter = getActiveQuarter();
  const nextQuarterWindow = getNextQuarterWindow();
  const quarter = activeQuarter ?? nextQuarterWindow.quarter;
  const employeeId = currentUser?.id ?? "";
  const goalSheet = currentUser ? getGoalSheetByEmployee(currentUser.id) : undefined;
  const goals = goalSheet ? getGoalsByGoalSheet(goalSheet.id) : [];
  const checkIn = currentUser ? getCheckInByEmployeeAndQuarter(currentUser.id, quarter) : undefined;
  const updates = checkIn ? getCheckInGoalUpdates(checkIn.id) : [];
  const isEditable = !checkIn || checkIn.status === "draft";
  const canUseCheckIns = goalSheet?.status === "approved";
  const quarterWindow = getQuarterWindow(quarter);
  const canEditActiveCheckIn = canUseCheckIns && Boolean(activeQuarter);

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
    if (!activeQuarter) return;

    const nextUpdates = draftUpdates.map((update) =>
      update.goalId === goalId ? { ...update, ...patch } : update,
    );
    void saveCheckInDraft(employeeId, activeQuarter, nextUpdates);
    setNotice(null);
    setSubmitSummary([]);
  }

  async function handleSave() {
    if (!activeQuarter) {
      setNotice(null);
      setSubmitSummary([`Check-ins are currently closed. Next window: ${nextQuarterWindow.quarter} in ${nextQuarterWindow.label}.`]);
      return;
    }

    const saved = await saveCheckInDraft(employeeId, activeQuarter, draftUpdates);
    setNotice(saved ? "Draft saved." : "Draft could not be saved.");
    setSubmitSummary(saved ? [] : ["We could not save this check-in draft."]);
  }

  async function handleSubmit() {
    if (!activeQuarter) {
      setNotice(null);
      setSubmitSummary([`Check-ins are currently closed. Next window: ${nextQuarterWindow.quarter} in ${nextQuarterWindow.label}.`]);
      return;
    }

    const saved = await saveCheckInDraft(employeeId, activeQuarter, draftUpdates);
    if (!saved) {
      setNotice(null);
      setSubmitSummary(["We could not save the latest check-in changes."]);
      return;
    }

    const result = await submitCheckIn(employeeId, activeQuarter);
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
              <Badge variant="outline">
                {activeQuarter ? `Active: ${activeQuarter}` : "No active window"}
              </Badge>
            </>
          }
        />

        {!canUseCheckIns ? (
          <Alert className="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <AlertTitle>Check-in unavailable</AlertTitle>
            <AlertDescription>
              Check-ins are available only after the goal sheet is approved.
            </AlertDescription>
          </Alert>
        ) : null}

        {canUseCheckIns ? (
          <Alert
            className={
              activeQuarter
                ? "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }
          >
            <AlertTitle>
              {activeQuarter
                ? `${quarter} check-in window: ${quarterWindow.label}`
                : "Check-ins are currently closed"}
            </AlertTitle>
            <AlertDescription>
              {activeQuarter
                ? "This quarter is currently inside its PRD check-in window."
                : `Next window: ${nextQuarterWindow.quarter} in ${nextQuarterWindow.label}.`}
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
            const sharedGoal = goal.sharedGoalId ? getSharedGoalById(goal.sharedGoalId) : undefined;
            const isPrimaryOwner = sharedGoal?.primaryOwnerEmployeeId === currentUser.id;
            const primaryOwnerName = sharedGoal
              ? state.users.find((user) => user.id === sharedGoal.primaryOwnerEmployeeId)?.name
              : undefined;
            const isSyncedSharedGoal = Boolean(sharedGoal && !isPrimaryOwner);
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
                      disabled={!isEditable || !canEditActiveCheckIn || isSyncedSharedGoal}
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
                      disabled={!isEditable || !canEditActiveCheckIn || isSyncedSharedGoal}
                      onValueChange={(value) =>
                        updateDraft(goal.id, { progressStatus: value as ProgressStatus })
                      }
                      value={update?.progressStatus || ""}
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
                  {sharedGoal ? (
                    <div className="md:col-span-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-700 dark:text-sky-300">
                      {isPrimaryOwner
                        ? "You are the primary owner for this shared goal. Your submitted achievement will sync to the linked employees."
                        : update?.actualAchievement
                          ? `This shared goal is synced from ${primaryOwnerName ?? "the primary owner"}.`
                          : `Waiting for ${primaryOwnerName ?? "the primary owner"} to submit the shared goal achievement.`}
                    </div>
                  ) : null}
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
              <Button disabled={!canEditActiveCheckIn || !isEditable} variant="secondary" onClick={handleSave}>
                <Save className="mr-2 size-4" />
                Save draft
              </Button>
              <Button disabled={!canEditActiveCheckIn || !isEditable} onClick={handleSubmit}>
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
