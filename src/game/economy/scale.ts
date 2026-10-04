import type { GameState } from "../types";
import { BALANCE } from "../config/balance";

/**
 * Industry growth: the games market (and with it every price) grows by
 * BALANCE.marketGrowth per year. 1990 = 1.0.
 */
export function marketScale(s: Pick<GameState, "day">) {
  return BALANCE.marketGrowth ** Math.min(BALANCE.marketGrowthYears, s.day / 365);
}

/** Rounds to three significant digits so prices stay readable. */
export function nice(n: number) {
  if (n < 100) return Math.round(n);
  const step = 10 ** (Math.floor(Math.log10(n)) - 2);
  return Math.round(n / step) * step;
}

/** A base price in 1990 euros converted to today's market. */
export const scaled = (s: Pick<GameState, "day">, base: number) =>
  nice(base * marketScale(s));

export const campaignCost = (s: GameState) => scaled(s, BALANCE.campaignCost);
export const patchCost = (s: GameState) => scaled(s, BALANCE.patchCost);
export const loanAmount = (s: GameState) => scaled(s, BALANCE.loan);
export const loanLimit = (s: GameState) => scaled(s, BALANCE.loan * 2);
export const bankruptcyLimit = (s: GameState) =>
  -scaled(s, -BALANCE.bankruptcyLimit);
export const recruitBudgets = (s: GameState) =>
  BALANCE.recruitBudgets.map((b) => scaled(s, b));
