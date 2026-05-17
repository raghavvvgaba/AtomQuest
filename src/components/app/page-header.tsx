import type { ReactNode } from "react";

import { StatusBadge } from "@/components/app/status-badge";

export function PageHeader({
  eyebrow,
  title,
  description,
  status,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  status?: Parameters<typeof StatusBadge>[0]["status"];
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          {eyebrow}
        </p>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          {description ? (
            <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
