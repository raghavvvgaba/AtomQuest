import { z } from "zod";

import type {
  Goal,
  GoalFieldError,
  GoalSheet,
  GoalSheetValidationResult,
  UomDirection,
  UomType,
} from "@/lib/types";

const baseGoalSchema = z.object({
  thrustArea: z.string().trim().min(1, "Thrust area is required."),
  title: z.string().trim().min(1, "Goal title is required."),
  description: z.string().trim().min(1, "Goal description is required."),
});

export function getGoalSheetTotalWeightage(goals: Goal[]) {
  return goals.reduce((sum, goal) => sum + (goal.weightage ?? 0), 0);
}

export function validateGoalSheet(
  _goalSheet: GoalSheet,
  goals: Goal[],
): GoalSheetValidationResult {
  const summary: string[] = [];
  const goalErrors: Record<string, GoalFieldError> = {};

  if (goals.length === 0) {
    summary.push("Add at least one goal before submitting.");
  }

  if (goals.length > 8) {
    summary.push("You can add a maximum of 8 goals to one goal sheet.");
  }

  for (const goal of goals) {
    const fieldErrors: GoalFieldError = {};
    const result = baseGoalSchema.safeParse(goal);

    if (!result.success) {
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0];
        if (typeof fieldName === "string" && fieldName in goal) {
          fieldErrors[fieldName as keyof GoalFieldError] = issue.message;
        }
      }
    }

    if (!goal.uomType) {
      fieldErrors.uomType = "UoM type is required.";
    }

    if (!goal.uomDirection) {
      fieldErrors.uomDirection = "Direction is required.";
    }

    if (!goal.targetValue.trim()) {
      fieldErrors.targetValue = "Target value is required.";
    }

    if (goal.weightage === null || Number.isNaN(goal.weightage)) {
      fieldErrors.weightage = "Weightage is required.";
    } else if (goal.weightage < 10) {
      fieldErrors.weightage = "Each goal must have at least 10% weightage.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      goalErrors[goal.id] = fieldErrors;
    }
  }

  const totalWeightage = getGoalSheetTotalWeightage(goals);
  if (totalWeightage !== 100) {
    summary.push(
      `Total weightage must equal 100%. Current total is ${totalWeightage}%.`,
    );
  }

  if (Object.keys(goalErrors).length > 0) {
    summary.unshift("Fill every required goal field before submitting.");
  }

  return {
    isValid: summary.length === 0 && Object.keys(goalErrors).length === 0,
    summary,
    goalErrors,
  };
}

export function createEmptyGoal(goalSheetId: string): Goal {
  return {
    id: `goal-${crypto.randomUUID()}`,
    goalSheetId,
    thrustArea: "",
    title: "",
    description: "",
    uomType: "",
    uomDirection: "",
    targetValue: "",
    weightage: null,
  };
}

export function syncGoalTypeDefaults(goal: Goal, nextType: UomType | ""): Goal {
  if (nextType === "timeline") {
    return {
      ...goal,
      uomType: nextType,
      uomDirection: "timeline",
    };
  }

  if (nextType === "zero") {
    return {
      ...goal,
      uomType: nextType,
      uomDirection: "zero",
      targetValue: "0",
    };
  }

  return {
    ...goal,
    uomType: nextType,
    uomDirection:
      goal.uomDirection === "timeline" || goal.uomDirection === "zero"
        ? "min"
        : goal.uomDirection,
    targetValue: goal.uomType === "zero" ? "" : goal.targetValue,
  };
}

export function getGoalSheetStatusTone(status: GoalSheet["status"]) {
  switch (status) {
    case "draft":
      return "neutral";
    case "submitted":
      return "warning";
    case "returned":
      return "danger";
    case "approved":
      return "success";
    default:
      return "neutral";
  }
}

export function getRoleLabel(role: "employee" | "manager" | "admin") {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function getStatusLabel(status: GoalSheet["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getDirectionLabel(direction: UomDirection | "") {
  switch (direction) {
    case "min":
      return "Higher is better";
    case "max":
      return "Lower is better";
    case "timeline":
      return "Date-based completion";
    case "zero":
      return "Zero is success";
    default:
      return "Select direction";
  }
}
