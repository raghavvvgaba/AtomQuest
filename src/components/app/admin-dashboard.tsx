"use client";

import Link from "next/link";
import { LockOpen, ScrollText, Share2, TableProperties } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { RequireRole } from "@/components/app/require-role";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function AdminDashboard() {
  const { getAdminDashboardCounts } = useAppStore();
  const counts = getAdminDashboardCounts();

  return (
    <RequireRole role="admin">
      <div className="space-y-6">
        <PageHeader eyebrow="Admin" title="Admin dashboard" />

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Employees" value={counts.employees} />
          <Metric label="Managers" value={counts.managers} />
          <Metric label="Submitted sheets" value={counts.goalSheets.submitted} />
          <Metric label="Submitted check-ins" value={counts.checkIns.submitted} />
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <AdminLink href="/admin/unlock" icon={LockOpen} label="Unlock goal sheets" />
          <AdminLink href="/admin/shared-goals" icon={Share2} label="Shared goals" />
          <AdminLink href="/admin/reports" icon={TableProperties} label="Reports table" />
          <AdminLink href="/admin/audit-log" icon={ScrollText} label="Audit log" />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <StatusCard title="Goal sheets" values={counts.goalSheets} />
          <StatusCard title="Check-ins" values={counts.checkIns} />
        </section>
      </div>
    </RequireRole>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
        <p className="mt-3 text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function AdminLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof LockOpen;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-5" />
          </div>
          <p className="font-semibold">{label}</p>
        </div>
        <Link className={cn(buttonVariants({ variant: "outline" }))} href={href}>
          Open
        </Link>
      </CardContent>
    </Card>
  );
}

function StatusCard({ title, values }: { title: string; values: Record<string, number> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(values).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
            <span className="capitalize">{key}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
