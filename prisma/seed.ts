import "dotenv/config";

import { hashPassword } from "better-auth/crypto";

import { demoCredentials } from "../src/lib/auth/demo-users";
import { prisma } from "../src/lib/db/prisma";
import {
  seededAuditLogs,
  seededCheckInGoalUpdates,
  seededCheckIns,
  seededGoalSheets,
  seededGoals,
  seededUsers,
} from "../src/lib/seed-data";

async function main() {
  for (const demoUser of demoCredentials) {
    const authUserId = `auth-${demoUser.appUserId}`;
    const hashedPassword = await hashPassword(demoUser.password);

    await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {
        name: demoUser.name,
        emailVerified: true,
      },
      create: {
        id: authUserId,
        name: demoUser.name,
        email: demoUser.email,
        emailVerified: true,
      },
    });

    await prisma.account.upsert({
      where: { id: `account-${demoUser.appUserId}` },
      update: {
        accountId: authUserId,
        providerId: "credential",
        userId: authUserId,
        password: hashedPassword,
      },
      create: {
        id: `account-${demoUser.appUserId}`,
        accountId: authUserId,
        providerId: "credential",
        userId: authUserId,
        password: hashedPassword,
      },
    });

    await prisma.appUser.upsert({
      where: { id: demoUser.appUserId },
      update: {
        authUserId,
        name: demoUser.name,
        role: demoUser.role,
        managerId: demoUser.managerId,
      },
      create: {
        id: demoUser.appUserId,
        authUserId,
        name: demoUser.name,
        role: demoUser.role,
        managerId: demoUser.managerId,
      },
    });
  }

  const seededEmployeePassword = await hashPassword("Employee@123");

  for (const seededUser of seededUsers) {
    if (demoCredentials.some((demoUser) => demoUser.appUserId === seededUser.id)) {
      continue;
    }

    const authUserId = `auth-${seededUser.id}`;
    const email = `${seededUser.id}@atomquest.test`;

    await prisma.user.upsert({
      where: { email },
      update: {
        name: seededUser.name,
        emailVerified: true,
      },
      create: {
        id: authUserId,
        name: seededUser.name,
        email,
        emailVerified: true,
      },
    });

    await prisma.account.upsert({
      where: { id: `account-${seededUser.id}` },
      update: {
        accountId: authUserId,
        providerId: "credential",
        userId: authUserId,
        password: seededEmployeePassword,
      },
      create: {
        id: `account-${seededUser.id}`,
        accountId: authUserId,
        providerId: "credential",
        userId: authUserId,
        password: seededEmployeePassword,
      },
    });

    await prisma.appUser.upsert({
      where: { id: seededUser.id },
      update: {
        authUserId,
        name: seededUser.name,
        role: seededUser.role,
        managerId: seededUser.managerId,
      },
      create: {
        id: seededUser.id,
        authUserId,
        name: seededUser.name,
        role: seededUser.role,
        managerId: seededUser.managerId,
      },
    });
  }

  for (const goalSheet of seededGoalSheets) {
    await prisma.goalSheet.upsert({
      where: { employeeId: goalSheet.employeeId },
      update: {
        status: goalSheet.status,
        managerComment: goalSheet.managerComment,
      },
      create: {
        id: goalSheet.id,
        employeeId: goalSheet.employeeId,
        status: goalSheet.status,
        managerComment: goalSheet.managerComment,
        createdAt: new Date(goalSheet.createdAt),
        updatedAt: new Date(goalSheet.updatedAt),
      },
    });
  }

  for (const goal of seededGoals) {
    await prisma.goal.upsert({
      where: { id: goal.id },
      update: {
        goalSheetId: goal.goalSheetId,
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
        goalSheetId: goal.goalSheetId,
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

  for (const checkIn of seededCheckIns) {
    await prisma.checkIn.upsert({
      where: {
        goalSheetId_quarter: {
          goalSheetId: checkIn.goalSheetId,
          quarter: checkIn.quarter,
        },
      },
      update: {
        status: checkIn.status,
        managerComment: checkIn.managerComment,
      },
      create: {
        id: checkIn.id,
        goalSheetId: checkIn.goalSheetId,
        quarter: checkIn.quarter,
        status: checkIn.status,
        managerComment: checkIn.managerComment,
        createdAt: new Date(checkIn.createdAt),
        updatedAt: new Date(checkIn.updatedAt),
      },
    });
  }

  for (const update of seededCheckInGoalUpdates) {
    await prisma.checkInGoalUpdate.upsert({
      where: {
        checkInId_goalId: {
          checkInId: update.checkInId,
          goalId: update.goalId,
        },
      },
      update: {
        actualAchievement: update.actualAchievement,
        progressStatus: update.progressStatus || null,
      },
      create: {
        id: update.id,
        checkInId: update.checkInId,
        goalId: update.goalId,
        actualAchievement: update.actualAchievement,
        progressStatus: update.progressStatus || null,
      },
    });
  }

  const actorMap = new Map(
    (
      await prisma.appUser.findMany({
        select: { id: true, name: true },
      })
    ).map((user) => [user.name, user.id]),
  );

  for (const log of seededAuditLogs) {
    await prisma.auditLogEntry.upsert({
      where: { id: log.id },
      update: {
        actorAppUserId: actorMap.get(log.actorName) ?? null,
        actorName: log.actorName,
        action: log.action,
        entityLabel: log.entityLabel,
      },
      create: {
        id: log.id,
        actorAppUserId: actorMap.get(log.actorName) ?? null,
        actorName: log.actorName,
        action: log.action,
        entityLabel: log.entityLabel,
        createdAt: new Date(log.createdAt),
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
