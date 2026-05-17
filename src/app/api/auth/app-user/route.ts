import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getHomePathForRole } from "@/lib/auth/demo-users";
import { auth } from "@/lib/auth/provider";
import { prisma } from "@/lib/db/prisma";
import { ROLE_VALUES } from "@/lib/types";

const createAppUserSchema = z.object({
  role: z.enum(ROLE_VALUES),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedBody = createAppUserSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const role = parsedBody.data.role;
  const existingAppUser = await prisma.appUser.findUnique({
    where: { authUserId: session.user.id },
  });

  if (existingAppUser) {
    return NextResponse.json({
      appUser: existingAppUser,
      homePath: getHomePathForRole(existingAppUser.role),
    });
  }

  const appUser = await prisma.appUser.create({
    data: {
      id: `app-${crypto.randomUUID()}`,
      authUserId: session.user.id,
      name: session.user.name,
      role,
      managerId: role === "employee" ? "manager-01" : null,
    },
  });

  return NextResponse.json({
    appUser,
    homePath: getHomePathForRole(appUser.role),
  });
}
