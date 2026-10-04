import type { GameState } from "../types";
export function financialStats(state: GameState) {
  const current = state.finances.at(-1)!;
  const totals = state.finances.reduce(
    (sum, period) => ({
      revenue: sum.revenue + period.revenue,
      expenses: sum.expenses + period.expenses,
    }),
    { revenue: 0, expenses: 0 },
  );
  const completed = state.finances.slice(0, -1);
  return {
    capital: state.company.cash,
    totalRevenue: totals.revenue,
    totalProfit: totals.revenue - totals.expenses,
    totalExpenses: totals.expenses,
    periodRevenue: current.revenue,
    periodProfit: current.revenue - current.expenses,
    periodExpenses: current.expenses,
    periodDays: Math.min(
      30,
      Math.max(0, state.day - current.day + (current.day === 0 ? 0 : 1)),
    ),
    profitablePeriods: completed.filter(
      (period) => period.revenue > period.expenses,
    ).length,
    completedPeriods: completed.length,
  };
}

export interface YearlyFinance {
  year: number;
  revenue: number;
  expenses: number;
  profit: number;
  /** Cash at the end of the year (or today for the running year). */
  cash: number;
  running: boolean;
}

const yearOfDay = (day: number) =>
  new Date(Date.UTC(1990, 0, 1 + day)).getUTCFullYear();

/** 30-day periods grouped by the calendar year they start in. */
export function yearlyFinances(state: Pick<GameState, "finances" | "day">) {
  const years = new Map<number, YearlyFinance>();
  const current = yearOfDay(state.day);
  for (const f of state.finances) {
    const year = yearOfDay(f.day);
    const entry = years.get(year) ?? {
      year,
      revenue: 0,
      expenses: 0,
      profit: 0,
      cash: f.cash,
      running: year === current,
    };
    entry.revenue += f.revenue;
    entry.expenses += f.expenses;
    entry.profit = entry.revenue - entry.expenses;
    entry.cash = f.cash;
    years.set(year, entry);
  }
  return [...years.values()].sort((a, b) => a.year - b.year);
}

/** Months are readable up to three years; beyond that, years tell more. */
export const MONTHS_VISIBLE = 36;
export const prefersYears = (state: Pick<GameState, "finances">) =>
  state.finances.length > MONTHS_VISIBLE;
