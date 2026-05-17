import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/provider";
import { getHomePathForRole } from "@/lib/auth/demo-users";
import type { Role } from "@/lib/types";
import { prisma } from "@/lib/db/prisma";

export type AuthenticatedAppUser = {
  id: string;
  authUserId: string;
  name: string;
  role: Role;
  managerId: string | null;
  email: string;
};

export async function getCurrentAppUser(): Promise<AuthenticatedAppUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) return null;

    const appUser = await prisma.appUser.findUnique({
      where: { authUserId: session.user.id },
    });

    if (!appUser) return null;

    return {
      id: appUser.id,
      authUserId: appUser.authUserId,
      name: appUser.name,
      role: appUser.role,
      managerId: appUser.managerId,
      email: session.user.email,
    };
  } catch {
    return null;
  }
}

export async function requireAppUser() {
  const appUser = await getCurrentAppUser();
  if (!appUser) redirect("/");
  return appUser;
}

export async function requireRole(role: Role) {
  const appUser = await requireAppUser();
  if (appUser.role !== role) {
    redirect(getHomePathForRole(appUser.role));
  }
  return appUser;
}
