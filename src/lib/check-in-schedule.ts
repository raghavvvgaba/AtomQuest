import type { Quarter } from "@/lib/types";

export const QUARTER_WINDOWS: Record<
  Quarter,
  { label: string; months: number[] }
> = {
  Q1: { label: "July", months: [6] },
  Q2: { label: "October", months: [9] },
  Q3: { label: "January", months: [0] },
  Q4: { label: "March / April", months: [2, 3] },
};

export function getQuarterWindow(quarter: Quarter) {
  return QUARTER_WINDOWS[quarter];
}

export function isQuarterWindowOpen(quarter: Quarter, date = new Date()) {
  return QUARTER_WINDOWS[quarter].months.includes(date.getMonth());
}

export function getActiveQuarter(date = new Date()): Quarter | null {
  const month = date.getMonth();
  const entry = Object.entries(QUARTER_WINDOWS).find(([, window]) =>
    window.months.includes(month),
  );

  return (entry?.[0] as Quarter | undefined) ?? null;
}

export function getNextQuarterWindow(date = new Date()): {
  quarter: Quarter;
  label: string;
} {
  const month = date.getMonth();
  const windows = [
    { quarter: "Q3" as const, month: 0 },
    { quarter: "Q4" as const, month: 2 },
    { quarter: "Q1" as const, month: 6 },
    { quarter: "Q2" as const, month: 9 },
  ];
  const next = windows.find((window) => month < window.month) ?? windows[0];
  const window = QUARTER_WINDOWS[next.quarter];

  return {
    quarter: next.quarter,
    label: window.label,
  };
}
