"use client";

import { Save, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { RequireRole } from "@/components/app/require-role";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/store/app-store";

const UNASSIGNED_MANAGER = "unassigned";

export function AdminOrgHierarchy() {
  const { state, updateEmployeeManager } = useAppStore();
  const [draftManagers, setDraftManagers] = useState<Record<string, string>>({});
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);

  const employees = state.users.filter((user) => user.role === "employee");
  const managers = state.users.filter((user) => user.role === "manager");

  async function handleSave(employeeId: string) {
    const nextManagerId = draftManagers[employeeId] ?? UNASSIGNED_MANAGER;
    setSavingEmployeeId(employeeId);

    try {
      const updated = await updateEmployeeManager(
        employeeId,
        nextManagerId === UNASSIGNED_MANAGER ? null : nextManagerId,
      );

      if (updated) {
        toast.success("Reporting manager updated");
      } else {
        toast.error("Manager update failed", {
          description: "Please try assigning the manager again.",
        });
      }
    } finally {
      setSavingEmployeeId(null);
    }
  }

  return (
    <RequireRole role="admin">
      <div className="space-y-6">
        <PageHeader eyebrow="Admin hierarchy" title="Org hierarchy" />

        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Employees" value={employees.length} />
          <Metric label="Managers" value={managers.length} />
          <Metric
            label="Unassigned"
            value={employees.filter((employee) => !employee.managerId).length}
          />
        </section>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <UsersRound className="size-5" />
              </div>
              <CardTitle>Employee reporting lines</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[1.2fr_1fr_1.2fr_120px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <span>Employee</span>
                <span>Current manager</span>
                <span>Assign manager</span>
                <span>Action</span>
              </div>
              {employees.map((employee) => {
                const currentManager = managers.find((manager) => manager.id === employee.managerId);
                const selectedManagerId =
                  draftManagers[employee.id] ?? employee.managerId ?? UNASSIGNED_MANAGER;
                const hasChanged = selectedManagerId !== (employee.managerId ?? UNASSIGNED_MANAGER);
                const isSaving = savingEmployeeId === employee.id;

                return (
                  <div
                    key={employee.id}
                    className="grid grid-cols-[1.2fr_1fr_1.2fr_120px] items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0"
                  >
                    <div>
                      <p className="font-medium">{employee.name}</p>
                      <p className="text-xs text-muted-foreground">{employee.email}</p>
                    </div>
                    <div>
                      {currentManager ? (
                        <Badge variant="secondary">{currentManager.name}</Badge>
                      ) : (
                        <Badge variant="destructive">Unassigned</Badge>
                      )}
                    </div>
                    <Select
                      value={selectedManagerId}
                      onValueChange={(value) =>
                        setDraftManagers((current) => ({
                          ...current,
                          [employee.id]: value ?? UNASSIGNED_MANAGER,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED_MANAGER}>Unassigned</SelectItem>
                        {managers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      disabled={!hasChanged || isSaving}
                      onClick={() => handleSave(employee.id)}
                      size="sm"
                      type="button"
                    >
                      <Save className="mr-2 size-4" />
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </RequireRole>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-3 text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
