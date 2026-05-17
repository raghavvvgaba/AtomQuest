"use client";

import { Plus, Save, Send, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { GoalRowEditor } from "@/components/app/goal-row-editor";
import { PageHeader } from "@/components/app/page-header";
import { RequireRole } from "@/components/app/require-role";
import { StatusBadge } from "@/components/app/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { validateGoalSheet } from "@/lib/goal-sheet";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function GoalSheetEditor() {
  const {
    currentUser,
    getGoalSheetByEmployee,
    getGoalsByGoalSheet,
    getGoalSheetTotalWeightage,
    addGoal,
    removeGoal,
    updateGoalField,
    saveGoalSheetDraft,
    submitGoalSheet,
  } = useAppStore();

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"draft" | "success">("draft");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingSheet, setIsSubmittingSheet] = useState(false);

  const goalSheet = currentUser ? getGoalSheetByEmployee(currentUser.id) : undefined;
  const goals = useMemo(
    () => (goalSheet ? getGoalsByGoalSheet(goalSheet.id) : []),
    [goalSheet, getGoalsByGoalSheet],
  );

  if (!currentUser || !goalSheet) return null;

  const employeeId = currentUser.id;
  const validation = validateGoalSheet(goalSheet, goals);
  const isEditable =
    goalSheet.status === "draft" ||
    goalSheet.status === "returned" ||
    goalSheet.status === "unlocked";
  const totalWeightage = getGoalSheetTotalWeightage(employeeId);
  const isSubmittedState = goalSheet.status === "submitted" || goalSheet.status === "approved";

  async function handleSaveDraft() {
    setIsSavingDraft(true);
    setDraftNotice(null);

    try {
      const saved = await saveGoalSheetDraft(employeeId);
      setNoticeTone("draft");
      setDraftNotice(saved ? "Draft saved." : "Draft could not be saved.");
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleSubmit() {
    setSubmitAttempted(true);
    setIsSubmittingSheet(true);
    setDraftNotice(null);

    try {
      const result = await submitGoalSheet(employeeId);
      if (result.isValid) {
        setNoticeTone("success");
        setDraftNotice("Goal sheet submitted to your manager.");
      } else {
        setDraftNotice(null);
      }
    } finally {
      setIsSubmittingSheet(false);
    }
  }

  return (
    <RequireRole role="employee">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Employee editor"
          title="Build your goal sheet"
          status={goalSheet.status}
          actions={
            <>
              <Button
                disabled={!isEditable || goals.length >= 8 || isSavingDraft || isSubmittingSheet}
                variant="secondary"
                onClick={() => addGoal(employeeId)}
                type="button"
              >
                <Plus className="mr-2 size-4" />
                Add goal
              </Button>
              <Button
                disabled={!isEditable || isSavingDraft || isSubmittingSheet}
                variant="secondary"
                onClick={handleSaveDraft}
                type="button"
              >
                <Save className="mr-2 size-4" />
                {isSavingDraft ? "Saving draft..." : "Save draft"}
              </Button>
              <Button
                disabled={!isEditable || isSavingDraft || isSubmittingSheet}
                onClick={handleSubmit}
                type="button"
              >
                <Send className="mr-2 size-4" />
                {isSubmittingSheet ? "Submitting..." : "Submit sheet"}
              </Button>
            </>
          }
        />

        <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            {goalSheet.status === "submitted" ? (
              <Alert className="border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                <AlertTitle>Under review by manager</AlertTitle>
                <AlertDescription>
                  This goal sheet has been submitted and is waiting for manager review. Editing is
                  disabled until it is returned for rework.
                </AlertDescription>
              </Alert>
            ) : null}

            {goalSheet.status === "approved" ? (
              <Alert className="border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <AlertTitle>Goals locked</AlertTitle>
                <AlertDescription>
                  Your manager has approved this goal sheet. The goals are locked and cannot be
                  edited unless an admin unlocks them.
                </AlertDescription>
              </Alert>
            ) : null}

            {goalSheet.status === "unlocked" ? (
              <Alert className="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <AlertTitle>Unlocked by admin</AlertTitle>
                <AlertDescription>
                  An admin has unlocked this approved goal sheet. You can now update the goals and
                  submit the sheet again for manager review.
                </AlertDescription>
              </Alert>
            ) : null}

            {goalSheet.status === "returned" && goalSheet.managerComment ? (
              <Card className="border-destructive/30 bg-destructive/10">
                <CardHeader>
                  <CardTitle>Manager comment</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-7 text-foreground">
                  {goalSheet.managerComment}
                </CardContent>
              </Card>
            ) : null}

            {(submitAttempted && (validation.summary.length > 0 || Object.keys(validation.goalErrors).length > 0)) ? (
              <Alert variant="destructive">
                <TriangleAlert className="size-5" />
                <AlertTitle>Submission blocked</AlertTitle>
                <AlertDescription className="space-y-2 text-sm leading-7">
                  {validation.summary.map((message) => (
                    <p key={message}>{message}</p>
                  ))}
                </AlertDescription>
              </Alert>
            ) : null}

            {goals.map((goal, index) => (
              <GoalRowEditor
                key={goal.id}
                allowRemove={isEditable}
                errors={submitAttempted ? validation.goalErrors[goal.id] : undefined}
                goal={goal}
                index={index}
                onFieldChange={(goalId, field, value) =>
                  updateGoalField(employeeId, goalId, field, value)
                }
                onRemove={(goalId) => removeGoal(employeeId, goalId)}
                readOnly={!isEditable}
              />
            ))}
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Sheet summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
                  <span>Status</span>
                  <StatusBadge status={goalSheet.status} />
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
                  <span>Total goals</span>
                  <strong className="text-foreground">{goals.length}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
                  <span>Total weightage</span>
                  <strong className="text-foreground">{totalWeightage}%</strong>
                </div>
                {draftNotice ? (
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3",
                      noticeTone === "success" || isSubmittedState
                        ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
                    )}
                  >
                    {draftNotice}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Validation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
                <p>1. No more than 8 goals on one sheet.</p>
                <p>2. Every goal needs complete details before submission.</p>
                <p>3. Each goal must carry at least 10% weightage.</p>
                <p>4. Total weightage must land exactly at 100%.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </RequireRole>
  );
}
