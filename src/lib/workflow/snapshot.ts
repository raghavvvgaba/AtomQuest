import type { AuthenticatedAppUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type {
  AuditLogEntry,
  CheckIn,
  CheckInGoalUpdate,
  Goal,
  GoalSheet,
  SharedGoal,
  SharedGoalAssignment,
  ThrustArea,
  User,
} from "@/lib/types";
import { THRUST_AREA_VALUES } from "@/lib/types";

export type WorkflowSnapshot = {
  currentUserId: string | null;
  users: User[];
  goalSheets: GoalSheet[];
  goals: Goal[];
  sharedGoals: SharedGoal[];
  sharedGoalAssignments: SharedGoalAssignment[];
  checkIns: CheckIn[];
  checkInGoalUpdates: CheckInGoalUpdate[];
  auditLogs: AuditLogEntry[];
};

function normalizeThrustArea(value: string): ThrustArea | "" {
  return THRUST_AREA_VALUES.includes(value as ThrustArea) ? (value as ThrustArea) : "";
}

export async function ensureEmployeeGoalSheet(
  appUser: Pick<AuthenticatedAppUser, "id" | "role">,
) {
  if (appUser.role !== "employee") return;

  await prisma.goalSheet.upsert({
    where: { employeeId: appUser.id },
    update: {},
    create: {
      id: `sheet-${appUser.id}`,
      employeeId: appUser.id,
      status: "draft",
      managerComment: null,
    },
  });
}

export async function getWorkflowSnapshot(
  currentUser: AuthenticatedAppUser,
): Promise<WorkflowSnapshot> {
  await ensureEmployeeGoalSheet(currentUser);

  const [appUsers, goalSheets, goals, sharedGoals, sharedGoalAssignments, checkIns, checkInGoalUpdates, auditLogs] =
    await prisma.$transaction([
      prisma.appUser.findMany({
        include: { authUser: { select: { email: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.goalSheet.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.goal.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.sharedGoal.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.sharedGoalAssignment.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.checkIn.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.checkInGoalUpdate.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.auditLogEntry.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

  return {
    currentUserId: currentUser.id,
    users: appUsers.map(
      (user): User => ({
        id: user.id,
        name: user.name,
        email: user.authUser.email,
        role: user.role,
        managerId: user.managerId,
      }),
    ),
    goalSheets: goalSheets.map(
      (sheet): GoalSheet => ({
        id: sheet.id,
        employeeId: sheet.employeeId,
        status: sheet.status,
        managerComment: sheet.managerComment,
        createdAt: sheet.createdAt.toISOString(),
        updatedAt: sheet.updatedAt.toISOString(),
      }),
    ),
    goals: goals.map(
      (goal): Goal => ({
        id: goal.id,
        goalSheetId: goal.goalSheetId,
        sharedGoalId: goal.sharedGoalId,
        thrustArea: normalizeThrustArea(goal.thrustArea),
        title: goal.title,
        description: goal.description,
        uomType: goal.uomType ?? "",
        uomDirection: goal.uomDirection ?? "",
        targetValue: goal.targetValue,
        weightage: goal.weightage,
      }),
    ),
    sharedGoals: sharedGoals.map(
      (sharedGoal): SharedGoal => ({
        id: sharedGoal.id,
        title: sharedGoal.title,
        description: sharedGoal.description,
        thrustArea: normalizeThrustArea(sharedGoal.thrustArea) as SharedGoal["thrustArea"],
        uomType: sharedGoal.uomType,
        uomDirection: sharedGoal.uomDirection,
        targetValue: sharedGoal.targetValue,
        primaryOwnerEmployeeId: sharedGoal.primaryOwnerEmployeeId,
        createdByAppUserId: sharedGoal.createdByAppUserId,
        createdAt: sharedGoal.createdAt.toISOString(),
        updatedAt: sharedGoal.updatedAt.toISOString(),
      }),
    ),
    sharedGoalAssignments: sharedGoalAssignments.map(
      (assignment): SharedGoalAssignment => ({
        id: assignment.id,
        sharedGoalId: assignment.sharedGoalId,
        employeeId: assignment.employeeId,
        goalId: assignment.goalId,
        createdAt: assignment.createdAt.toISOString(),
      }),
    ),
    checkIns: checkIns.map(
      (checkIn): CheckIn => ({
        id: checkIn.id,
        goalSheetId: checkIn.goalSheetId,
        quarter: checkIn.quarter,
        status: checkIn.status,
        managerComment: checkIn.managerComment,
        createdAt: checkIn.createdAt.toISOString(),
        updatedAt: checkIn.updatedAt.toISOString(),
      }),
    ),
    checkInGoalUpdates: checkInGoalUpdates.map(
      (update): CheckInGoalUpdate => ({
        id: update.id,
        checkInId: update.checkInId,
        goalId: update.goalId,
        actualAchievement: update.actualAchievement,
        progressStatus: update.progressStatus ?? "",
      }),
    ),
    auditLogs: auditLogs.map(
      (log): AuditLogEntry => ({
        id: log.id,
        actorName: log.actorName,
        action: log.action,
        entityLabel: log.entityLabel,
        details:
          log.details && typeof log.details === "object" && !Array.isArray(log.details)
            ? (log.details as AuditLogEntry["details"])
            : null,
        createdAt: log.createdAt.toISOString(),
      }),
    ),
  };
}
