import "dotenv/config";

import { hashPassword } from "better-auth/crypto";

import { demoCredentials } from "../src/lib/auth/demo-users";
import { prisma } from "../src/lib/db/prisma";

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
