"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Users } from "lucide-react";
import { toast } from "sonner";

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

type EmployeeEligibility = {
  id: string;
  name: string;
  email?: string;
  statusLabel: string;
  reason: string;
  isEligible: boolean;
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
  const [notice, setNotice] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const availableEmployees = useMemo(() => {
    if (!currentUser) return [];

    if (role === "manager") {
      return getManagerTeam(currentUser.id);
    }

    return state.users.filter((user) => user.role === "employee");
  }, [currentUser, getManagerTeam, role, state.users]);

  const employeeEligibility = useMemo<EmployeeEligibility[]>(() => {
    return availableEmployees.map((employee) => {
      const goalSheet = state.goalSheets.find((sheet) => sheet.employeeId === employee.id);
      const goalCount = goalSheet
        ? state.goals.filter((goal) => goal.goalSheetId === goalSheet.id).length
        : 0;

      if (!goalSheet) {
        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          statusLabel: "Ready",
          reason: "No goal sheet yet. A draft sheet will be created automatically.",
          isEligible: true,
        };
      }

      if (goalCount >= 8) {
        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          statusLabel: "Full",
          reason: "Already has 8 goals on the current sheet.",
          isEligible: false,
        };
      }

      if (goalSheet.status === "approved") {
        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          statusLabel: "Locked",
          reason: "Goal sheet is approved and locked. Admin must unlock it first.",
          isEligible: false,
        };
      }

      if (goalSheet.status === "submitted") {
        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          statusLabel: "Under review",
          reason: "Goal sheet is submitted for manager review and is not editable.",
          isEligible: false,
        };
      }

      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        statusLabel: goalSheet.status === "unlocked" ? "Unlocked" : "Ready",
        reason:
          goalSheet.status === "unlocked"
            ? "Sheet was unlocked by admin and can receive shared goals."
            : "Editable sheet is ready for a shared goal.",
        isEligible: true,
      };
    });
  }, [availableEmployees, state.goalSheets, state.goals]);

  const createdSharedGoals = currentUser ? getSharedGoalsCreatedBy(currentUser.id) : [];

  if (!currentUser) return null;

  const selectedEmployees = employeeEligibility.filter(
    (employee) => employee.isEligible && selectedEmployeeIds.includes(employee.id),
  );
  const selectedPrimaryOwner =
    selectedEmployees.find((employee) => employee.id === primaryOwnerEmployeeId) ?? null;

  function toggleEmployee(employeeId: string) {
    const employee = employeeEligibility.find((item) => item.id === employeeId);
    if (!employee?.isEligible) {
      return;
    }

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
      setNotice("Complete all shared goal fields, pick at least two employees, and choose a primary owner.");
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
        toast.error("Shared goal creation failed", {
          description: result.error ?? "We could not create the shared goal.",
        });
        return;
      }

      setForm(initialForm);
      setSelectedEmployeeIds([]);
      setPrimaryOwnerEmployeeId("");
      toast.success("Shared goal created", {
        description: "Shared goal created and linked to the selected employee sheets.",
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
          <Alert variant="destructive">
            <AlertTitle>Action blocked</AlertTitle>
            <AlertDescription>{notice}</AlertDescription>
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
                    <p className="mt-1 text-sm text-muted-foreground">
                      Locked, under-review, or full sheets are shown here but cannot be selected.
                    </p>
                  </div>
                  <Badge variant="secondary">{selectedEmployeeIds.length} selected</Badge>
                </div>

                <div className="space-y-2">
                  {employeeEligibility.map((employee) => {
                    const active = selectedEmployeeIds.includes(employee.id);
                    return (
                      <button
                        key={employee.id}
                        aria-disabled={!employee.isEligible}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3 text-left transition",
                          active
                            ? "border-primary bg-primary/8 text-foreground shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
                            : employee.isEligible
                              ? "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/30"
                              : "cursor-not-allowed border-border bg-muted/25 text-muted-foreground",
                        )}
                        disabled={!employee.isEligible}
                        onClick={() => toggleEmployee(employee.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{employee.name}</p>
                              {active ? (
                                <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary brand-contrast-fg">
                                  <Check className="size-3.5" />
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {employee.email ?? "Email unavailable"}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {employee.reason}
                            </p>
                          </div>
                          <Badge
                            variant={
                              employee.isEligible
                                ? employee.statusLabel === "Unlocked"
                                  ? "outline"
                                  : "secondary"
                                : "destructive"
                            }
                            className="shrink-0"
                          >
                            {employee.statusLabel}
                          </Badge>
                        </div>
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
                    <SelectValue placeholder="Select the primary owner">
                      {selectedPrimaryOwner?.name ?? "Select the primary owner"}
                    </SelectValue>
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
