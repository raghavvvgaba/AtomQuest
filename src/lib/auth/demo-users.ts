import type { Role } from "@/lib/types";

export type DemoCredential = {
  appUserId: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  managerId: string | null;
  homePath: string;
};

export const demoCredentials: DemoCredential[] = [
  {
    appUserId: "employee-01",
    name: "Riya Verma",
    email: "employee@atomquest.test",
    password: "Employee@123",
    role: "employee",
    managerId: "manager-01",
    homePath: "/employee",
  },
  {
    appUserId: "manager-01",
    name: "Arjun Mehta",
    email: "manager@atomquest.test",
    password: "Manager@123",
    role: "manager",
    managerId: null,
    homePath: "/manager",
  },
  {
    appUserId: "admin-01",
    name: "Ananya Rao",
    email: "admin@atomquest.test",
    password: "Admin@123",
    role: "admin",
    managerId: null,
    homePath: "/admin",
  },
];

export function getHomePathForRole(role: Role) {
  if (role === "manager") return "/manager";
  if (role === "admin") return "/admin";
  return "/employee";
}
