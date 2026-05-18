"use client";

import { useState } from "react";
import { LockOpen } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { RequireRole } from "@/components/app/require-role";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";

export function AdminUnlock() {
  const { state, getGoalsByGoalSheet, unlockGoalSheet } = useAppStore();
  const [unlockingEmployeeId, setUnlockingEmployeeId] = useState<string | null>(null);
  const approvedSheets = state.goalSheets.filter((sheet) => sheet.status === "approved");

  return (
    <RequireRole role="admin">
      <div className="space-y-6">
        <PageHeader eyebrow="Admin" title="Unlock goal sheets" />

        <Card>
          <CardHeader>
            <CardTitle>Approved sheets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvedSheets.length === 0 ? (
              <p className="rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                No approved goal sheets available.
              </p>
            ) : (
              approvedSheets.map((sheet) => {
                const employee = state.users.find((user) => user.id === sheet.employeeId);
                const goals = getGoalsByGoalSheet(sheet.id);
                return (
                  <div
                    key={sheet.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold">{employee?.name ?? sheet.employeeId}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{goals.length} goals</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={sheet.status} />
                      <Button
                        disabled={unlockingEmployeeId === sheet.employeeId}
                        onClick={async () => {
                          const employeeName = employee?.name ?? sheet.employeeId;
                          setUnlockingEmployeeId(sheet.employeeId);

                          try {
                            const unlocked = await unlockGoalSheet(sheet.employeeId);
                            if (unlocked) {
                              toast.success("Goal sheet unlocked", {
                                description: `${employeeName}'s goal sheet is now editable again.`,
                              });
                            } else {
                              toast.error("Unlock failed", {
                                description: `We could not unlock ${employeeName}'s goal sheet.`,
                              });
                            }
                          } finally {
                            setUnlockingEmployeeId(null);
                          }
                        }}
                      >
                        <LockOpen className="mr-2 size-4" />
                        {unlockingEmployeeId === sheet.employeeId ? "Unlocking..." : "Unlock"}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </RequireRole>
  );
}
