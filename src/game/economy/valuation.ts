import type { Company, GameState } from "../types";
import { FACILITIES, OFFICES } from "../config/offices";
import { scaled } from "./scale";

/** Investors pay this many years of operating profit for a studio. */
export const EARNINGS_MULTIPLE = 8;
/** Operating profit is averaged over the last two years. */
const EARNINGS_DAYS = 730;
/** Share of the purchase price that buildings and rooms keep as assets. */
const ASSET_SHARE = 0.6;

/** Marks part of this month's expenses as an investment in lasting assets. */
export function bookInvestment(s: GameState, amount: number) {
  const ledger = s.finances.at(-1)!;
  ledger.invest = (ledger.invest ?? 0) + amount;
}

/** Marks part of this month's revenue as income of the group's companies. */
export function bookGroupIncome(s: GameState, amount: number) {
  const ledger = s.finances.at(-1)!;
  ledger.group = (ledger.group ?? 0) + amount;
}

/**
 * Yearly operating profit of the studio itself: games, engines, contracts
 * and consoles minus running costs. Investments and group income are left
 * out because they are valued separately.
 */
export function operatingProfit(s: Pick<GameState, "day" | "finances">) {
  const records = s.finances.filter((f) => f.day > s.day - EARNINGS_DAYS);
  const profit = records.reduce(
    (n, f) => n + f.revenue - (f.group ?? 0) - (f.expenses - (f.invest ?? 0)),
    0,
  );
  // At least half a year as basis so one lucky month is not extrapolated.
  return (profit / Math.max(6, records.length)) * 12;
}

export interface StudioValue {
  /** Cash minus debt. */
  cash: number;
  /** Operating profit times the earnings multiple. */
  earnings: number;
  /** Fans and reputation. */
  brand: number;
  /** Office, rooms and hardware in development. */
  assets: number;
  total: number;
  /** Yearly operating profit the earnings value is based on. */
  profit: number;
}

/** Valuation of the studio: net cash, earning power, brand and assets. */
export function studioValue(s: GameState): StudioValue {
  const cash = s.company.cash - s.company.debt;
  const profit = operatingProfit(s);
  const earnings = Math.max(0, profit) * EARNINGS_MULTIPLE;
  const brand = scaled(s, s.company.fans * 12 + s.company.reputation * 900);
  const officeCost = OFFICES.slice(1, s.company.office + 1).reduce(
    (n, o) => n + o.cost,
    0,
  );
  const roomCost = s.facilities.reduce(
    (n, id) => n + (FACILITIES.find((f) => f.id === id)?.cost ?? 0),
    0,
  );
  const assets =
    scaled(s, (officeCost + roomCost) * ASSET_SHARE) +
    (s.consoleProject?.budget ?? 0);
  const total = Math.max(0, cash + earnings + brand + assets);
  return { cash, earnings, brand, assets, total, profit };
}

/** Rough value from the company alone, for places without the full state. */
export function studioValuation(company: Company) {
  return (
    Math.max(0, company.cash - company.debt) +
    company.fans * 12 +
    company.reputation * 900
  );
}
