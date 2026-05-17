export const ROLE_VALUES = ["employee", "manager", "admin"] as const;
export const GOAL_SHEET_STATUS_VALUES = [
  "draft",
  "submitted",
  "returned",
  "approved",
  "unlocked",
] as const;
export const UOM_TYPE_VALUES = [
  "numeric",
  "percentage",
  "timeline",
  "zero",
] as const;
export const UOM_DIRECTION_VALUES = ["min", "max", "timeline", "zero"] as const;
export const THRUST_AREA_VALUES = [
  "Revenue Growth",
  "Customer Experience",
  "Operational Excellence",
  "People & Capability",
  "Innovation",
  "Compliance / Risk",
] as const;
export const QUARTER_VALUES = ["Q1", "Q2", "Q3", "Q4"] as const;
export const CHECK_IN_STATUS_VALUES = ["draft", "submitted", "reviewed"] as const;
export const PROGRESS_STATUS_VALUES = [
  "not_started",
  "on_track",
  "completed",
] as const;

export type Role = (typeof ROLE_VALUES)[number];
export type GoalSheetStatus = (typeof GOAL_SHEET_STATUS_VALUES)[number];
export type UomType = (typeof UOM_TYPE_VALUES)[number];
export type UomDirection = (typeof UOM_DIRECTION_VALUES)[number];
export type ThrustArea = (typeof THRUST_AREA_VALUES)[number];
export type Quarter = (typeof QUARTER_VALUES)[number];
export type CheckInStatus = (typeof CHECK_IN_STATUS_VALUES)[number];
export type ProgressStatus = (typeof PROGRESS_STATUS_VALUES)[number];

export type User = {
  id: string;
  name: string;
  email?: string;
  role: Role;
  managerId: string | null;
};

export type GoalSheet = {
  id: string;
  employeeId: string;
  status: GoalSheetStatus;
  managerComment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Goal = {
  id: string;
  goalSheetId: string;
  thrustArea: ThrustArea | "";
  title: string;
  description: string;
  uomType: UomType | "";
  uomDirection: UomDirection | "";
  targetValue: string;
  weightage: number | null;
};

export type CheckIn = {
  id: string;
  goalSheetId: string;
  quarter: Quarter;
  status: CheckInStatus;
  managerComment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CheckInGoalUpdate = {
  id: string;
  checkInId: string;
  goalId: string;
  actualAchievement: string;
  progressStatus: ProgressStatus | "";
};

export type AuditLogEntry = {
  id: string;
  actorName: string;
  action: string;
  entityLabel: string;
  details?: {
    goalChanges: Array<{
      goalId: string;
      goalTitle: string;
      changeType: "updated" | "added" | "removed";
      fieldChanges?: Array<{
        field:
          | "thrustArea"
          | "title"
          | "description"
          | "uomType"
          | "uomDirection"
          | "targetValue"
          | "weightage";
        from: string | number | null;
        to: string | number | null;
      }>;
    }>;
  } | null;
  createdAt: string;
};

export type GoalFieldError = Partial<
  Record<
    | "thrustArea"
    | "title"
    | "description"
    | "uomType"
    | "uomDirection"
    | "targetValue"
    | "weightage",
    string
  >
>;

export type GoalSheetValidationResult = {
  isValid: boolean;
  summary: string[];
  goalErrors: Record<string, GoalFieldError>;
};

export type CheckInGoalUpdateDraft = Pick<
  CheckInGoalUpdate,
  "goalId" | "actualAchievement" | "progressStatus"
>;
