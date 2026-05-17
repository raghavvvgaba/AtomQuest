"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

import {
  createEmptyGoal,
  getComputedProgress as computeGoalProgress,
  getGoalSheetTotalWeightage,
  syncGoalTypeDefaults,
  validateGoalSheet,
} from "@/lib/goal-sheet";
import {
  seededAuditLogs,
  seededCheckInGoalUpdates,
  seededCheckIns,
  seededGoals,
  seededGoalSheets,
  seededUsers,
} from "@/lib/seed-data";
import type {
  AuditLogEntry,
  CheckIn,
  CheckInGoalUpdate,
  CheckInGoalUpdateDraft,
  Goal,
  GoalSheet,
  GoalSheetValidationResult,
  Quarter,
  Role,
  User,
} from "@/lib/types";

type AppState = {
  currentUserId: string | null;
  users: User[];
  goalSheets: GoalSheet[];
  goals: Goal[];
  checkIns: CheckIn[];
  checkInGoalUpdates: CheckInGoalUpdate[];
  auditLogs: AuditLogEntry[];
};

type SaveGoalSheetPayload = {
  managerComment?: string | null;
};

type AppStoreContextValue = {
  state: AppState;
  currentUser: User | null;
  switchRole: (userId: string) => void;
  getDefaultUserByRole: (role: Role) => User | undefined;
  getGoalSheetByEmployee: (employeeId: string) => GoalSheet | undefined;
  getGoalsByGoalSheet: (goalSheetId: string) => Goal[];
  getManagerTeam: (managerId: string) => User[];
  getSubmittedSheetsAwaitingManagerAction: (managerId: string) => GoalSheet[];
  getCheckInsByGoalSheet: (goalSheetId: string) => CheckIn[];
  getCheckInByEmployeeAndQuarter: (
    employeeId: string,
    quarter: Quarter,
  ) => CheckIn | undefined;
  getCheckInGoalUpdates: (checkInId: string) => CheckInGoalUpdate[];
  getManagerCheckInQueue: (managerId: string) => Array<{
    employee: User;
    goalSheet: GoalSheet;
    checkIn: CheckIn;
  }>;
  getComputedProgress: (goal: Goal, actualAchievement: string) => string;
  getAdminDashboardCounts: () => {
    employees: number;
    managers: number;
    goalSheets: Record<GoalSheet["status"], number>;
    checkIns: Record<CheckIn["status"], number>;
  };
  getReportRows: () => Array<{
    id: string;
    employeeName: string;
    managerName: string;
    quarter: Quarter;
    goalTitle: string;
    thrustArea: string;
    targetValue: string;
    actualAchievement: string;
    progressStatus: CheckInGoalUpdate["progressStatus"];
    computedProgress: string;
    checkInStatus: CheckIn["status"];
  }>;
  getGoalSheetValidationResult: (
    employeeId: string,
  ) => GoalSheetValidationResult | null;
  getGoalSheetTotalWeightage: (employeeId: string) => number;
  addGoal: (employeeId: string) => void;
  removeGoal: (employeeId: string, goalId: string) => void;
  updateGoalField: <K extends keyof Goal>(
    employeeId: string,
    goalId: string,
    field: K,
    value: Goal[K],
  ) => void;
  saveGoalSheetDraft: (employeeId: string, payload?: SaveGoalSheetPayload) => void;
  submitGoalSheet: (employeeId: string) => GoalSheetValidationResult;
  updateManagerReview: (
    employeeId: string,
    updates: Array<Pick<Goal, "id" | "targetValue" | "weightage">>,
  ) => void;
  returnGoalSheet: (employeeId: string, comment?: string) => void;
  approveGoalSheet: (employeeId: string) => GoalSheetValidationResult;
  saveCheckInDraft: (
    employeeId: string,
    quarter: Quarter,
    updates: CheckInGoalUpdateDraft[],
  ) => void;
  submitCheckIn: (
    employeeId: string,
    quarter: Quarter,
  ) => { isValid: boolean; summary: string[] };
  reviewCheckIn: (
    employeeId: string,
    quarter: Quarter,
    managerComment?: string,
  ) => void;
  unlockGoalSheet: (employeeId: string) => void;
  createAuditLogEntry: (payload: Omit<AuditLogEntry, "id" | "createdAt">) => void;
};

type Action =
  | { type: "switch-role"; userId: string }
  | { type: "add-goal"; employeeId: string }
  | { type: "remove-goal"; employeeId: string; goalId: string }
  | {
      type: "update-goal-field";
      employeeId: string;
      goalId: string;
      field: keyof Goal;
      value: Goal[keyof Goal];
    }
  | {
      type: "save-goal-sheet-draft";
      employeeId: string;
      payload?: SaveGoalSheetPayload;
    }
  | { type: "submit-goal-sheet"; employeeId: string }
  | {
      type: "update-manager-review";
      employeeId: string;
      updates: Array<Pick<Goal, "id" | "targetValue" | "weightage">>;
    }
  | { type: "return-goal-sheet"; employeeId: string; comment?: string }
  | { type: "approve-goal-sheet"; employeeId: string }
  | {
      type: "save-check-in-draft";
      employeeId: string;
      quarter: Quarter;
      updates: CheckInGoalUpdateDraft[];
    }
  | { type: "submit-check-in"; employeeId: string; quarter: Quarter }
  | {
      type: "review-check-in";
      employeeId: string;
      quarter: Quarter;
      managerComment?: string;
    }
  | { type: "unlock-goal-sheet"; employeeId: string }
  | { type: "create-audit-log-entry"; payload: Omit<AuditLogEntry, "id" | "createdAt"> };

const initialState: AppState = {
  currentUserId: null,
  users: seededUsers,
  goalSheets: seededGoalSheets,
  goals: seededGoals,
  checkIns: seededCheckIns,
  checkInGoalUpdates: seededCheckInGoalUpdates,
  auditLogs: seededAuditLogs,
};

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

function getGoalSheetByEmployeeFromState(state: AppState, employeeId: string) {
  return state.goalSheets.find((sheet) => sheet.employeeId === employeeId);
}

function updateGoalSheetTimestamp(sheet: GoalSheet, overrides?: Partial<GoalSheet>): GoalSheet {
  return {
    ...sheet,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function getActorName(state: AppState) {
  return state.users.find((user) => user.id === state.currentUserId)?.name ?? "System";
}

function createAuditLog(
  state: AppState,
  action: string,
  entityLabel: string,
  actorName = getActorName(state),
): AuditLogEntry {
  return {
    id: `audit-${crypto.randomUUID()}`,
    actorName,
    action,
    entityLabel,
    createdAt: new Date().toISOString(),
  };
}

function getCheckInByEmployeeAndQuarterFromState(
  state: AppState,
  employeeId: string,
  quarter: Quarter,
) {
  const goalSheet = getGoalSheetByEmployeeFromState(state, employeeId);
  if (!goalSheet) return undefined;
  return state.checkIns.find(
    (checkIn) => checkIn.goalSheetId === goalSheet.id && checkIn.quarter === quarter,
  );
}

function createCheckInForQuarter(
  state: AppState,
  goalSheet: GoalSheet,
  quarter: Quarter,
): {
  checkIn: CheckIn;
  updates: CheckInGoalUpdate[];
} {
  const checkIn: CheckIn = {
    id: `check-in-${crypto.randomUUID()}`,
    goalSheetId: goalSheet.id,
    quarter,
    status: "draft",
    managerComment: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    checkIn,
    updates: state.goals
      .filter((goal) => goal.goalSheetId === goalSheet.id)
      .map((goal) => ({
        id: `check-in-update-${crypto.randomUUID()}`,
        checkInId: checkIn.id,
        goalId: goal.id,
        actualAchievement: "",
        progressStatus: "",
      })),
  };
}

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "switch-role":
      return { ...state, currentUserId: action.userId };

    case "add-goal": {
      const goalSheet = getGoalSheetByEmployeeFromState(state, action.employeeId);
      if (!goalSheet || !["draft", "returned", "unlocked"].includes(goalSheet.status)) {
        return state;
      }

      return {
        ...state,
        goals: [...state.goals, createEmptyGoal(goalSheet.id)],
        goalSheets: state.goalSheets.map((sheet) =>
          sheet.id === goalSheet.id ? updateGoalSheetTimestamp(sheet) : sheet,
        ),
      };
    }

    case "remove-goal": {
      const goalSheet = getGoalSheetByEmployeeFromState(state, action.employeeId);
      if (!goalSheet || !["draft", "returned", "unlocked"].includes(goalSheet.status)) {
        return state;
      }

      return {
        ...state,
        goals: state.goals.filter((goal) => goal.id !== action.goalId),
        goalSheets: state.goalSheets.map((sheet) =>
          sheet.id === goalSheet.id ? updateGoalSheetTimestamp(sheet) : sheet,
        ),
      };
    }

    case "update-goal-field": {
      const goalSheet = getGoalSheetByEmployeeFromState(state, action.employeeId);
      if (!goalSheet) {
        return state;
      }

      const canEmployeeEdit = ["draft", "returned", "unlocked"].includes(goalSheet.status);
      const canManagerEdit = goalSheet.status === "submitted";

      return {
        ...state,
        goals: state.goals.map((goal) => {
          if (goal.id !== action.goalId || goal.goalSheetId !== goalSheet.id) return goal;

          if (action.field === "uomType" && canEmployeeEdit) {
            return syncGoalTypeDefaults(goal, action.value as Goal["uomType"]);
          }

          if (!canEmployeeEdit && !canManagerEdit) return goal;
          if (
            canManagerEdit &&
            !["targetValue", "weightage"].includes(action.field)
          ) {
            return goal;
          }

          return {
            ...goal,
            [action.field]: action.value,
          };
        }),
        goalSheets: state.goalSheets.map((sheet) =>
          sheet.id === goalSheet.id ? updateGoalSheetTimestamp(sheet) : sheet,
        ),
      };
    }

    case "save-goal-sheet-draft": {
      const goalSheet = getGoalSheetByEmployeeFromState(state, action.employeeId);
      if (!goalSheet || !["draft", "returned", "unlocked"].includes(goalSheet.status)) {
        return state;
      }

      return {
        ...state,
        goalSheets: state.goalSheets.map((sheet) =>
          sheet.id === goalSheet.id
            ? updateGoalSheetTimestamp(sheet, {
                status:
                  sheet.status === "returned" || sheet.status === "unlocked"
                    ? sheet.status
                    : "draft",
                managerComment:
                  action.payload?.managerComment ?? sheet.managerComment,
              })
            : sheet,
        ),
      };
    }

    case "submit-goal-sheet": {
      const goalSheet = getGoalSheetByEmployeeFromState(state, action.employeeId);
      if (!goalSheet || !["draft", "returned", "unlocked"].includes(goalSheet.status)) {
        return state;
      }

      return {
        ...state,
        goalSheets: state.goalSheets.map((sheet) =>
          sheet.id === goalSheet.id
            ? updateGoalSheetTimestamp(sheet, {
                status: "submitted",
              })
            : sheet,
        ),
      };
    }

    case "update-manager-review": {
      const goalSheet = getGoalSheetByEmployeeFromState(state, action.employeeId);
      if (!goalSheet || goalSheet.status !== "submitted") {
        return state;
      }

      const goalIdsInSheet = new Set(
        state.goals
          .filter((goal) => goal.goalSheetId === goalSheet.id)
          .map((goal) => goal.id),
      );

      return {
        ...state,
        goals: state.goals.map((goal) => {
          if (!goalIdsInSheet.has(goal.id)) return goal;

          const update = action.updates.find((item) => item.id === goal.id);
          return update
            ? {
                ...goal,
                targetValue: update.targetValue,
                weightage: update.weightage,
              }
            : goal;
        }),
      };
    }

    case "return-goal-sheet": {
      const goalSheet = getGoalSheetByEmployeeFromState(state, action.employeeId);
      if (!goalSheet || goalSheet.status !== "submitted") {
        return state;
      }

      const employee = state.users.find((user) => user.id === action.employeeId);
      return {
        ...state,
        goalSheets: state.goalSheets.map((sheet) =>
          sheet.id === goalSheet.id
            ? updateGoalSheetTimestamp(sheet, {
                status: "returned",
                managerComment: action.comment?.trim() || null,
              })
            : sheet,
        ),
        auditLogs: [
          createAuditLog(state, "Returned goal sheet", employee?.name ?? action.employeeId),
          ...state.auditLogs,
        ],
      };
    }

    case "approve-goal-sheet": {
      const goalSheet = getGoalSheetByEmployeeFromState(state, action.employeeId);
      if (!goalSheet || goalSheet.status !== "submitted") {
        return state;
      }

      const employee = state.users.find((user) => user.id === action.employeeId);
      return {
        ...state,
        goalSheets: state.goalSheets.map((sheet) =>
          sheet.id === goalSheet.id
            ? updateGoalSheetTimestamp(sheet, {
                status: "approved",
              })
            : sheet,
        ),
        auditLogs: [
          createAuditLog(state, "Approved goal sheet", employee?.name ?? action.employeeId),
          ...state.auditLogs,
        ],
      };
    }

    case "save-check-in-draft": {
      const goalSheet = getGoalSheetByEmployeeFromState(state, action.employeeId);
      if (!goalSheet || goalSheet.status !== "approved") return state;

      const existingCheckIn = getCheckInByEmployeeAndQuarterFromState(
        state,
        action.employeeId,
        action.quarter,
      );
      const created = existingCheckIn
        ? null
        : createCheckInForQuarter(state, goalSheet, action.quarter);
      const checkIn = existingCheckIn ?? created?.checkIn;
      if (!checkIn || checkIn.status !== "draft") return state;

      const baseUpdates = existingCheckIn
        ? state.checkInGoalUpdates
        : [...state.checkInGoalUpdates, ...(created?.updates ?? [])];

      return {
        ...state,
        checkIns: existingCheckIn
          ? state.checkIns.map((item) =>
              item.id === checkIn.id
                ? { ...item, status: "draft", updatedAt: new Date().toISOString() }
                : item,
            )
          : [...state.checkIns, checkIn],
        checkInGoalUpdates: baseUpdates.map((update) => {
          if (update.checkInId !== checkIn.id) return update;
          const next = action.updates.find((item) => item.goalId === update.goalId);
          return next
            ? {
                ...update,
                actualAchievement: next.actualAchievement,
                progressStatus: next.progressStatus,
              }
            : update;
        }),
      };
    }

    case "submit-check-in": {
      const checkIn = getCheckInByEmployeeAndQuarterFromState(
        state,
        action.employeeId,
        action.quarter,
      );
      const goalSheet = getGoalSheetByEmployeeFromState(state, action.employeeId);
      const employee = state.users.find((user) => user.id === action.employeeId);
      if (!goalSheet || goalSheet.status !== "approved" || !checkIn || checkIn.status !== "draft") {
        return state;
      }

      return {
        ...state,
        checkIns: state.checkIns.map((item) =>
          item.id === checkIn.id
            ? { ...item, status: "submitted", updatedAt: new Date().toISOString() }
            : item,
        ),
        auditLogs: [
          createAuditLog(
            state,
            `Submitted ${action.quarter} check-in`,
            employee?.name ?? action.employeeId,
          ),
          ...state.auditLogs,
        ],
      };
    }

    case "review-check-in": {
      const checkIn = getCheckInByEmployeeAndQuarterFromState(
        state,
        action.employeeId,
        action.quarter,
      );
      const employee = state.users.find((user) => user.id === action.employeeId);
      if (!checkIn || checkIn.status !== "submitted") return state;

      return {
        ...state,
        checkIns: state.checkIns.map((item) =>
          item.id === checkIn.id
            ? {
                ...item,
                status: "reviewed",
                managerComment: action.managerComment?.trim() || null,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
        auditLogs: [
          createAuditLog(
            state,
            `Reviewed ${action.quarter} check-in`,
            employee?.name ?? action.employeeId,
          ),
          ...state.auditLogs,
        ],
      };
    }

    case "unlock-goal-sheet": {
      const employee = state.users.find((user) => user.id === action.employeeId);
      return {
        ...state,
        goalSheets: state.goalSheets.map((sheet) =>
          sheet.employeeId === action.employeeId && sheet.status === "approved"
            ? updateGoalSheetTimestamp(sheet, { status: "unlocked" })
            : sheet,
        ),
        auditLogs: [
          createAuditLog(state, "Unlocked goal sheet", employee?.name ?? action.employeeId),
          ...state.auditLogs,
        ],
      };
    }

    case "create-audit-log-entry":
      return {
        ...state,
        auditLogs: [
          {
            id: `audit-${crypto.randomUUID()}`,
            createdAt: new Date().toISOString(),
            ...action.payload,
          },
          ...state.auditLogs,
        ],
      };

    default:
      return state;
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const currentUser = useMemo(
    () => state.users.find((user) => user.id === state.currentUserId) ?? null,
    [state.currentUserId, state.users],
  );

  const switchRole = useCallback((userId: string) => {
    dispatch({ type: "switch-role", userId });
  }, []);

  const getDefaultUserByRole = useCallback(
    (role: Role) => state.users.find((user) => user.role === role),
    [state.users],
  );

  const getGoalSheetByEmployee = useCallback(
    (employeeId: string) => getGoalSheetByEmployeeFromState(state, employeeId),
    [state],
  );

  const getGoalsByGoalSheet = useCallback(
    (goalSheetId: string) =>
      state.goals.filter((goal) => goal.goalSheetId === goalSheetId),
    [state.goals],
  );

  const getManagerTeam = useCallback(
    (managerId: string) =>
      state.users.filter(
        (user) => user.role === "employee" && user.managerId === managerId,
      ),
    [state.users],
  );

  const getSubmittedSheetsAwaitingManagerAction = useCallback(
    (managerId: string) =>
      state.goalSheets.filter((sheet) => {
        const user = state.users.find((item) => item.id === sheet.employeeId);
        return user?.managerId === managerId && sheet.status === "submitted";
      }),
    [state.goalSheets, state.users],
  );

  const getCheckInsByGoalSheet = useCallback(
    (goalSheetId: string) =>
      state.checkIns.filter((checkIn) => checkIn.goalSheetId === goalSheetId),
    [state.checkIns],
  );

  const getCheckInByEmployeeAndQuarter = useCallback(
    (employeeId: string, quarter: Quarter) =>
      getCheckInByEmployeeAndQuarterFromState(state, employeeId, quarter),
    [state],
  );

  const getCheckInGoalUpdates = useCallback(
    (checkInId: string) =>
      state.checkInGoalUpdates.filter((update) => update.checkInId === checkInId),
    [state.checkInGoalUpdates],
  );

  const getManagerCheckInQueue = useCallback(
    (managerId: string) =>
      state.checkIns
        .map((checkIn) => {
          const goalSheet = state.goalSheets.find((sheet) => sheet.id === checkIn.goalSheetId);
          const employee = goalSheet
            ? state.users.find((user) => user.id === goalSheet.employeeId)
            : undefined;

          if (!goalSheet || !employee || employee.managerId !== managerId) return null;
          if (!["submitted", "reviewed"].includes(checkIn.status)) return null;
          return { employee, goalSheet, checkIn };
        })
        .filter(Boolean) as Array<{ employee: User; goalSheet: GoalSheet; checkIn: CheckIn }>,
    [state.checkIns, state.goalSheets, state.users],
  );

  const getComputedProgress = useCallback(
    (goal: Goal, actualAchievement: string) => computeGoalProgress(goal, actualAchievement),
    [],
  );

  const getAdminDashboardCounts = useCallback(() => {
    const goalSheets = {
      draft: 0,
      submitted: 0,
      returned: 0,
      approved: 0,
      unlocked: 0,
    };
    const checkIns = {
      draft: 0,
      submitted: 0,
      reviewed: 0,
    };

    for (const sheet of state.goalSheets) {
      goalSheets[sheet.status] += 1;
    }

    for (const checkIn of state.checkIns) {
      checkIns[checkIn.status] += 1;
    }

    return {
      employees: state.users.filter((user) => user.role === "employee").length,
      managers: state.users.filter((user) => user.role === "manager").length,
      goalSheets,
      checkIns,
    };
  }, [state.checkIns, state.goalSheets, state.users]);

  const getReportRows = useCallback(
    () =>
      state.checkInGoalUpdates.map((update) => {
        const checkIn = state.checkIns.find((item) => item.id === update.checkInId);
        const goal = state.goals.find((item) => item.id === update.goalId);
        const goalSheet = checkIn
          ? state.goalSheets.find((sheet) => sheet.id === checkIn.goalSheetId)
          : undefined;
        const employee = goalSheet
          ? state.users.find((user) => user.id === goalSheet.employeeId)
          : undefined;
        const manager = employee?.managerId
          ? state.users.find((user) => user.id === employee.managerId)
          : undefined;

        return {
          id: update.id,
          employeeName: employee?.name ?? "Unknown employee",
          managerName: manager?.name ?? "No manager",
          quarter: checkIn?.quarter ?? "Q1",
          goalTitle: goal?.title ?? "Unknown goal",
          thrustArea: goal?.thrustArea ?? "",
          targetValue: goal?.targetValue ?? "",
          actualAchievement: update.actualAchievement,
          progressStatus: update.progressStatus,
          computedProgress: goal
            ? computeGoalProgress(goal, update.actualAchievement)
            : "Not available",
          checkInStatus: checkIn?.status ?? "draft",
        };
      }),
    [state.checkInGoalUpdates, state.checkIns, state.goalSheets, state.goals, state.users],
  );

  const getGoalSheetValidationResult = useCallback(
    (employeeId: string) => {
      const goalSheet = getGoalSheetByEmployeeFromState(state, employeeId);
      if (!goalSheet) return null;
      return validateGoalSheet(
        goalSheet,
        state.goals.filter((goal) => goal.goalSheetId === goalSheet.id),
      );
    },
    [state],
  );

  const getWeightageByEmployee = useCallback(
    (employeeId: string) => {
      const goalSheet = getGoalSheetByEmployeeFromState(state, employeeId);
      if (!goalSheet) return 0;
      return getGoalSheetTotalWeightage(
        state.goals.filter((goal) => goal.goalSheetId === goalSheet.id),
      );
    },
    [state],
  );

  const addGoal = useCallback((employeeId: string) => {
    dispatch({ type: "add-goal", employeeId });
  }, []);

  const removeGoal = useCallback((employeeId: string, goalId: string) => {
    dispatch({ type: "remove-goal", employeeId, goalId });
  }, []);

  const updateGoalField = useCallback(
    <K extends keyof Goal>(
      employeeId: string,
      goalId: string,
      field: K,
      value: Goal[K],
    ) => {
      dispatch({
        type: "update-goal-field",
        employeeId,
        goalId,
        field,
        value,
      });
    },
    [],
  );

  const saveGoalSheetDraft = useCallback(
    (employeeId: string, payload?: SaveGoalSheetPayload) => {
      dispatch({ type: "save-goal-sheet-draft", employeeId, payload });
    },
    [],
  );

  const submitGoalSheet = useCallback(
    (employeeId: string) => {
      const goalSheet = getGoalSheetByEmployeeFromState(state, employeeId);
      if (!goalSheet) {
        return {
          isValid: false,
          summary: ["Goal sheet is missing."],
          goalErrors: {},
        };
      }

      if (!["draft", "returned", "unlocked"].includes(goalSheet.status)) {
        return {
          isValid: false,
          summary: ["Only editable goal sheets can be submitted."],
          goalErrors: {},
        };
      }

      const result = getGoalSheetValidationResult(employeeId);
      if (!result || !result.isValid) {
        return (
          result ?? {
            isValid: false,
            summary: ["Goal sheet is missing."],
            goalErrors: {},
          }
        );
      }

      dispatch({ type: "submit-goal-sheet", employeeId });
      return result;
    },
    [getGoalSheetValidationResult, state],
  );

  const updateManagerReview = useCallback(
    (
      employeeId: string,
      updates: Array<Pick<Goal, "id" | "targetValue" | "weightage">>,
    ) => {
      dispatch({ type: "update-manager-review", employeeId, updates });
    },
    [],
  );

  const returnGoalSheet = useCallback((employeeId: string, comment?: string) => {
    dispatch({ type: "return-goal-sheet", employeeId, comment });
  }, []);

  const approveGoalSheet = useCallback((employeeId: string) => {
    const goalSheet = getGoalSheetByEmployeeFromState(state, employeeId);
    if (!goalSheet) {
      return {
        isValid: false,
        summary: ["Goal sheet is missing."],
        goalErrors: {},
      };
    }

    if (goalSheet.status !== "submitted") {
      return {
        isValid: false,
        summary: ["Only submitted goal sheets can be approved."],
        goalErrors: {},
      };
    }

    const result = getGoalSheetValidationResult(employeeId);
    if (!result || !result.isValid) {
      return (
        result ?? {
          isValid: false,
          summary: ["Goal sheet is missing."],
          goalErrors: {},
        }
      );
    }

    dispatch({ type: "approve-goal-sheet", employeeId });
    return result;
  }, [getGoalSheetValidationResult, state]);

  const saveCheckInDraft = useCallback(
    (employeeId: string, quarter: Quarter, updates: CheckInGoalUpdateDraft[]) => {
      dispatch({ type: "save-check-in-draft", employeeId, quarter, updates });
    },
    [],
  );

  const submitCheckIn = useCallback(
    (employeeId: string, quarter: Quarter) => {
      const goalSheet = getGoalSheetByEmployeeFromState(state, employeeId);
      if (!goalSheet || goalSheet.status !== "approved") {
        return {
          isValid: false,
          summary: ["Check-in is available only after goal sheet approval."],
        };
      }

      const checkIn = getCheckInByEmployeeAndQuarterFromState(state, employeeId, quarter);
      if (!checkIn) {
        return { isValid: false, summary: ["Save a draft before submitting."] };
      }

      const updates = state.checkInGoalUpdates.filter(
        (update) => update.checkInId === checkIn.id,
      );
      const hasMissingFields = updates.some(
        (update) => !update.actualAchievement.trim() || !update.progressStatus,
      );

      if (updates.length === 0 || hasMissingFields) {
        return {
          isValid: false,
          summary: ["Enter actual achievement and progress status for every goal."],
        };
      }

      dispatch({ type: "submit-check-in", employeeId, quarter });
      return { isValid: true, summary: [] };
    },
    [state],
  );

  const reviewCheckIn = useCallback(
    (employeeId: string, quarter: Quarter, managerComment?: string) => {
      dispatch({ type: "review-check-in", employeeId, quarter, managerComment });
    },
    [],
  );

  const unlockGoalSheet = useCallback((employeeId: string) => {
    dispatch({ type: "unlock-goal-sheet", employeeId });
  }, []);

  const createAuditLogEntry = useCallback(
    (payload: Omit<AuditLogEntry, "id" | "createdAt">) => {
      dispatch({ type: "create-audit-log-entry", payload });
    },
    [],
  );

  const value = useMemo<AppStoreContextValue>(
    () => ({
      state,
      currentUser,
      switchRole,
      getDefaultUserByRole,
      getGoalSheetByEmployee,
      getGoalsByGoalSheet,
      getManagerTeam,
      getSubmittedSheetsAwaitingManagerAction,
      getCheckInsByGoalSheet,
      getCheckInByEmployeeAndQuarter,
      getCheckInGoalUpdates,
      getManagerCheckInQueue,
      getComputedProgress,
      getAdminDashboardCounts,
      getReportRows,
      getGoalSheetValidationResult,
      getGoalSheetTotalWeightage: getWeightageByEmployee,
      addGoal,
      removeGoal,
      updateGoalField,
      saveGoalSheetDraft,
      submitGoalSheet,
      updateManagerReview,
      returnGoalSheet,
      approveGoalSheet,
      saveCheckInDraft,
      submitCheckIn,
      reviewCheckIn,
      unlockGoalSheet,
      createAuditLogEntry,
    }),
    [
      state,
      currentUser,
      switchRole,
      getDefaultUserByRole,
      getGoalSheetByEmployee,
      getGoalsByGoalSheet,
      getManagerTeam,
      getSubmittedSheetsAwaitingManagerAction,
      getCheckInsByGoalSheet,
      getCheckInByEmployeeAndQuarter,
      getCheckInGoalUpdates,
      getManagerCheckInQueue,
      getComputedProgress,
      getAdminDashboardCounts,
      getReportRows,
      getGoalSheetValidationResult,
      getWeightageByEmployee,
      addGoal,
      removeGoal,
      updateGoalField,
      saveGoalSheetDraft,
      submitGoalSheet,
      updateManagerReview,
      returnGoalSheet,
      approveGoalSheet,
      saveCheckInDraft,
      submitCheckIn,
      reviewCheckIn,
      unlockGoalSheet,
      createAuditLogEntry,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error("useAppStore must be used inside AppStoreProvider.");
  }
  return context;
}
