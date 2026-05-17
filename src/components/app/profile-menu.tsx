"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getRoleLabel } from "@/lib/goal-sheet";
import { authClient } from "@/lib/auth/client";
import type { User } from "@/lib/types";

export function ProfileMenu({ user }: { user: User }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const initial = user.name.trim().charAt(0).toUpperCase() || "U";

  async function handleSignOut() {
    setIsSigningOut(true);
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex size-10 items-center justify-center rounded-full border border-border bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email ?? "Email unavailable"}
            </p>
            <p className="text-xs text-muted-foreground">{getRoleLabel(user.role)}</p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isSigningOut}
          onClick={handleSignOut}
          variant="destructive"
        >
          <LogOut className="size-4" />
          {isSigningOut ? "Signing out" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
