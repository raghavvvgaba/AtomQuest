"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { RequireRole } from "@/components/app/require-role";
import { StatusBadge } from "@/components/app/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function EmployeeDashboard() {
  const { currentUser, getGoalSheetByEmployee, getGoalsByGoalSheet, getGoalSheetTotalWeightage } =
    useAppStore();

  if (!currentUser) return null;

  const employeeId = currentUser.id;
  const goalSheet = getGoalSheetByEmployee(employeeId);
  const goals = goalSheet ? getGoalsByGoalSheet(goalSheet.id) : [];
  const totalWeightage = getGoalSheetTotalWeightage(employeeId);

  return (
    <RequireRole role="employee">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Employee view"
          title={`Welcome back, ${currentUser.name.split(" ")[0]}`}
          status={goalSheet?.status}
          actions={
            <>
              <Link
                className={cn(buttonVariants({ variant: "default", size: "lg" }))}
                href="/employee/goals"
              >
                Open goal sheet
                <ArrowRight className="size-4" />
              </Link>
              <Link
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                href="/employee/check-ins"
              >
                Check-ins
                <ClipboardCheck className="size-4" />
              </Link>
            </>
          }
        />

        <section className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Current sheet</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Status</p>
                <div className="mt-3">
                  {goalSheet ? <StatusBadge status={goalSheet.status} /> : <span>No sheet</span>}
                </div>
              </div>
              <div className="rounded-3xl bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Goal count</p>
                <p className="mt-3 text-3xl font-semibold">{goals.length}</p>
              </div>
              <div className="rounded-3xl bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Total weightage
                </p>
                <p className="mt-3 text-3xl font-semibold">{totalWeightage}%</p>
              </div>
            </CardContent>
          </Card>

        </section>

        {goalSheet?.status === "submitted" ? (
          <Alert className="border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300">
            <AlertTitle>Under review by manager</AlertTitle>
            <AlertDescription>
              Your goal sheet has been submitted and is currently under manager review. Editing is
              disabled until it is returned for rework.
            </AlertDescription>
          </Alert>
        ) : null}

        {goalSheet?.status === "approved" ? (
          <Alert className="border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <AlertTitle>Goals locked</AlertTitle>
            <AlertDescription>
              Your manager has approved this goal sheet. The goals are now locked and cannot be
              edited unless an admin unlocks them.
            </AlertDescription>
          </Alert>
        ) : null}

        {goalSheet?.status === "unlocked" ? (
          <Alert className="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <AlertTitle>Unlocked by admin</AlertTitle>
            <AlertDescription>
              An admin has unlocked your approved goal sheet. You can now update the goals and
              submit the sheet again for manager review.
            </AlertDescription>
          </Alert>
        ) : null}

        {goalSheet?.status === "returned" && goalSheet.managerComment ? (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardHeader>
              <CardTitle>Returned for rework</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-foreground">
              {goalSheet.managerComment}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </RequireRole>
  );
}
