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
  getGoalSheetTotalWeightage,
  syncGoalTypeDefaults,
  validateGoalSheet,
} from "@/lib/goal-sheet";
import { seededGoals, seededGoalSheets, seededUsers } from "@/lib/seed-data";
import type { Goal, GoalSheet, GoalSheetValidationResult, Role, User } from "@/lib/types";

type AppState = {
  currentUserId: string | null;
  users: User[];
  goalSheets: GoalSheet[];
  goals: Goal[];
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
  approveGoalSheet: (employeeId: string) => void;
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
  | { type: "approve-goal-sheet"; employeeId: string };

const initialState: AppState = {
  currentUserId: null,
  users: seededUsers,
  goalSheets: seededGoalSheets,
  goals: seededGoals,
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

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "switch-role":
      return { ...state, currentUserId: action.userId };

    case "add-goal": {
      const goalSheet = getGoalSheetByEmployeeFromState(state, action.employeeId);
      if (!goalSheet || !["draft", "returned"].includes(goalSheet.status)) {
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
      if (!goalSheet || !["draft", "returned"].includes(goalSheet.status)) {
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

      const canEmployeeEdit = ["draft", "returned"].includes(goalSheet.status);
      const canManagerEdit = goalSheet.status === "submitted";

      return {
        ...state,
        goals: state.goals.map((goal) => {
          if (goal.id !== action.goalId) return goal;

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
      return {
        ...state,
        goalSheets: state.goalSheets.map((sheet) =>
          sheet.employeeId === action.employeeId
            ? updateGoalSheetTimestamp(sheet, {
                status:
                  sheet.status === "returned" ? "returned" : "draft",
                managerComment:
                  action.payload?.managerComment ?? sheet.managerComment,
              })
            : sheet,
        ),
      };
    }

    case "submit-goal-sheet": {
      return {
        ...state,
        goalSheets: state.goalSheets.map((sheet) =>
          sheet.employeeId === action.employeeId
            ? updateGoalSheetTimestamp(sheet, {
                status: "submitted",
              })
            : sheet,
        ),
      };
    }

    case "update-manager-review": {
      return {
        ...state,
        goals: state.goals.map((goal) => {
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
      return {
        ...state,
        goalSheets: state.goalSheets.map((sheet) =>
          sheet.employeeId === action.employeeId
            ? updateGoalSheetTimestamp(sheet, {
                status: "returned",
                managerComment: action.comment?.trim() || null,
              })
            : sheet,
        ),
      };
    }

    case "approve-goal-sheet": {
      return {
        ...state,
        goalSheets: state.goalSheets.map((sheet) =>
          sheet.employeeId === action.employeeId
            ? updateGoalSheetTimestamp(sheet, {
                status: "approved",
              })
            : sheet,
        ),
      };
    }

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
    [getGoalSheetValidationResult],
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
    dispatch({ type: "approve-goal-sheet", employeeId });
  }, []);

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
