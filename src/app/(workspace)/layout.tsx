import type { ReactNode } from "react";

import { AppShell } from "@/components/app/app-shell";
import { requireAppUser } from "@/lib/auth/session";
import { getWorkflowSnapshot } from "@/lib/workflow/snapshot";
import { AppStoreProvider } from "@/store/app-store";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const appUser = await requireAppUser();
  const initialStateData = await getWorkflowSnapshot(appUser);

  return (
    <AppStoreProvider initialStateData={initialStateData}>
      <AppShell>{children}</AppShell>
    </AppStoreProvider>
  );
}
