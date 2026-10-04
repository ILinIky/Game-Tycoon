import { describe, expect, it } from "vitest";
import {
  financialStats,
  prefersYears,
  yearlyFinances,
} from "./financialStats";
import { initialState } from "../initial";
import type { FinanceRecord } from "../types";

function history(periods: number): FinanceRecord[] {
  return Array.from({ length: periods }, (_, i) => ({
    day: i * 30,
    revenue: 1000 + i,
    expenses: 800,
    cash: 50000 + i * 200,
  }));
}

describe("Finanzkennzahlen", () => {
  it("summiert Umsatz und Gewinn über alle Perioden", () => {
    const s = initialState();
    s.finances = history(5);
    s.day = 4 * 30 + 10;
    const stats = financialStats(s);
    const revenue = s.finances.reduce((n, f) => n + f.revenue, 0);
    expect(stats.totalRevenue).toBe(revenue);
    expect(stats.totalProfit).toBe(revenue - 5 * 800);
    expect(stats.capital).toBe(s.company.cash);
  });

  it("zählt die Tage der offenen Periode und ihre Werte", () => {
    const s = initialState();
    s.finances = history(3);
    s.day = 2 * 30 + 7;
    const stats = financialStats(s);
    expect(stats.periodDays).toBe(8);
    expect(stats.periodRevenue).toBe(1002);
    expect(stats.periodProfit).toBe(202);
  });

  it("wertet nur abgeschlossene Perioden als profitabel", () => {
    const s = initialState();
    s.finances = history(4);
    s.finances[1].expenses = 5000;
    const stats = financialStats(s);
    expect(stats.completedPeriods).toBe(3);
    expect(stats.profitablePeriods).toBe(2);
  });
});

describe("Finanzen nach Jahren", () => {
  it("fasst Perioden nach Kalenderjahr zusammen", () => {
    const finances = history(30);
    const years = yearlyFinances({ finances, day: 29 * 30 + 5 });
    expect(years.map((y) => y.year)).toEqual([1990, 1991, 1992]);
    const first = years[0];
    const in1990 = finances.filter((f) => f.day < 365);
    expect(first.revenue).toBe(in1990.reduce((n, f) => n + f.revenue, 0));
    expect(first.profit).toBe(first.revenue - first.expenses);
    expect(first.cash).toBe(in1990.at(-1)!.cash);
    expect(years.at(-1)!.running).toBe(true);
    expect(first.running).toBe(false);
  });

  it("wechselt nach drei Jahren automatisch auf die Jahresansicht", () => {
    expect(prefersYears({ finances: history(36) })).toBe(false);
    expect(prefersYears({ finances: history(37) })).toBe(true);
  });
});
