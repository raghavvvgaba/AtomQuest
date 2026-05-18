"use client";

import { CalendarDays } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { RequireRole } from "@/components/app/require-role";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QUARTER_WINDOWS, getActiveQuarter } from "@/lib/check-in-schedule";
import {
  GOAL_SETTING_WINDOW_LABEL,
  isGoalSettingWindowMonth,
} from "@/lib/goal-setting-schedule";

export function AdminCycleManagement() {
  const activeQuarter = getActiveQuarter();
  const isGoalSettingActive = isGoalSettingWindowMonth();

  return (
    <RequireRole role="admin">
      <div className="space-y-6">
        <PageHeader eyebrow="Admin cycles" title="Cycle management" />

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Goal setting</CardTitle>
                <StatusBadge active={isGoalSettingActive} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CycleRow label="Window opens" value={GOAL_SETTING_WINDOW_LABEL} />
              <CycleRow label="Action" value="Goal creation, submission and approval" />
              <CycleRow
                label="Current state"
                value={isGoalSettingActive ? "Open this month" : "Outside goal-setting month"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Active check-in</CardTitle>
                <StatusBadge active={Boolean(activeQuarter)} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CycleRow label="Current quarter" value={activeQuarter ?? "No active quarter"} />
              <CycleRow
                label="Employee submissions"
                value={activeQuarter ? "Open for the active quarter" : "Closed right now"}
              />
              <CycleRow label="Manager/Admin views" value="Historical quarters remain visible" />
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <CalendarDays className="size-5" />
              </div>
              <CardTitle>Quarterly windows</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[120px_1fr_1fr_140px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <span>Period</span>
                <span>Window</span>
                <span>Action</span>
                <span>Status</span>
              </div>
              {Object.entries(QUARTER_WINDOWS).map(([quarter, window]) => (
                <div
                  key={quarter}
                  className="grid grid-cols-[120px_1fr_1fr_140px] items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0"
                >
                  <span className="font-medium">{quarter}</span>
                  <span>{window.label}</span>
                  <span>{quarter === "Q4" ? "Final achievement capture" : "Progress update"}</span>
                  <StatusBadge active={activeQuarter === quarter} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </RequireRole>
  );
}

function CycleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="secondary">Active</Badge>
  ) : (
    <Badge variant="outline">Closed</Badge>
  );
}
