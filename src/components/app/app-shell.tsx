"use client";

import {
  ClipboardCheck,
  Compass,
  FolderKanban,
  Home,
  LockOpen,
  CalendarDays,
  PanelsTopLeft,
  ScrollText,
  Share2,
  TableProperties,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ProfileMenu } from "@/components/app/profile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  match: (pathname: string) => boolean;
};

const employeeNav: NavItem[] = [
  {
    href: "/employee",
    label: "Dashboard",
    icon: Home,
    match: (pathname) => pathname === "/employee",
  },
  {
    href: "/employee/goals",
    label: "Goal Sheet",
    icon: FolderKanban,
    match: (pathname) => pathname.startsWith("/employee/goals"),
  },
  {
    href: "/employee/check-ins",
    label: "Check-ins",
    icon: ClipboardCheck,
    match: (pathname) => pathname.startsWith("/employee/check-ins"),
  },
];

const managerNav: NavItem[] = [
  {
    href: "/manager",
    label: "Dashboard",
    icon: PanelsTopLeft,
    match: (pathname) => pathname === "/manager",
  },
  {
    href: "/manager/check-ins",
    label: "Check-ins",
    icon: ClipboardCheck,
    match: (pathname) => pathname.startsWith("/manager/check-ins"),
  },
  {
    href: "/manager/shared-goals",
    label: "Shared Goals",
    icon: Share2,
    match: (pathname) => pathname.startsWith("/manager/shared-goals"),
  },
];

const adminNav: NavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: PanelsTopLeft,
    match: (pathname) => pathname === "/admin",
  },
  {
    href: "/admin/unlock",
    label: "Unlock",
    icon: LockOpen,
    match: (pathname) => pathname.startsWith("/admin/unlock"),
  },
  {
    href: "/admin/cycles",
    label: "Cycles",
    icon: CalendarDays,
    match: (pathname) => pathname.startsWith("/admin/cycles"),
  },
  {
    href: "/admin/org-hierarchy",
    label: "Org Hierarchy",
    icon: UsersRound,
    match: (pathname) => pathname.startsWith("/admin/org-hierarchy"),
  },
  {
    href: "/admin/shared-goals",
    label: "Shared Goals",
    icon: Share2,
    match: (pathname) => pathname.startsWith("/admin/shared-goals"),
  },
  {
    href: "/admin/completion",
    label: "Completion",
    icon: ClipboardCheck,
    match: (pathname) => pathname.startsWith("/admin/completion"),
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: TableProperties,
    match: (pathname) => pathname.startsWith("/admin/reports"),
  },
  {
    href: "/admin/audit-log",
    label: "Audit Log",
    icon: ScrollText,
    match: (pathname) => pathname.startsWith("/admin/audit-log"),
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { currentUser } = useAppStore();

  const nav =
    currentUser?.role === "admin"
      ? adminNav
      : currentUser?.role === "manager"
        ? managerNav
        : employeeNav;

  return (
    <div className="min-h-screen bg-background px-4 py-4 md:px-8 md:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground dark:bg-secondary dark:text-secondary-foreground">
              <Compass className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-normal">AtomQuest</h1>
              <p className="text-sm text-muted-foreground">Goal Setting Portal</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle />
            {currentUser ? <ProfileMenu user={currentUser} /> : null}
          </div>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="space-y-2 border-r border-border pr-0 lg:pr-4">
            <nav className="space-y-2">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = item.match(pathname);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                      active
                        ? "bg-primary text-primary-foreground dark:bg-secondary dark:text-secondary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
