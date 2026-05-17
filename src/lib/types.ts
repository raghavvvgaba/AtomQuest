export const ROLE_VALUES = ["employee", "manager", "admin"] as const;
export const GOAL_SHEET_STATUS_VALUES = [
  "draft",
  "submitted",
  "returned",
  "approved",
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

export type Role = (typeof ROLE_VALUES)[number];
export type GoalSheetStatus = (typeof GOAL_SHEET_STATUS_VALUES)[number];
export type UomType = (typeof UOM_TYPE_VALUES)[number];
export type UomDirection = (typeof UOM_DIRECTION_VALUES)[number];
export type ThrustArea = (typeof THRUST_AREA_VALUES)[number];

export type User = {
  id: string;
  name: string;
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
