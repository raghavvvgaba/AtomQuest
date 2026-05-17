"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRoleLabel } from "@/lib/goal-sheet";
import type { Role } from "@/lib/types";
import { useAppStore } from "@/store/app-store";

const roleCards: Array<{
  role: Role;
  route?: string;
  description: string;
  disabled?: boolean;
}> = [
  {
    role: "employee",
    route: "/employee",
    description: "Create, edit, and submit goals.",
  },
  {
    role: "manager",
    route: "/manager",
    description: "Review submitted goal sheets.",
  },
  {
    role: "admin",
    route: "/admin",
    description: "View oversight, reports, and unlocks.",
  },
];

export function RoleSwitcher() {
  const router = useRouter();
  const { switchRole, getDefaultUserByRole } = useAppStore();

  function handleContinue(role: Role, route?: string) {
    if (!route) return;
    const user = getDefaultUserByRole(role);
    if (!user) return;

    switchRole(user.id);
    router.push(route);
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 md:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">AtomQuest</h1>
            <p className="text-sm text-muted-foreground">Select a role</p>
          </div>
          <ThemeToggle />
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {roleCards.map((card) => (
            <Card key={card.role} className="flex h-full flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{getRoleLabel(card.role)}</CardTitle>
                  {card.disabled ? <Badge variant="secondary">Locked</Badge> : null}
                </div>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full justify-between"
                  disabled={card.disabled}
                  onClick={() => handleContinue(card.role, card.route)}
                >
                  Continue as {getRoleLabel(card.role)}
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
