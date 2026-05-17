"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, RefreshCcw, SendHorizontal } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { RequireRole } from "@/components/app/require-role";
import { StatusBadge } from "@/components/app/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function ManagerDashboard() {
  const {
    currentUser,
    getManagerTeam,
    getGoalSheetByEmployee,
    getGoalsByGoalSheet,
    getManagerCheckInQueue,
  } =
    useAppStore();

  if (!currentUser) return null;

  const managerId = currentUser.id;
  const team = getManagerTeam(managerId);
  const items = team
    .map((employee) => {
      const goalSheet = getGoalSheetByEmployee(employee.id);
      return goalSheet ? { employee, goalSheet, goals: getGoalsByGoalSheet(goalSheet.id) } : null;
    })
    .filter(Boolean) as Array<{
    employee: (typeof team)[number];
    goalSheet: NonNullable<ReturnType<typeof getGoalSheetByEmployee>>;
    goals: ReturnType<typeof getGoalsByGoalSheet>;
  }>;

  const pending = items.filter((item) => item.goalSheet.status === "submitted");
  const returned = items.filter((item) => item.goalSheet.status === "returned");
  const approved = items.filter((item) => item.goalSheet.status === "approved");
  const checkInQueue = getManagerCheckInQueue(managerId);
  const submittedCheckIns = checkInQueue.filter((item) => item.checkIn.status === "submitted");

  return (
    <RequireRole role="manager">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Manager review"
          title="Manager dashboard"
        />

        <section className="grid gap-5 md:grid-cols-4">
          {[
            {
              label: "Pending approval",
              value: pending.length,
              icon: SendHorizontal,
              tone: "submitted",
            },
            {
              label: "Returned",
              value: returned.length,
              icon: RefreshCcw,
              tone: "returned",
            },
            {
              label: "Approved",
              value: approved.length,
              icon: CheckCircle2,
              tone: "approved",
            },
            {
              label: "Check-ins",
              value: submittedCheckIns.length,
              icon: ClipboardCheck,
              tone: "submitted",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label}>
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-3 text-4xl font-semibold">{item.value}</p>
                  </div>
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Pending approval queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pending.length === 0 ? (
                <div className="rounded-3xl bg-muted/50 px-5 py-6 text-sm text-muted-foreground">
                  No submitted sheets right now.
                </div>
              ) : (
                pending.map((item) => (
                  <div
                    key={item.employee.id}
                    className="flex flex-col gap-4 rounded-[26px] border border-border bg-card p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-2">
                      <p className="text-lg font-semibold">{item.employee.name}</p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {item.goals.length} goals submitted and waiting for review.
                      </p>
                    </div>
                    <Link
                      className={cn(buttonVariants({ variant: "default" }), "self-start md:self-auto")}
                      href={`/manager/goals/${item.employee.id}`}
                    >
                      Review sheet
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-5">
            {[
              { label: "Returned", items: returned },
              { label: "Approved", items: approved },
            ].map((section) => (
              <Card key={section.label}>
                <CardHeader>
                  <CardTitle>{section.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {section.items.length === 0 ? (
                    <p className="rounded-3xl bg-muted/50 px-4 py-4 text-sm text-muted-foreground">
                      Nothing here yet.
                    </p>
                  ) : (
                    section.items.map((item) => (
                      <div
                        key={item.employee.id}
                        className="flex items-center justify-between rounded-3xl bg-muted/50 px-4 py-4"
                      >
                        <div>
                          <p className="font-semibold">{item.employee.name}</p>
                          <p className="text-sm text-muted-foreground">{item.goals.length} goals</p>
                        </div>
                        <StatusBadge status={item.goalSheet.status} />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </RequireRole>
  );
}
