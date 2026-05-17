import type { ReactNode } from "react";

import { AppShell } from "@/components/app/app-shell";
import { requireAppUser } from "@/lib/auth/session";
import { AppStoreProvider } from "@/store/app-store";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const appUser = await requireAppUser();

  return (
    <AppStoreProvider initialUserId={appUser.id}>
      <AppShell>{children}</AppShell>
    </AppStoreProvider>
  );
}
