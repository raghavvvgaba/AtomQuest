"use client";

import { Download } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { RequireRole } from "@/components/app/require-role";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProgressStatusLabel } from "@/lib/goal-sheet";
import { useAppStore } from "@/store/app-store";

export function AdminReports() {
  const { getReportRows } = useAppStore();
  const rows = getReportRows();

  return (
    <RequireRole role="admin">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Admin reports"
          title="Planned vs actual report"
          actions={
            <Button disabled variant="secondary">
              <Download className="mr-2 size-4" />
              Export
            </Button>
          }
        />

        <Card>
          <CardContent className="overflow-x-auto p-0">
            <div className="min-w-[1120px]">
              <div className="grid grid-cols-[1fr_1fr_80px_1.2fr_1fr_100px_100px_120px_140px_120px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <span>Employee</span>
                <span>Manager</span>
                <span>Quarter</span>
                <span>Goal</span>
                <span>Thrust area</span>
                <span>Target</span>
                <span>Actual</span>
                <span>Computed</span>
                <span>Progress status</span>
                <span>Check-in</span>
              </div>
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[1fr_1fr_80px_1.2fr_1fr_100px_100px_120px_140px_120px] gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0"
                >
                  <span>{row.employeeName}</span>
                  <span>{row.managerName}</span>
                  <span>{row.quarter}</span>
                  <span>{row.goalTitle}</span>
                  <span>{row.thrustArea}</span>
                  <span>{row.targetValue}</span>
                  <span>{row.actualAchievement || "Missing"}</span>
                  <span>{row.computedProgress}</span>
                  <Badge variant="secondary">
                    {getProgressStatusLabel(row.progressStatus)}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {row.checkInStatus}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </RequireRole>
  );
}
