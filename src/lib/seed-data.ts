import type { Goal, GoalSheet, User } from "@/lib/types";

const now = "2026-05-17T08:30:00.000Z";

export const seededUsers: User[] = [
  { id: "employee-01", name: "Riya Verma", role: "employee", managerId: "manager-01" },
  { id: "employee-02", name: "Kabir Nair", role: "employee", managerId: "manager-01" },
  { id: "employee-03", name: "Tara Singh", role: "employee", managerId: "manager-01" },
  { id: "manager-01", name: "Arjun Mehta", role: "manager", managerId: null },
  { id: "admin-01", name: "Ananya Rao", role: "admin", managerId: null },
];

export const seededGoalSheets: GoalSheet[] = [
  {
    id: "sheet-01",
    employeeId: "employee-01",
    status: "draft",
    managerComment: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "sheet-02",
    employeeId: "employee-02",
    status: "submitted",
    managerComment: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "sheet-03",
    employeeId: "employee-03",
    status: "approved",
    managerComment: "Approved after weightage balancing.",
    createdAt: now,
    updatedAt: now,
  },
];

export const seededGoals: Goal[] = [
  {
    id: "goal-01",
    goalSheetId: "sheet-01",
    thrustArea: "Customer Experience",
    title: "Launch premium onboarding pilot",
    description:
      "Design and trial a premium onboarding program for enterprise trial accounts.",
    uomType: "numeric",
    uomDirection: "min",
    targetValue: "15",
    weightage: 40,
  },
  {
    id: "goal-02",
    goalSheetId: "sheet-01",
    thrustArea: "Customer Experience",
    title: "Reduce first-response lag",
    description:
      "Lower the average first-response time for high-value support conversations.",
    uomType: "timeline",
    uomDirection: "timeline",
    targetValue: "2026-08-31",
    weightage: 20,
  },
  {
    id: "goal-03",
    goalSheetId: "sheet-02",
    thrustArea: "Revenue Growth",
    title: "Increase quarterly pipeline conversion",
    description:
      "Improve lead-to-opportunity conversion for strategic accounts in the west zone.",
    uomType: "percentage",
    uomDirection: "min",
    targetValue: "32",
    weightage: 35,
  },
  {
    id: "goal-04",
    goalSheetId: "sheet-02",
    thrustArea: "Operational Excellence",
    title: "Lower proposal turnaround time",
    description:
      "Cut proposal turnaround for repeat enterprise requests without hurting quality.",
    uomType: "numeric",
    uomDirection: "max",
    targetValue: "3",
    weightage: 30,
  },
  {
    id: "goal-05",
    goalSheetId: "sheet-02",
    thrustArea: "Compliance / Risk",
    title: "Zero escalation misses",
    description: "Keep unresolved escalation misses at zero for priority customer accounts.",
    uomType: "zero",
    uomDirection: "zero",
    targetValue: "0",
    weightage: 35,
  },
  {
    id: "goal-06",
    goalSheetId: "sheet-03",
    thrustArea: "People & Capability",
    title: "Complete leadership enablement calendar",
    description:
      "Deliver the manager enablement calendar with attendance and feedback targets.",
    uomType: "timeline",
    uomDirection: "timeline",
    targetValue: "2026-09-15",
    weightage: 50,
  },
  {
    id: "goal-07",
    goalSheetId: "sheet-03",
    thrustArea: "People & Capability",
    title: "Improve manager coaching quality",
    description:
      "Raise internal manager coaching score based on the quarterly pulse survey.",
    uomType: "percentage",
    uomDirection: "min",
    targetValue: "88",
    weightage: 50,
  },
];
