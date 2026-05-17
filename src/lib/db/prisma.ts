import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { PrismaClient } from "@/generated/prisma/client";

const fallbackDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/atomquest";

const connectionString = process.env.DATABASE_URL ?? fallbackDatabaseUrl;

neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

function hasWorkflowDelegates(client: PrismaClient) {
  const workflowClient = client as PrismaClient & {
    goalSheet?: unknown;
    goal?: unknown;
    sharedGoal?: unknown;
    sharedGoalAssignment?: unknown;
    checkIn?: unknown;
    checkInGoalUpdate?: unknown;
    auditLogEntry?: unknown;
  };

  return Boolean(
    workflowClient.goalSheet &&
      workflowClient.goal &&
      workflowClient.sharedGoal &&
      workflowClient.sharedGoalAssignment &&
      workflowClient.checkIn &&
      workflowClient.checkInGoalUpdate &&
      workflowClient.auditLogEntry,
  );
}

const cachedPrisma = globalForPrisma.prisma;

export const prisma =
  cachedPrisma && hasWorkflowDelegates(cachedPrisma)
    ? cachedPrisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
