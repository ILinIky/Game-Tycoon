import type { GameState, Holding } from "../types";
import { studioValuation } from "../economy/valuation";
import { notify } from "../events/events";
import { clamp, random } from "../utils";
import { scaled } from "../economy/scale";
import { techEffects } from "../research/research";
import { companyFactor } from "./marketCycle";

/** A company that can be bought, with its market value in euros. */
export interface CompanyOffer {
  id: string;
  name: string;
  sector: string;
  /** Snapshot value without market swings. */
  base: number;
  /** Price at today's market. */
  price: number;
}

/** Yearly profit as share of the market value, by sector. */
const EARNINGS_YIELD: Record<string, number> = {
  Technologie: 0.05,
  Finanzen: 0.09,
  Gesundheit: 0.06,
  "Konsum & Handel": 0.065,
  "Energie & Rohstoffe": 0.1,
  Industrie: 0.065,
  Mobilität: 0.08,
  Telekommunikation: 0.085,
  "Medien & Spiele": 0.06,
  Immobilien: 0.07,
  "Weitere Branchen": 0.07,
};

/** Sale proceeds as share of the current market value (fees). */
export const SALE_SHARE = 0.97;

/** Current market value of a holding. */
export const currentValue = (h: Pick<Holding, "id" | "value">, day: number) =>
  Math.round(h.value * companyFactor(h.id, day));

/** Stable per-company variation of ±20 %, so equal sectors differ a little. */
function variation(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return 0.8 + (hash % 401) / 1000;
}

/** Yearly profit yield of a company (e.g. 0.06 = 6 %). */
export const earningsYield = (id: string, sector: string) =>
  (EARNINGS_YIELD[sector] ?? 0.07) * variation(id);

/** Expected monthly profit of a company or holding. */
export function monthlyProfit(c: {
  id: string;
  sector: string;
  value: number;
}) {
  return Math.round((c.value * earningsYield(c.id, c.sector)) / 12);
}

export const holdingsOf = (s: Pick<GameState, "holdings">) => s.holdings ?? [];
export const ownsCompany = (s: Pick<GameState, "holdings">, id: string) =>
  holdingsOf(s).some((h) => h.id === id);

export function buyBlocker(s: GameState, c: CompanyOffer) {
  if (ownsCompany(s, c.id)) return "Gehört bereits zu deiner Group.";
  if (s.company.cash < c.price)
    return `Es fehlen ${(c.price - s.company.cash).toLocaleString("de-DE", { maximumFractionDigits: 0 })} €.`;
  return null;
}

/** Buys a real company at its market value; it joins the player's group. */
export function buyCompany(s: GameState, c: CompanyOffer) {
  if (!c.id || !(c.price > 0)) throw new Error("Unternehmen nicht gefunden.");
  const blocker = buyBlocker(s, c);
  if (blocker) throw new Error(blocker);
  // An investment is an asset swap, not an operating cost.
  s.company.cash -= c.price;
  const holding: Holding = {
    id: c.id,
    name: c.name,
    sector: c.sector,
    value: c.base,
    paid: c.price,
    since: s.day,
    earned: 0,
  };
  s.holdings = [...holdingsOf(s), holding];
  s.company.reputation = clamp(s.company.reputation + 1);
  notify(
    s,
    "Übernahme abgeschlossen",
    `${c.name} gehört jetzt zur ${groupName(s.company.name)} und bringt etwa ${monthlyProfit({ ...holding, value: c.price }).toLocaleString("de-DE")} € Gewinn pro Monat.`,
    "success",
  );
}

/** Sells a company at today's market value minus fees. */
export function sellCompany(s: GameState, id: string) {
  const h = holdingsOf(s).find((x) => x.id === id);
  if (!h) throw new Error("Diese Beteiligung gehört nicht zu deiner Group.");
  const proceeds = Math.round(currentValue(h, s.day) * SALE_SHARE);
  s.company.cash += proceeds;
  s.holdings = holdingsOf(s).filter((x) => x.id !== id);
  notify(
    s,
    "Beteiligung verkauft",
    `${h.name} wurde für ${proceeds.toLocaleString("de-DE")} € verkauft.`,
  );
}

/** Profit bonus of subsidiaries and holdings from research. */
export const incomeBonus = (s: GameState) => 1 + techEffects(s).income;

/** Pays the monthly profit of all holdings (±15 % per month); returns the total. */
export function payHoldings(s: GameState) {
  let total = 0;
  for (const h of holdingsOf(s)) {
    const income = Math.round(
      monthlyProfit({ ...h, value: currentValue(h, s.day) }) *
        incomeBonus(s) *
        (0.85 + random(s) * 0.3),
    );
    h.earned += income;
    h.lastIncome = income;
    total += income;
  }
  if (!total) return 0;
  s.company.cash += total;
  s.finances.at(-1)!.revenue += total;
  return total;
}

export const groupName = (studio: string) => `${studio} Group`;

/** Value of an acquired rival studio: ten years of profit. */
export const subsidiaryValue = (s: Pick<GameState, "day">, income: number) =>
  scaled(s, income) * 12 * 10;

/** Key figures of the player's group: studio, rival studios and holdings. */
export function groupStats(s: GameState) {
  const holdings = holdingsOf(s);
  const studio = studioValuation(s.company);
  const holdingsValue = holdings.reduce(
    (n, h) => n + currentValue(h, s.day),
    0,
  );
  const subsidiariesValue = s.subsidiaries.reduce(
    (n, x) => n + subsidiaryValue(s, x.income),
    0,
  );
  const bonus = incomeBonus(s);
  const holdingsIncome = Math.round(
    holdings.reduce(
      (n, h) => n + monthlyProfit({ ...h, value: currentValue(h, s.day) }),
      0,
    ) * bonus,
  );
  const subsidiariesIncome = Math.round(
    s.subsidiaries.reduce((n, x) => n + scaled(s, x.income), 0) * bonus,
  );
  const value = studio + holdingsValue + subsidiariesValue;
  // A listed group is valued at its market capitalisation.
  const marketCap = s.stock ? Math.round(s.stock.price * s.stock.shares) : null;
  return {
    name: groupName(s.company.name),
    active: holdings.length + s.subsidiaries.length > 0 || !!s.stock,
    studio,
    holdingsValue,
    subsidiariesValue,
    /** Fundamental value of everything the group owns. */
    fundamental: value,
    marketCap,
    value: marketCap ?? value,
    holdingsIncome,
    subsidiariesIncome,
    monthlyIncome: holdingsIncome + subsidiariesIncome,
    earned: holdings.reduce((n, h) => n + h.earned, 0),
    companies: holdings.length + s.subsidiaries.length,
  };
}
