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
                {entry.details?.goalChanges?.length ? (
                  <div className="mt-3 space-y-3 rounded-2xl bg-muted/40 p-3">
                    {entry.details.goalChanges.map((change) => (
                      <div
                        key={`${entry.id}-${change.goalId}-${change.changeType}`}
                        className="space-y-2 rounded-xl border border-border/60 bg-background/70 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">{change.goalTitle}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {change.changeType}
                          </p>
                        </div>
                        {change.fieldChanges?.length ? (
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {change.fieldChanges.map((fieldChange) => (
                              <p
                                key={`${change.goalId}-${fieldChange.field}`}
                                className="font-mono text-xs sm:text-sm"
                              >
                                {fieldChange.field}: {formatAuditValue(fieldChange.from)} {"->"}{" "}
                                {formatAuditValue(fieldChange.to)}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </RequireRole>
  );
}

function formatAuditValue(value: string | number | null) {
  if (value === null || value === "") return "empty";
  return String(value);
}
