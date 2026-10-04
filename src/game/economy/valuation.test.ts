import { describe, expect, it } from "vitest";
import { initialState } from "../initial";
import type { GameState } from "../types";
import { EARNINGS_MULTIPLE, operatingProfit, studioValue } from "./valuation";
import { moveOffice } from "../office/office";
import { paySubsidiaries } from "../market/rivals";

function studio(): GameState {
  const s = initialState();
  s.company.founded = true;
  s.day = 800;
  // Two years of steady business: 1 Mio. revenue, 0,6 Mio. costs per month.
  s.finances = Array.from({ length: 24 }, (_, i) => ({
    day: 800 - (23 - i) * 30,
    revenue: 1_000_000,
    expenses: 600_000,
    cash: 0,
  }));
  return s;
}

describe("Firmenwert", () => {
  it("bewertet den Betriebsgewinn mit einem Multiplikator", () => {
    const s = studio();
    expect(operatingProfit(s)).toBeCloseTo(4_800_000, -3);
    const v = studioValue(s);
    expect(v.earnings).toBeCloseTo(4_800_000 * EARNINGS_MULTIPLE, -4);
    expect(v.total).toBe(v.cash + v.earnings + v.brand + v.assets);
  });
  it("zählt Investitionen als Anlage statt als Verlust", () => {
    const s = studio();
    s.company.cash = 10_000_000;
    s.company.office = 0;
    const before = studioValue(s);
    moveOffice(s);
    const after = studioValue(s);
    expect(after.earnings).toBe(before.earnings);
    expect(after.assets).toBeGreaterThan(before.assets);
    expect(after.total).toBeGreaterThan(before.total * 0.99);
  });
  it("rechnet Erträge der Group nicht doppelt", () => {
    const s = studio();
    s.subsidiaries = [{ name: "Test", since: 0, income: 50_000, strength: 4 }];
    const before = operatingProfit(s);
    paySubsidiaries(s);
    expect(operatingProfit(s)).toBeCloseTo(before, 0);
  });
  it("zieht Schulden vom Wert ab", () => {
    const s = studio();
    s.company.cash = 1_000_000;
    s.company.debt = 3_000_000;
    expect(studioValue(s).cash).toBe(-2_000_000);
  });
});
