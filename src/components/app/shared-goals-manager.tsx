"use client";

import { useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { THRUST_AREA_VALUES } from "@/lib/types";
import type { Goal, Role, ThrustArea, UomDirection, UomType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

type SharedGoalForm = {
  thrustArea: ThrustArea | "";
  title: string;
  description: string;
  uomType: UomType | "";
  uomDirection: UomDirection | "";
  targetValue: string;
};

const initialForm: SharedGoalForm = {
  thrustArea: "",
  title: "",
  description: "",
  uomType: "",
  uomDirection: "",
  targetValue: "",
};

export function SharedGoalsManager({ role }: { role: Role }) {
  const {
    currentUser,
    state,
    getManagerTeam,
    getSharedGoalsCreatedBy,
    createSharedGoal,
  } = useAppStore();
  const [form, setForm] = useState<SharedGoalForm>(initialForm);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [primaryOwnerEmployeeId, setPrimaryOwnerEmployeeId] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);

  const availableEmployees = useMemo(() => {
    if (!currentUser) return [];

    if (role === "manager") {
      return getManagerTeam(currentUser.id);
    }

    return state.users.filter((user) => user.role === "employee");
  }, [currentUser, getManagerTeam, role, state.users]);

  const createdSharedGoals = currentUser ? getSharedGoalsCreatedBy(currentUser.id) : [];

  if (!currentUser) return null;

  const selectedEmployees = availableEmployees.filter((employee) =>
    selectedEmployeeIds.includes(employee.id),
  );

  function toggleEmployee(employeeId: string) {
    setNotice(null);
    setSelectedEmployeeIds((current) => {
      const next = current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId];

      if (!next.includes(primaryOwnerEmployeeId)) {
        setPrimaryOwnerEmployeeId(next[0] ?? "");
      }

      return next;
    });
  }

  function handleUomTypeChange(value: Goal["uomType"]) {
    setForm((current) => {
      if (value === "timeline") {
        return { ...current, uomType: value, uomDirection: "timeline" };
      }

      if (value === "zero") {
        return { ...current, uomType: value, uomDirection: "zero", targetValue: "0" };
      }

      return {
        ...current,
        uomType: value,
        uomDirection:
          current.uomDirection === "timeline" || current.uomDirection === "zero"
            ? "min"
            : current.uomDirection || "min",
        targetValue: current.uomType === "zero" ? "" : current.targetValue,
      };
    });
  }

  async function handleCreate() {
    if (
      !form.thrustArea ||
      !form.title.trim() ||
      !form.description.trim() ||
      !form.uomType ||
      !form.uomDirection ||
      !form.targetValue.trim() ||
      selectedEmployeeIds.length < 2 ||
      !primaryOwnerEmployeeId
    ) {
      setNotice({
        tone: "error",
        message: "Complete all shared goal fields, pick at least two employees, and choose a primary owner.",
      });
      return;
    }

    setIsCreating(true);
    setNotice(null);

    try {
      const result = await createSharedGoal({
        title: form.title.trim(),
        description: form.description.trim(),
        thrustArea: form.thrustArea,
        uomType: form.uomType,
        uomDirection: form.uomDirection,
        targetValue: form.targetValue.trim(),
        employeeIds: selectedEmployeeIds,
        primaryOwnerEmployeeId,
      });

      if (!result.success) {
        setNotice({
          tone: "error",
          message: result.error ?? "Shared goal creation failed.",
        });
        return;
      }

      setForm(initialForm);
      setSelectedEmployeeIds([]);
      setPrimaryOwnerEmployeeId("");
      setNotice({
        tone: "success",
        message: "Shared goal created and linked to the selected employee sheets.",
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <RequireRole role={role}>
      <div className="space-y-6">
        <PageHeader
          eyebrow={role === "manager" ? "Manager shared goals" : "Admin shared goals"}
          title="Shared goals"
        />

        {notice ? (
          <Alert
            className={
              notice.tone === "success"
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : undefined
            }
            variant={notice.tone === "error" ? "destructive" : "default"}
          >
            <AlertTitle>{notice.tone === "success" ? "Shared goal created" : "Action blocked"}</AlertTitle>
            <AlertDescription>{notice.message}</AlertDescription>
          </Alert>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Create shared goal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Thrust area</Label>
                  <Select
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, thrustArea: value as ThrustArea }))
                    }
                    value={form.thrustArea}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select thrust area" />
                    </SelectTrigger>
                    <SelectContent>
                      {THRUST_AREA_VALUES.map((thrustArea) => (
                        <SelectItem key={thrustArea} value={thrustArea}>
                          {thrustArea}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Goal title</Label>
                  <Input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>UoM type</Label>
                  <Select onValueChange={(value) => handleUomTypeChange(value as Goal["uomType"])} value={form.uomType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="numeric">Numeric</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="timeline">Timeline</SelectItem>
                      <SelectItem value="zero">Zero-based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Direction</Label>
                  {form.uomType === "numeric" || form.uomType === "percentage" ? (
                    <Select
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, uomDirection: value as UomDirection }))
                      }
                      value={form.uomDirection}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select direction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="min">Higher is better</SelectItem>
                        <SelectItem value="max">Lower is better</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      disabled
                      value={
                        form.uomType === "timeline"
                          ? "Date-based completion"
                          : form.uomType === "zero"
                            ? "Zero is success"
                            : "Choose a UoM type first"
                      }
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Target value</Label>
                  {form.uomType === "zero" ? (
                    <Input disabled value="0" />
                  ) : (
                    <Input
                      type={form.uomType === "timeline" ? "date" : "number"}
                      value={form.targetValue}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, targetValue: event.target.value }))
                      }
                    />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Select employees</Label>
                    <p className="text-sm text-muted-foreground">
                      {role === "manager"
                        ? "Only your direct reports are available here."
                        : "Shared goals can be pushed to any employee."}
                    </p>
                  </div>
                  <Badge variant="secondary">{selectedEmployeeIds.length} selected</Badge>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {availableEmployees.map((employee) => {
                    const active = selectedEmployeeIds.includes(employee.id);
                    return (
                      <button
                        key={employee.id}
                        className={cn(
                          "rounded-2xl border px-4 py-3 text-left transition",
                          active
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                        )}
                        onClick={() => toggleEmployee(employee.id)}
                        type="button"
                      >
                        <p className="font-semibold">{employee.name}</p>
                        <p className="text-sm">{employee.email ?? "Email unavailable"}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Primary owner</Label>
                <Select
                  onValueChange={(value) => setPrimaryOwnerEmployeeId(value ?? "")}
                  value={primaryOwnerEmployeeId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select the primary owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" disabled={isCreating} onClick={handleCreate} type="button">
                <Plus className="mr-2 size-4" />
                {isCreating ? "Creating shared goal..." : "Create shared goal"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Created by you</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {createdSharedGoals.length === 0 ? (
                <div className="rounded-2xl bg-muted/50 px-4 py-5 text-sm text-muted-foreground">
                  No shared goals created yet.
                </div>
              ) : (
                createdSharedGoals.map((sharedGoal) => {
                  const assignmentCount = state.sharedGoalAssignments.filter(
                    (assignment) => assignment.sharedGoalId === sharedGoal.id,
                  ).length;
                  const primaryOwnerName =
                    state.users.find((user) => user.id === sharedGoal.primaryOwnerEmployeeId)?.name ??
                    "Unknown employee";

                  return (
                    <div key={sharedGoal.id} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{sharedGoal.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {sharedGoal.thrustArea} · {assignmentCount} linked employees
                          </p>
                        </div>
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Users className="size-4" />
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Primary owner: {primaryOwnerName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">Target: {sharedGoal.targetValue}</p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </RequireRole>
  );
}
