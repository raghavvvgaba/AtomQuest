import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import { validateGoalSheet } from "@/lib/goal-sheet";
import { auth } from "@/lib/auth/provider";
import { prisma } from "@/lib/db/prisma";
import type { AuditLogEntry, CheckInGoalUpdateDraft, Goal, GoalSheet, Quarter } from "@/lib/types";
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
      quarter: "Q1" | "Q2" | "Q3" | "Q4";
      updates: CheckInGoalUpdateDraft[];
    }
  | {
      action: "submitCheckIn";
      employeeId: string;
      quarter: "Q1" | "Q2" | "Q3" | "Q4";
      updates: CheckInGoalUpdateDraft[];
    }
  | {
      action: "reviewCheckIn";
      employeeId: string;
      quarter: "Q1" | "Q2" | "Q3" | "Q4";
      managerComment?: string;
    }
  | {
      action: "unlockGoalSheet";
      employeeId: string;
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

  if (body.action === "submitCheckIn") {
    const hasMissingFields = body.updates.some(
      (update) => !update.actualAchievement.trim() || !update.progressStatus,
    );

    if (body.updates.length === 0 || hasMissingFields) {
      return NextResponse.json(
        {
          isValid: false,
          summary: ["Enter actual achievement and progress status for every goal."],
        },
        { status: 400 },
      );
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

      const upsertCheckInDraft = async (
        employeeId: string,
        quarter: Quarter,
        updates: CheckInGoalUpdateDraft[],
      ) => {
        const goalSheet = await tx.goalSheet.findUnique({
          where: { employeeId },
        });

        if (!goalSheet || goalSheet.status !== "approved") {
          throw new Error("Check-in is available only after goal sheet approval.");
        }

        const checkIn = await tx.checkIn.upsert({
          where: {
            goalSheetId_quarter: {
              goalSheetId: goalSheet.id,
              quarter,
            },
          },
          update: {
            status: "draft",
          },
          create: {
            id: `check-in-${crypto.randomUUID()}`,
            goalSheetId: goalSheet.id,
            quarter,
            status: "draft",
            managerComment: null,
          },
        });

        const nextGoalIds = updates.map((update) => update.goalId);
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

        for (const update of updates) {
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

        return checkIn;
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
            existing?.status === "unlocked"
              ? await tx.goal.findMany({
                  where: { goalSheetId: existing.id },
                  orderBy: { createdAt: "asc" },
                })
              : [];

          if (existing && !["draft", "returned", "unlocked"].includes(existing.status)) {
            throw new Error("Only editable goal sheets can be saved.");
          }

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
              previousGoals.map(
                (goal): Goal => ({
                  id: goal.id,
                  goalSheetId: goal.goalSheetId,
                  thrustArea: goal.thrustArea as Goal["thrustArea"],
                  title: goal.title,
                  description: goal.description,
                  uomType: goal.uomType ?? "",
                  uomDirection: goal.uomDirection ?? "",
                  targetValue: goal.targetValue,
                  weightage: goal.weightage,
                }),
              ),
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
            existing?.status === "unlocked"
              ? await tx.goal.findMany({
                  where: { goalSheetId: existing.id },
                  orderBy: { createdAt: "asc" },
                })
              : [];
          if (existing && !["draft", "returned", "unlocked"].includes(existing.status)) {
            throw new Error("Only editable goal sheets can be submitted.");
          }

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
              previousGoals.map(
                (goal): Goal => ({
                  id: goal.id,
                  goalSheetId: goal.goalSheetId,
                  thrustArea: goal.thrustArea as Goal["thrustArea"],
                  title: goal.title,
                  description: goal.description,
                  uomType: goal.uomType ?? "",
                  uomDirection: goal.uomDirection ?? "",
                  targetValue: goal.targetValue,
                  weightage: goal.weightage,
                }),
              ),
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

          await persistGoals(goalSheet.id, body.goals);
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

          await persistGoals(goalSheet.id, body.goals);
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

          await upsertCheckInDraft(body.employeeId, body.quarter, body.updates);
          break;
        }

        case "submitCheckIn": {
          if (appUser.role !== "employee" || appUser.id !== body.employeeId) {
            throw new Error("Forbidden");
          }

          const checkIn = await upsertCheckInDraft(body.employeeId, body.quarter, body.updates);
          await tx.checkIn.update({
            where: { id: checkIn.id },
            data: { status: "submitted" },
          });
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
