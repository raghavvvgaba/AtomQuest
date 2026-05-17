"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <Button
      disabled={isSigningOut}
      onClick={handleSignOut}
      type="button"
      variant="outline"
    >
      <LogOut className="size-4" />
      {isSigningOut ? "Signing out" : "Sign out"}
    </Button>
  );
}
