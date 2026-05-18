"use client";

import { ClipboardCheck, Hourglass, Users } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { RequireRole } from "@/components/app/require-role";
import { StatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getQuarterWindow } from "@/lib/check-in-schedule";
import { QUARTER_VALUES } from "@/lib/types";
import type { CheckIn, Quarter } from "@/lib/types";
import { useAppStore } from "@/store/app-store";

type CompletionState = "pending" | "submitted" | "reviewed";

export function AdminCompletionDashboard() {
  const { state, getGoalSheetByEmployee, getCheckInByEmployeeAndQuarter } = useAppStore();
  const [quarter, setQuarter] = useState<Quarter>("Q1");

  const managers = state.users.filter((user) => user.role === "manager");
  const employees = state.users.filter((user) => user.role === "employee");
  const quarterWindow = getQuarterWindow(quarter);

  const rows = employees.map((employee) => {
    const manager = employee.managerId
      ? state.users.find((user) => user.id === employee.managerId)
      : undefined;
    const goalSheet = getGoalSheetByEmployee(employee.id);
    const checkIn = getCheckInByEmployeeAndQuarter(employee.id, quarter);

    return {
      employee,
      manager,
      goalSheet,
      checkIn,
      completionState: getCompletionState(checkIn),
    };
  });

  const totals = {
    total: rows.length,
    reviewed: rows.filter((row) => row.completionState === "reviewed").length,
    submitted: rows.filter((row) => row.completionState === "submitted").length,
    pending: rows.filter((row) => row.completionState === "pending").length,
  };

  return (
    <RequireRole role="admin">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Admin completion"
          title="Check-in completion"
          actions={
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
          }
        />

        <section className="grid gap-4 md:grid-cols-4">
          <Metric icon={Users} label="Employees" value={totals.total} />
          <Metric icon={ClipboardCheck} label="Reviewed" value={totals.reviewed} />
          <Metric icon={Hourglass} label="Awaiting review" value={totals.submitted} />
          <Metric icon={Hourglass} label="Pending" value={totals.pending} />
        </section>

        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {quarter} normally opens in <span className="font-medium text-foreground">{quarterWindow.label}</span>.
            Demo mode keeps completion tracking visible for every quarter.
          </CardContent>
        </Card>

        <section className="space-y-4">
          {managers.map((manager) => {
            const teamRows = rows.filter((row) => row.manager?.id === manager.id);
            const managerTotals = getManagerTotals(teamRows);

            return (
              <Card key={manager.id}>
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle>{manager.name}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{managerTotals.total} reports</Badge>
                      <Badge variant="outline">{managerTotals.reviewed} reviewed</Badge>
                      <Badge variant="outline">{managerTotals.submitted} awaiting review</Badge>
                      <Badge variant={managerTotals.pending > 0 ? "destructive" : "secondary"}>
                        {managerTotals.pending} pending
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <div className="min-w-[820px]">
                    <div className="grid grid-cols-[1.2fr_1fr_140px_150px_150px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <span>Employee</span>
                      <span>Manager</span>
                      <span>Goal sheet</span>
                      <span>Check-in</span>
                      <span>Completion</span>
                    </div>
                    {teamRows.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-muted-foreground">
                        No direct reports assigned.
                      </p>
                    ) : (
                      teamRows.map((row) => (
                        <div
                          key={`${row.employee.id}-${quarter}`}
                          className="grid grid-cols-[1.2fr_1fr_140px_150px_150px] items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0"
                        >
                          <span className="font-medium">{row.employee.name}</span>
                          <span>{row.manager?.name ?? "No manager"}</span>
                          <span>
                            {row.goalSheet ? (
                              <StatusBadge status={row.goalSheet.status} />
                            ) : (
                              <Badge variant="outline">No sheet</Badge>
                            )}
                          </span>
                          <CheckInStatusBadge checkIn={row.checkIn} />
                          <CompletionBadge state={row.completionState} />
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </RequireRole>
  );
}

function getCompletionState(checkIn?: CheckIn): CompletionState {
  if (checkIn?.status === "reviewed") return "reviewed";
  if (checkIn?.status === "submitted") return "submitted";
  return "pending";
}

function getManagerTotals(rows: Array<{ completionState: CompletionState }>) {
  return {
    total: rows.length,
    reviewed: rows.filter((row) => row.completionState === "reviewed").length,
    submitted: rows.filter((row) => row.completionState === "submitted").length,
    pending: rows.filter((row) => row.completionState === "pending").length,
  };
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold">{value}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function CheckInStatusBadge({ checkIn }: { checkIn?: CheckIn }) {
  if (!checkIn) return <Badge variant="outline">Not started</Badge>;

  return (
    <Badge
      variant={
        checkIn.status === "reviewed"
          ? "secondary"
          : checkIn.status === "submitted"
            ? "default"
            : "outline"
      }
      className="capitalize"
    >
      {checkIn.status}
    </Badge>
  );
}

function CompletionBadge({ state }: { state: CompletionState }) {
  if (state === "reviewed") return <Badge variant="secondary">Completed</Badge>;
  if (state === "submitted") return <Badge variant="default">Awaiting review</Badge>;
  return <Badge variant="destructive">Pending</Badge>;
}
