"use client";

import { PageHeader } from "@/components/app/page-header";
import { RequireRole } from "@/components/app/require-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";

export function AdminAuditLog() {
  const { state } = useAppStore();

  return (
    <RequireRole role="admin">
      <div className="space-y-6">
        <PageHeader eyebrow="Admin" title="Audit log" />

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.auditLogs.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold">{entry.action}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {entry.actorName} · {entry.entityLabel}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </RequireRole>
  );
}
