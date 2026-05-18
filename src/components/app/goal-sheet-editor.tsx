"use client";

import { Plus, Save, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { GoalRowEditor } from "@/components/app/goal-row-editor";
import { PageHeader } from "@/components/app/page-header";
import { RequireRole } from "@/components/app/require-role";
import { StatusBadge } from "@/components/app/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { validateGoalSheet } from "@/lib/goal-sheet";
import { useAppStore } from "@/store/app-store";

export function GoalSheetEditor() {
  const {
    currentUser,
    state,
    getGoalSheetByEmployee,
    getGoalsByGoalSheet,
    getGoalSheetTotalWeightage,
    getSharedGoalById,
    addGoal,
    removeGoal,
    updateGoalField,
    saveGoalSheetDraft,
    submitGoalSheet,
  } = useAppStore();

  const [submitAttempted, setSubmitAttempted] = useState(false);
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

  async function handleSaveDraft() {
    setIsSavingDraft(true);

    try {
      const saved = await saveGoalSheetDraft(employeeId);
      if (saved) {
        toast.success("Draft saved", {
          description: "Your goal sheet draft has been saved.",
        });
      } else {
        toast.error("Draft could not be saved", {
          description: "Please try saving the goal sheet again.",
        });
      }
    } catch {
      toast.error("Draft could not be saved", {
        description: "Please try saving the goal sheet again.",
      });
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleSubmit() {
    setSubmitAttempted(true);
    setIsSubmittingSheet(true);

    try {
      const result = await submitGoalSheet(employeeId);
      if (result.isValid) {
        toast.success("Goal sheet submitted", {
          description: "Your goal sheet has been sent to your manager for review.",
        });
      } else {
        toast.error("Submission blocked", {
          description: result.summary.join(" "),
        });
      }
    } catch {
      toast.error("Submission failed", {
        description: "Please try submitting the goal sheet again.",
      });
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

            {goals.map((goal, index) => {
              const sharedGoal = goal.sharedGoalId ? getSharedGoalById(goal.sharedGoalId) : undefined;
              const primaryOwnerName = sharedGoal
                ? state.users.find((user) => user.id === sharedGoal.primaryOwnerEmployeeId)?.name
                : undefined;

              return (
                <GoalRowEditor
                  key={goal.id}
                  allowRemove={isEditable && !goal.sharedGoalId}
                  errors={submitAttempted ? validation.goalErrors[goal.id] : undefined}
                  fieldReadOnly={
                    goal.sharedGoalId
                      ? {
                          thrustArea: true,
                          title: true,
                          description: true,
                          uomType: true,
                          uomDirection: true,
                          targetValue: true,
                        }
                      : undefined
                  }
                  goal={goal}
                  index={index}
                  onFieldChange={(goalId, field, value) =>
                    updateGoalField(employeeId, goalId, field, value)
                  }
                  onRemove={(goalId) => removeGoal(employeeId, goalId)}
                  readOnly={!isEditable}
                  sharedGoalLabel={
                    sharedGoal
                      ? sharedGoal.primaryOwnerEmployeeId === currentUser.id
                        ? "Shared goal. You are the primary owner and can adjust only the weightage here."
                        : `Shared goal. Only weightage is editable here. Achievement will sync from ${primaryOwnerName ?? "the primary owner"}.`
                      : null
                  }
                />
              );
            })}
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
