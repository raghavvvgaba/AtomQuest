"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { RequireRole } from "@/components/app/require-role";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function ManagerCheckIns() {
  const { currentUser, getManagerCheckInQueue } = useAppStore();

  if (!currentUser) return null;

  const queue = getManagerCheckInQueue(currentUser.id);
  const submitted = queue.filter((item) => item.checkIn.status === "submitted");
  const reviewed = queue.filter((item) => item.checkIn.status === "reviewed");

  return (
    <RequireRole role="manager">
      <div className="space-y-6">
        <PageHeader eyebrow="Manager check-ins" title="Quarterly check-in review" />

        <section className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pending review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {submitted.length === 0 ? (
                <p className="rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                  No submitted check-ins.
                </p>
              ) : (
                submitted.map((item) => (
                  <CheckInListItem key={item.checkIn.id} item={item} />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reviewed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviewed.length === 0 ? (
                <p className="rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                  Nothing reviewed yet.
                </p>
              ) : (
                reviewed.map((item) => (
                  <CheckInListItem key={item.checkIn.id} item={item} />
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </RequireRole>
  );
}

function CheckInListItem({
  item,
}: {
  item: ReturnType<typeof useAppStore>["getManagerCheckInQueue"] extends (
    managerId: string,
  ) => Array<infer T>
    ? T
    : never;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-semibold">{item.employee.name}</p>
          <Badge variant={item.checkIn.status === "submitted" ? "default" : "secondary"}>
            {item.checkIn.quarter}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground capitalize">{item.checkIn.status}</p>
      </div>
      <Link
        className={cn(buttonVariants({ variant: "default" }), "self-start md:self-auto")}
        href={`/manager/check-ins/${item.employee.id}`}
      >
        Review
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
