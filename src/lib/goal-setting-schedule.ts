export const GOAL_SETTING_WINDOW_LABEL = "1st May";

export function isGoalSettingWindowMonth(date = new Date()) {
  return date.getMonth() === 4;
}
