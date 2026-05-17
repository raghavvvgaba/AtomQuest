"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "@/lib/types";
import { useAppStore } from "@/store/app-store";

export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const { currentUser } = useAppStore();

  if (!currentUser || currentUser.role !== role) {
    return (
      <Card className="mx-auto mt-14 max-w-2xl">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Role required
          </p>
          <CardTitle>Choose the right role first</CardTitle>
          <CardDescription>
            Sign in with an account that has access to this area.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants({ variant: "default" })} href="/">
            Return to login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
