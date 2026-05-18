import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import { validateGoalSheet } from "@/lib/goal-sheet";
import { getActiveQuarter } from "@/lib/check-in-schedule";
import { auth } from "@/lib/auth/provider";
import { prisma } from "@/lib/db/prisma";
import type {
  AuditLogEntry,
  CheckInGoalUpdateDraft,
  Goal,
  GoalSheet,
  Quarter,
  ThrustArea,
  UomDirection,
  UomType,
} from "@/lib/types";
import { getWorkflowSnapshot } from "@/lib/workflow/snapshot";

type WorkflowMutation =
  | {
      action: "saveGoalSheetDraft";
      employeeId: string;
      goals: Goal[];
      payload?: { managerComment?: string | null };
    }
  | {
      action: "submitGoalSheet";
      employeeId: string;
      goals: Goal[];
    }
  | {
      action: "returnGoalSheet";
      employeeId: string;
      goals: Goal[];
      comment?: string;
    }
  | {
      action: "approveGoalSheet";
      employeeId: string;
      goals: Goal[];
    }
  | {
      action: "saveCheckInDraft";
      employeeId: string;
      quarter: Quarter;
      updates: CheckInGoalUpdateDraft[];
    }
  | {
      action: "submitCheckIn";
      employeeId: string;
      quarter: Quarter;
      updates: CheckInGoalUpdateDraft[];
    }
  | {
      action: "reviewCheckIn";
      employeeId: string;
      quarter: Quarter;
      managerComment?: string;
    }
  | {
      action: "unlockGoalSheet";
      employeeId: string;
    }
  | {
      action: "createSharedGoal";
      title: string;
      description: string;
      thrustArea: ThrustArea;
      uomType: UomType;
      uomDirection: UomDirection;
      targetValue: string;
      employeeIds: string[];
      primaryOwnerEmployeeId: string;
    };

const AUDITED_GOAL_FIELDS = [
  "thrustArea",
  "title",
  "description",
  "uomType",
  "uomDirection",
  "targetValue",
  "weightage",
] as const;

type AuditedGoalField = (typeof AUDITED_GOAL_FIELDS)[number];
type GoalAuditDetails = NonNullable<AuditLogEntry["details"]>;

function getComparableGoalValue(goal: Goal, field: AuditedGoalField): string | number | null {
  const value = goal[field];
  return value === "" ? null : value;
}

function buildGoalFieldChanges(previousGoal: Goal, nextGoal: Goal) {
  return AUDITED_GOAL_FIELDS.flatMap((field) => {
    const previousValue = getComparableGoalValue(previousGoal, field);
    const nextValue = getComparableGoalValue(nextGoal, field);

    if (previousValue === nextValue) {
      return [];
    }

    return [
      {
        field,
        from: previousValue,
        to: nextValue,
      },
    ];
  });
}

function buildAddedOrRemovedGoalChanges(
  goal: Goal,
  changeType: "added" | "removed",
) {
  return AUDITED_GOAL_FIELDS.flatMap((field) => {
    const value = getComparableGoalValue(goal, field);

    if (value === null) {
      return [];
    }

    return [
      {
        field,
        from: changeType === "removed" ? value : null,
        to: changeType === "added" ? value : null,
      },
    ];
  });
}

function buildUnlockedGoalAuditDetails(
  previousGoals: Goal[],
  nextGoals: Goal[],
): GoalAuditDetails | null {
  const previousGoalMap = new Map(previousGoals.map((goal) => [goal.id, goal]));
  const nextGoalMap = new Map(nextGoals.map((goal) => [goal.id, goal]));
  const goalChanges: GoalAuditDetails["goalChanges"] = [];

  for (const nextGoal of nextGoals) {
    const previousGoal = previousGoalMap.get(nextGoal.id);
    if (!previousGoal) {
      goalChanges.push({
        goalId: nextGoal.id,
        goalTitle: nextGoal.title || "Untitled goal",
        changeType: "added",
        fieldChanges: buildAddedOrRemovedGoalChanges(nextGoal, "added"),
      });
      continue;
    }

    const fieldChanges = buildGoalFieldChanges(previousGoal, nextGoal);
    if (fieldChanges.length > 0) {
      goalChanges.push({
        goalId: nextGoal.id,
        goalTitle: nextGoal.title || previousGoal.title || "Untitled goal",
        changeType: "updated",
        fieldChanges,
      });
    }
  }

  for (const previousGoal of previousGoals) {
    if (nextGoalMap.has(previousGoal.id)) continue;

    goalChanges.push({
      goalId: previousGoal.id,
      goalTitle: previousGoal.title || "Untitled goal",
      changeType: "removed",
      fieldChanges: buildAddedOrRemovedGoalChanges(previousGoal, "removed"),
    });
  }

  return goalChanges.length > 0 ? { goalChanges } : null;
}

function toClientGoal(goal: {
  id: string;
  goalSheetId: string;
  sharedGoalId: string | null;
  thrustArea: string;
  title: string;
  description: string;
  uomType: UomType | null;
  uomDirection: UomDirection | null;
  targetValue: string;
  weightage: number | null;
}): Goal {
  return {
    id: goal.id,
    goalSheetId: goal.goalSheetId,
    sharedGoalId: goal.sharedGoalId,
    thrustArea: goal.thrustArea as Goal["thrustArea"],
    title: goal.title,
    description: goal.description,
    uomType: goal.uomType ?? "",
    uomDirection: goal.uomDirection ?? "",
    targetValue: goal.targetValue,
    weightage: goal.weightage,
  };
}

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}

function isEditableGoalSheetStatus(status: GoalSheet["status"]) {
  return ["draft", "returned", "unlocked"].includes(status);
}

async function getAuthenticatedAppUser(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  return prisma.appUser.findUnique({
    where: { authUserId: session.user.id },
    include: { authUser: { select: { email: true } } },
  });
}

function createGoalSheetForValidation(
  employeeId: string,
  status: GoalSheet["status"],
  managerComment?: string | null,
): GoalSheet {
  const now = new Date().toISOString();
  return {
    id: `sheet-${employeeId}`,
    employeeId,
    status,
    managerComment: managerComment ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function GET(request: Request) {
  const appUser = await getAuthenticatedAppUser(request);
  if (!appUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await getWorkflowSnapshot({
    id: appUser.id,
    authUserId: appUser.authUserId,
    name: appUser.name,
    role: appUser.role,
    managerId: appUser.managerId,
    email: appUser.authUser.email,
  });

  return NextResponse.json({ snapshot });
}

export async function POST(request: Request) {
  const appUser = await getAuthenticatedAppUser(request);
  if (!appUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as WorkflowMutation;
  if (!body?.action) {
    return NextResponse.json({ error: "Invalid mutation" }, { status: 400 });
  }

  if (body.action === "submitGoalSheet") {
    const validation = validateGoalSheet(
      createGoalSheetForValidation(body.employeeId, "draft"),
      body.goals,
    );
    if (!validation.isValid) {
      return NextResponse.json(validation, { status: 400 });
    }
  }

  if (body.action === "approveGoalSheet") {
    const validation = validateGoalSheet(
      createGoalSheetForValidation(body.employeeId, "submitted"),
      body.goals,
    );
    if (!validation.isValid) {
      return NextResponse.json(validation, { status: 400 });
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const createAuditLog = async (
        action: string,
        entityLabel: string,
        details?: Prisma.InputJsonValue | null,
      ) => {
        await tx.auditLogEntry.create({
          data: {
            id: `audit-${crypto.randomUUID()}`,
            actorAppUserId: appUser.id,
            actorName: appUser.name,
            action,
            entityLabel,
            details: details ?? Prisma.JsonNull,
          },
        });
      };

      const getGoalsForSheet = async (goalSheetId: string) =>
        tx.goal.findMany({
          where: { goalSheetId },
          orderBy: { createdAt: "asc" },
        });

      const persistGoals = async (goalSheetId: string, goals: Goal[]) => {
        const nextGoalIds = goals.map((goal) => goal.id);

        if (nextGoalIds.length === 0) {
          await tx.goal.deleteMany({ where: { goalSheetId } });
        } else {
          await tx.goal.deleteMany({
            where: {
              goalSheetId,
              id: { notIn: nextGoalIds },
            },
          });
        }

        for (const goal of goals) {
          await tx.goal.upsert({
            where: { id: goal.id },
            update: {
              sharedGoalId: goal.sharedGoalId,
              thrustArea: goal.thrustArea,
              title: goal.title,
              description: goal.description,
              uomType: goal.uomType || null,
              uomDirection: goal.uomDirection || null,
              targetValue: goal.targetValue,
              weightage: goal.weightage,
            },
            create: {
              id: goal.id,
              goalSheetId,
              sharedGoalId: goal.sharedGoalId,
              thrustArea: goal.thrustArea,
              title: goal.title,
              description: goal.description,
              uomType: goal.uomType || null,
              uomDirection: goal.uomDirection || null,
              targetValue: goal.targetValue,
              weightage: goal.weightage,
            },
          });
        }
      };

      const enforceEditableSharedGoalRules = async (
        goals: Goal[],
        goalSheetId?: string,
      ) => {
        const persistedGoals = goalSheetId ? await getGoalsForSheet(goalSheetId) : [];
        const persistedSharedGoals = persistedGoals.filter((goal) => goal.sharedGoalId);
        const nextGoalMap = new Map(goals.map((goal) => [goal.id, goal]));

        for (const persistedGoal of persistedSharedGoals) {
          const nextGoal = nextGoalMap.get(persistedGoal.id);
          if (!nextGoal) {
            throw new Error("Shared goals cannot be removed from the goal sheet.");
          }

          if (
            nextGoal.thrustArea !== persistedGoal.thrustArea ||
            nextGoal.title !== persistedGoal.title ||
            nextGoal.description !== persistedGoal.description ||
            (nextGoal.uomType || null) !== persistedGoal.uomType ||
            (nextGoal.uomDirection || null) !== persistedGoal.uomDirection ||
            nextGoal.targetValue !== persistedGoal.targetValue
          ) {
            throw new Error("Shared goals allow employee edits only for weightage.");
          }
        }

        const invalidSharedGoal = goals.find(
          (goal) =>
            goal.sharedGoalId &&
            !persistedGoals.some(
              (persistedGoal) =>
                persistedGoal.id === goal.id && persistedGoal.sharedGoalId === goal.sharedGoalId,
            ),
        );

        if (invalidSharedGoal) {
          throw new Error("Shared goals can be added only by Admin or Manager.");
        }
      };

      const buildManagerReviewGoals = async (goalSheetId: string, goals: Goal[]) => {
        const persistedGoals = await getGoalsForSheet(goalSheetId);
        const persistedGoalMap = new Map(persistedGoals.map((goal) => [goal.id, goal]));

        return goals.map((goal) => {
          const persistedGoal = persistedGoalMap.get(goal.id);
          if (!persistedGoal) {
            throw new Error("Manager review can update only existing goals.");
          }

          return {
            ...toClientGoal(persistedGoal),
            targetValue: goal.targetValue,
            weightage: goal.weightage,
          };
        });
      };

      const syncSharedGoalTargetValues = async (goals: Goal[], previousGoals: Goal[]) => {
        const previousGoalMap = new Map(previousGoals.map((goal) => [goal.id, goal]));
        const sharedGoalsToSync = new Map<string, string>();

        for (const goal of goals) {
          if (!goal.sharedGoalId) continue;
          const previousGoal = previousGoalMap.get(goal.id);
          if (!previousGoal || previousGoal.targetValue === goal.targetValue) continue;
          sharedGoalsToSync.set(goal.sharedGoalId, goal.targetValue);
        }

        for (const [sharedGoalId, targetValue] of sharedGoalsToSync) {
          await tx.sharedGoal.update({
            where: { id: sharedGoalId },
            data: { targetValue },
          });
          await tx.goal.updateMany({
            where: { sharedGoalId },
            data: { targetValue },
          });
        }
      };

      const getCheckInEligibleGoals = async (employeeId: string) => {
        const goalSheet = await tx.goalSheet.findUnique({
          where: { employeeId },
        });

        if (!goalSheet || goalSheet.status !== "approved") {
          throw new Error("Check-in is available only after goal sheet approval.");
        }

        const goals = await tx.goal.findMany({
          where: { goalSheetId: goalSheet.id },
          include: { sharedGoal: true },
          orderBy: { createdAt: "asc" },
        });

        return { goalSheet, goals };
      };

      const upsertCheckInDraft = async (
        employeeId: string,
        quarter: Quarter,
        updates: CheckInGoalUpdateDraft[],
      ) => {
        const { goalSheet, goals } = await getCheckInEligibleGoals(employeeId);
        const goalMap = new Map(goals.map((goal) => [goal.id, goal]));

        const existingCheckIn = await tx.checkIn.findUnique({
          where: {
            goalSheetId_quarter: {
              goalSheetId: goalSheet.id,
              quarter,
            },
          },
        });

        if (existingCheckIn && existingCheckIn.status !== "draft") {
          throw new Error("Only draft check-ins can be edited.");
        }

        const checkIn =
          existingCheckIn ??
          (await tx.checkIn.create({
            data: {
              id: `check-in-${crypto.randomUUID()}`,
              goalSheetId: goalSheet.id,
              quarter,
              status: "draft",
              managerComment: null,
            },
          }));

        const existingUpdates = await tx.checkInGoalUpdate.findMany({
          where: { checkInId: checkIn.id },
        });
        const existingUpdateMap = new Map(existingUpdates.map((update) => [update.goalId, update]));

        const allowedUpdates = updates.map((update) => {
          const goal = goalMap.get(update.goalId);
          if (!goal) {
            throw new Error("Check-in contains an unknown goal.");
          }

          const isSyncedSharedGoal =
            goal.sharedGoal && goal.sharedGoal.primaryOwnerEmployeeId !== employeeId;
          if (!isSyncedSharedGoal) {
            return update;
          }

          const existingUpdate = existingUpdateMap.get(update.goalId);
          return {
            goalId: update.goalId,
            actualAchievement: existingUpdate?.actualAchievement ?? "",
            progressStatus: (existingUpdate?.progressStatus ?? "") as CheckInGoalUpdateDraft["progressStatus"],
          };
        });

        const nextGoalIds = allowedUpdates.map((update) => update.goalId);
        if (nextGoalIds.length === 0) {
          await tx.checkInGoalUpdate.deleteMany({
            where: { checkInId: checkIn.id },
          });
        } else {
          await tx.checkInGoalUpdate.deleteMany({
            where: {
              checkInId: checkIn.id,
              goalId: { notIn: nextGoalIds },
            },
          });
        }

        for (const update of allowedUpdates) {
          await tx.checkInGoalUpdate.upsert({
            where: {
              checkInId_goalId: {
                checkInId: checkIn.id,
                goalId: update.goalId,
              },
            },
            update: {
              actualAchievement: update.actualAchievement,
              progressStatus: update.progressStatus || null,
            },
            create: {
              id: `check-in-update-${crypto.randomUUID()}`,
              checkInId: checkIn.id,
              goalId: update.goalId,
              actualAchievement: update.actualAchievement,
              progressStatus: update.progressStatus || null,
            },
          });
        }

        return { checkIn, goals };
      };

      const syncSharedGoalCheckInValues = async (
        quarter: Quarter,
        employeeId: string,
        updates: CheckInGoalUpdateDraft[],
        goals: Awaited<ReturnType<typeof getCheckInEligibleGoals>>["goals"],
      ) => {
        const goalMap = new Map(goals.map((goal) => [goal.id, goal]));
        const syncCandidates = updates.filter((update) => {
          const goal = goalMap.get(update.goalId);
          return Boolean(
            goal?.sharedGoalId &&
              goal.sharedGoal?.primaryOwnerEmployeeId === employeeId &&
              update.actualAchievement.trim() &&
              update.progressStatus,
          );
        });

        for (const update of syncCandidates) {
          const goal = goalMap.get(update.goalId);
          if (!goal?.sharedGoalId) continue;

          const assignments = await tx.sharedGoalAssignment.findMany({
            where: { sharedGoalId: goal.sharedGoalId },
            include: {
              employee: true,
              goal: {
                include: {
                  goalSheet: true,
                },
              },
              sharedGoal: true,
            },
          });

          for (const assignment of assignments) {
            const linkedCheckIn = await tx.checkIn.upsert({
              where: {
                goalSheetId_quarter: {
                  goalSheetId: assignment.goal.goalSheetId,
                  quarter,
                },
              },
              update:
                assignment.employeeId === employeeId
                  ? { status: "submitted" }
                  : {},
              create: {
                id: `check-in-${crypto.randomUUID()}`,
                goalSheetId: assignment.goal.goalSheetId,
                quarter,
                status: assignment.employeeId === employeeId ? "submitted" : "draft",
                managerComment: null,
              },
            });

            await tx.checkInGoalUpdate.upsert({
              where: {
                checkInId_goalId: {
                  checkInId: linkedCheckIn.id,
                  goalId: assignment.goalId,
                },
              },
              update: {
                actualAchievement: update.actualAchievement,
                progressStatus: update.progressStatus || null,
              },
              create: {
                id: `check-in-update-${crypto.randomUUID()}`,
                checkInId: linkedCheckIn.id,
                goalId: assignment.goalId,
                actualAchievement: update.actualAchievement,
                progressStatus: update.progressStatus || null,
              },
            });
          }

          await createAuditLog(
            `Synced shared goal achievement for ${quarter}`,
            goal.sharedGoal?.title ?? goal.title,
          );
        }
      };

      switch (body.action) {
        case "saveGoalSheetDraft": {
          if (appUser.role !== "employee" || appUser.id !== body.employeeId) {
            throw new Error("Forbidden");
          }

          const existing = await tx.goalSheet.findUnique({
            where: { employeeId: body.employeeId },
          });
          const previousGoals =
            existing?.status === "unlocked" && existing.id
              ? await getGoalsForSheet(existing.id)
              : [];

          if (existing && !isEditableGoalSheetStatus(existing.status)) {
            throw new Error("Only editable goal sheets can be saved.");
          }

          await enforceEditableSharedGoalRules(body.goals, existing?.id);

          const goalSheet = await tx.goalSheet.upsert({
            where: { employeeId: body.employeeId },
            update: {
              status:
                existing?.status === "returned" || existing?.status === "unlocked"
                  ? existing.status
                  : "draft",
              managerComment: body.payload?.managerComment ?? existing?.managerComment ?? null,
            },
            create: {
              id: `sheet-${body.employeeId}`,
              employeeId: body.employeeId,
              status: "draft",
              managerComment: body.payload?.managerComment ?? null,
            },
          });

          await persistGoals(goalSheet.id, body.goals);

          if (existing?.status === "unlocked") {
            const auditDetails = buildUnlockedGoalAuditDetails(
              previousGoals.map(toClientGoal),
              body.goals,
            );

            if (auditDetails) {
              await createAuditLog(
                "Updated unlocked goal sheet draft",
                appUser.name,
                auditDetails as Prisma.InputJsonValue,
              );
            }
          }
          break;
        }

        case "submitGoalSheet": {
          if (appUser.role !== "employee" || appUser.id !== body.employeeId) {
            throw new Error("Forbidden");
          }

          const existing = await tx.goalSheet.findUnique({
            where: { employeeId: body.employeeId },
          });
          const previousGoals =
            existing?.status === "unlocked" && existing.id
              ? await getGoalsForSheet(existing.id)
              : [];

          if (existing && !isEditableGoalSheetStatus(existing.status)) {
            throw new Error("Only editable goal sheets can be submitted.");
          }

          await enforceEditableSharedGoalRules(body.goals, existing?.id);

          const goalSheet = await tx.goalSheet.upsert({
            where: { employeeId: body.employeeId },
            update: { status: "submitted" },
            create: {
              id: `sheet-${body.employeeId}`,
              employeeId: body.employeeId,
              status: "submitted",
              managerComment: null,
            },
          });

          await persistGoals(goalSheet.id, body.goals);

          if (existing?.status === "unlocked") {
            const auditDetails = buildUnlockedGoalAuditDetails(
              previousGoals.map(toClientGoal),
              body.goals,
            );

            if (auditDetails) {
              await createAuditLog(
                "Resubmitted unlocked goal sheet",
                appUser.name,
                auditDetails as Prisma.InputJsonValue,
              );
            }
          }
          break;
        }

        case "returnGoalSheet": {
          if (appUser.role !== "manager") {
            throw new Error("Forbidden");
          }

          const employee = await tx.appUser.findFirst({
            where: {
              id: body.employeeId,
              role: "employee",
              managerId: appUser.id,
            },
          });
          if (!employee) {
            throw new Error("Forbidden");
          }

          const goalSheet = await tx.goalSheet.findUnique({
            where: { employeeId: body.employeeId },
          });
          if (!goalSheet || goalSheet.status !== "submitted") {
            throw new Error("Goal sheet is not reviewable.");
          }

          const previousGoals = await getGoalsForSheet(goalSheet.id);
          const reviewGoals = await buildManagerReviewGoals(goalSheet.id, body.goals);

          await persistGoals(goalSheet.id, reviewGoals);
          await syncSharedGoalTargetValues(reviewGoals, previousGoals.map(toClientGoal));
          await tx.goalSheet.update({
            where: { id: goalSheet.id },
            data: {
              status: "returned",
              managerComment: body.comment?.trim() || null,
            },
          });
          await createAuditLog("Returned goal sheet", employee.name);
          break;
        }

        case "approveGoalSheet": {
          if (appUser.role !== "manager") {
            throw new Error("Forbidden");
          }

          const employee = await tx.appUser.findFirst({
            where: {
              id: body.employeeId,
              role: "employee",
              managerId: appUser.id,
            },
          });
          if (!employee) {
            throw new Error("Forbidden");
          }

          const goalSheet = await tx.goalSheet.findUnique({
            where: { employeeId: body.employeeId },
          });
          if (!goalSheet || goalSheet.status !== "submitted") {
            throw new Error("Goal sheet is not reviewable.");
          }

          const previousGoals = await getGoalsForSheet(goalSheet.id);
          const reviewGoals = await buildManagerReviewGoals(goalSheet.id, body.goals);

          await persistGoals(goalSheet.id, reviewGoals);
          await syncSharedGoalTargetValues(reviewGoals, previousGoals.map(toClientGoal));
          await tx.goalSheet.update({
            where: { id: goalSheet.id },
            data: { status: "approved" },
          });
          await createAuditLog("Approved goal sheet", employee.name);
          break;
        }

        case "saveCheckInDraft": {
          if (appUser.role !== "employee" || appUser.id !== body.employeeId) {
            throw new Error("Forbidden");
          }
          if (getActiveQuarter() !== body.quarter) {
            throw new Error("Check-ins are currently closed for this quarter.");
          }

          await upsertCheckInDraft(body.employeeId, body.quarter, body.updates);
          break;
        }

        case "submitCheckIn": {
          if (appUser.role !== "employee" || appUser.id !== body.employeeId) {
            throw new Error("Forbidden");
          }
          if (getActiveQuarter() !== body.quarter) {
            throw new Error("Check-ins are currently closed for this quarter.");
          }

          const { checkIn, goals } = await upsertCheckInDraft(
            body.employeeId,
            body.quarter,
            body.updates,
          );

          const goalMap = new Map(goals.map((goal) => [goal.id, goal]));
          const hasMissingFields = body.updates.some((update) => {
            const goal = goalMap.get(update.goalId);
            const isSyncedSharedGoal =
              goal?.sharedGoal && goal.sharedGoal.primaryOwnerEmployeeId !== body.employeeId;

            if (isSyncedSharedGoal) {
              return false;
            }

            return !update.actualAchievement.trim() || !update.progressStatus;
          });

          if (body.updates.length === 0 || hasMissingFields) {
            throw new Error("Enter actual achievement and progress status for every goal you own.");
          }

          await tx.checkIn.update({
            where: { id: checkIn.id },
            data: { status: "submitted" },
          });
          await syncSharedGoalCheckInValues(body.quarter, body.employeeId, body.updates, goals);
          await createAuditLog(`Submitted ${body.quarter} check-in`, appUser.name);
          break;
        }

        case "reviewCheckIn": {
          if (appUser.role !== "manager") {
            throw new Error("Forbidden");
          }

          const employee = await tx.appUser.findFirst({
            where: {
              id: body.employeeId,
              role: "employee",
              managerId: appUser.id,
            },
          });
          if (!employee) {
            throw new Error("Forbidden");
          }

          const goalSheet = await tx.goalSheet.findUnique({
            where: { employeeId: body.employeeId },
          });
          if (!goalSheet) {
            throw new Error("Check-in not found.");
          }

          const checkIn = await tx.checkIn.findUnique({
            where: {
              goalSheetId_quarter: {
                goalSheetId: goalSheet.id,
                quarter: body.quarter,
              },
            },
          });
          if (!checkIn || checkIn.status !== "submitted") {
            throw new Error("Check-in is not reviewable.");
          }

          await tx.checkIn.update({
            where: { id: checkIn.id },
            data: {
              status: "reviewed",
              managerComment: body.managerComment?.trim() || null,
            },
          });
          await createAuditLog(`Reviewed ${body.quarter} check-in`, employee.name);
          break;
        }

        case "unlockGoalSheet": {
          if (appUser.role !== "admin") {
            throw new Error("Forbidden");
          }

          const employee = await tx.appUser.findUnique({
            where: { id: body.employeeId },
          });
          if (!employee) {
            throw new Error("Employee not found.");
          }

          const result = await tx.goalSheet.updateMany({
            where: {
              employeeId: body.employeeId,
              status: "approved",
            },
            data: { status: "unlocked" },
          });
          if (result.count === 0) {
            throw new Error("Only approved goal sheets can be unlocked.");
          }
          await createAuditLog("Unlocked goal sheet", employee.name);
          break;
        }

        case "createSharedGoal": {
          if (!["admin", "manager"].includes(appUser.role)) {
            throw new Error("Forbidden");
          }

          const title = body.title.trim();
          const description = body.description.trim();
          const targetValue = body.targetValue.trim();
          const employeeIds = dedupe(body.employeeIds.filter(Boolean));

          if (!title || !description || !targetValue) {
            throw new Error("Complete all shared goal fields before creating it.");
          }

          if (employeeIds.length < 2) {
            throw new Error("Select at least two employees for a shared goal.");
          }

          if (!employeeIds.includes(body.primaryOwnerEmployeeId)) {
            throw new Error("The primary owner must be one of the selected employees.");
          }

          const employeeWhere: Prisma.AppUserWhereInput = {
            id: { in: employeeIds },
            role: "employee",
          };

          if (appUser.role === "manager") {
            employeeWhere.managerId = appUser.id;
          }

          const employees = await tx.appUser.findMany({
            where: employeeWhere,
            orderBy: { name: "asc" },
          });

          if (employees.length !== employeeIds.length) {
            throw new Error(
              appUser.role === "manager"
                ? "Managers can create shared goals only for direct reports."
                : "Some selected employees are unavailable.",
            );
          }

          const employeeNamesById = new Map(employees.map((employee) => [employee.id, employee.name]));
          const unavailableNames: string[] = [];

          const goalSheets = await Promise.all(
            employeeIds.map(async (employeeId) => {
              const goalSheet = await tx.goalSheet.upsert({
                where: { employeeId },
                update: {},
                create: {
                  id: `sheet-${employeeId}`,
                  employeeId,
                  status: "draft",
                  managerComment: null,
                },
              });

              const goalCount = await tx.goal.count({
                where: { goalSheetId: goalSheet.id },
              });

              if (!isEditableGoalSheetStatus(goalSheet.status)) {
                unavailableNames.push(employeeNamesById.get(employeeId) ?? employeeId);
              } else if (goalCount >= 8) {
                unavailableNames.push(employeeNamesById.get(employeeId) ?? employeeId);
              }

              return goalSheet;
            }),
          );

          if (unavailableNames.length > 0) {
            throw new Error(
              `Shared goals can be added only to editable sheets with room for one more goal. Check: ${unavailableNames.join(", ")}.`,
            );
          }

          const sharedGoalId = `shared-goal-${crypto.randomUUID()}`;
          await tx.sharedGoal.create({
            data: {
              id: sharedGoalId,
              title,
              description,
              thrustArea: body.thrustArea,
              uomType: body.uomType,
              uomDirection: body.uomDirection,
              targetValue,
              primaryOwnerEmployeeId: body.primaryOwnerEmployeeId,
              createdByAppUserId: appUser.id,
            },
          });

          for (const goalSheet of goalSheets) {
            const goalId = `goal-${crypto.randomUUID()}`;
            await tx.goal.create({
              data: {
                id: goalId,
                goalSheetId: goalSheet.id,
                sharedGoalId,
                thrustArea: body.thrustArea,
                title,
                description,
                uomType: body.uomType,
                uomDirection: body.uomDirection,
                targetValue,
                weightage: null,
              },
            });

            await tx.sharedGoalAssignment.create({
              data: {
                id: `shared-assignment-${crypto.randomUUID()}`,
                sharedGoalId,
                employeeId: goalSheet.employeeId,
                goalId,
              },
            });
          }

          await createAuditLog("Created shared goal", title);
          break;
        }
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Workflow update failed.",
      },
      { status: 400 },
    );
  }

  const snapshot = await getWorkflowSnapshot({
    id: appUser.id,
    authUserId: appUser.authUserId,
    name: appUser.name,
    role: appUser.role,
    managerId: appUser.managerId,
    email: appUser.authUser.email,
  });

  return NextResponse.json({ snapshot });
}
