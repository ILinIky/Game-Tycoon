import type { GameState, ReleasedGame, StockState } from "../types";
import { groupStats, holdingsOf, type CompanyOffer } from "./holdings";
import { marketIndex } from "./marketCycle";
import { notify } from "../events/events";
import { clamp, random } from "../utils";
import { SIZES } from "../config/balance";
import { scaled } from "../economy/scale";

/** Shares the founder holds before the IPO. */
export const FOUNDER_SHARES = 100_000_000;
/** Minimum office tier and fundamental value (in 1990 euros) for an IPO. */
export const IPO_OFFICE = 3;
export const IPO_VALUE = 40_000_000;
/** Shares that can be offered at the IPO. */
export const IPO_FLOATS = [0.15, 0.25, 0.4];
/** Investors expect this revenue growth per quarter. */
export const QUARTER_GROWTH = 1.04;
export const QUARTER_DAYS = 90;
/** Bank and listing fees on new shares. */
const FEES = 0.05;
/** Share of the capital moved by one buyback or capital increase. */
export const STOCK_STEP = 0.05;

export const isListed = (s: Pick<GameState, "stock">) => !!s.stock;
export const ipoMinimum = (s: Pick<GameState, "day">) => scaled(s, IPO_VALUE);

export function ipoBlocker(s: GameState) {
  if (s.stock) return "Deine Group ist bereits an der Börse.";
  if (s.company.office < IPO_OFFICE)
    return "Ein Börsengang braucht mindestens den Studio-Campus.";
  if (groupStats(s).fundamental < ipoMinimum(s))
    return `Dein Firmenwert muss mindestens ${ipoMinimum(s).toLocaleString("de-DE")} € erreichen.`;
  return null;
}

/** Revenue of the last `days` days from the monthly ledger. */
function revenueSince(s: GameState, day: number) {
  return s.finances
    .filter((f) => f.day >= day)
    .reduce((n, f) => n + f.revenue, 0);
}

/** Market capitalisation implied by fundamentals, mood and market cycle. */
export function fairMarketCap(
  s: GameState,
  sentiment = s.stock?.sentiment ?? 1,
) {
  return groupStats(s).fundamental * sentiment * marketIndex(s.day);
}

/** Lists the group: new shares are sold to investors for fresh capital. */
export function goPublic(s: GameState, float: number) {
  const blocker = ipoBlocker(s);
  if (blocker) throw new Error(blocker);
  if (!IPO_FLOATS.includes(float)) throw new Error("Ungültiger Börsenanteil.");
  const preMoney = fairMarketCap(s, 1);
  const price = preMoney / FOUNDER_SHARES;
  const issued = Math.round((FOUNDER_SHARES * float) / (1 - float));
  const proceeds = Math.round(issued * price * (1 - FEES));
  s.company.cash += proceeds;
  const quarterRevenue = revenueSince(s, s.day - QUARTER_DAYS);
  s.stock = {
    shares: FOUNDER_SHARES + issued,
    owned: FOUNDER_SHARES,
    rivalStake: 0,
    price,
    ipoDay: s.day,
    ipoPrice: price,
    sentiment: 1.05,
    history: [{ day: s.day, price }],
    quarterStart: s.day,
    target: Math.max(1, quarterRevenue * QUARTER_GROWTH),
  };
  s.company.reputation = clamp(s.company.reputation + 5);
  notify(
    s,
    "Börsengang geglückt",
    `${groupStats(s).name} ist an der Börse. ${Math.round(float * 100)} % der Anteile bringen ${proceeds.toLocaleString("de-DE")} € frisches Kapital. Die Aktionäre erwarten jedes Quartal ${Math.round((QUARTER_GROWTH - 1) * 100)} % mehr Umsatz.`,
    "success",
  );
}

export const ownership = (stock: StockState) => stock.owned / stock.shares;
export const marketCap = (stock: StockState) => stock.price * stock.shares;

export function buybackCost(s: GameState) {
  const stock = s.stock!;
  return Math.round(stock.shares * STOCK_STEP * stock.price * 1.04);
}

/** Buys back 5 % of the shares; the founder's stake grows. */
export function buyBack(s: GameState) {
  const stock = s.stock;
  if (!stock) throw new Error("Deine Group ist nicht börsennotiert.");
  const free = stock.shares - stock.owned - stock.rivalStake;
  const amount = Math.min(Math.round(stock.shares * STOCK_STEP), free);
  if (amount <= 0) throw new Error("Es gibt keine freien Aktien mehr.");
  const cost = Math.round(amount * stock.price * 1.04);
  if (s.company.cash < cost) throw new Error("Für den Rückkauf fehlt Kapital.");
  s.company.cash -= cost;
  stock.shares -= amount;
  stock.sentiment = clamp(stock.sentiment + 0.03, 0.5, 1.8);
  notify(
    s,
    "Aktienrückkauf",
    `Du hältst jetzt ${Math.round(ownership(stock) * 100)} % deiner Group.`,
    "success",
  );
}

/** Issues 5 % new shares for fresh capital; the stake is diluted. */
export function issueShares(s: GameState) {
  const stock = s.stock;
  if (!stock) throw new Error("Deine Group ist nicht börsennotiert.");
  const amount = Math.round(stock.shares * STOCK_STEP);
  if (stock.owned / (stock.shares + amount) < 0.5)
    throw new Error("Damit würdest du die Mehrheit an deiner Group verlieren.");
  const proceeds = Math.round(amount * stock.price * (1 - FEES));
  stock.shares += amount;
  s.company.cash += proceeds;
  stock.sentiment = clamp(stock.sentiment - 0.03, 0.5, 1.8);
  notify(
    s,
    "Kapitalerhöhung",
    `${proceeds.toLocaleString("de-DE")} € frisches Kapital. Dein Anteil: ${Math.round(ownership(stock) * 100)} %.`,
    "success",
  );
}

export const issueProceeds = (s: GameState) =>
  s.stock
    ? Math.round(s.stock.shares * STOCK_STEP * s.stock.price * (1 - FEES))
    : 0;

/** Investors react to every release of the group. */
export function stockOnRelease(
  s: GameState,
  g: Pick<ReleasedGame, "score" | "size">,
) {
  if (!s.stock) return;
  const weight = SIZES[g.size]?.fame ?? 1;
  s.stock.sentiment = clamp(
    s.stock.sentiment + (g.score - 7) * 0.025 * weight,
    0.5,
    1.8,
  );
}

/** Daily price, weekly history and quarterly results. */
export function stockTick(s: GameState) {
  const stock = s.stock;
  if (!stock) return;
  // Mood slowly returns to neutral and wobbles a little.
  stock.sentiment = clamp(
    stock.sentiment + (1 - stock.sentiment) * 0.004 + (random(s) - 0.5) * 0.012,
    0.5,
    1.8,
  );
  stock.price = Math.max(0.01, fairMarketCap(s) / stock.shares);
  if (s.day % 7 === 0) {
    stock.history.push({ day: s.day, price: stock.price });
    stock.history = stock.history.slice(-260);
  }
  if (s.day - stock.quarterStart >= QUARTER_DAYS) {
    const revenue = revenueSince(s, stock.quarterStart);
    const beat = revenue >= stock.target;
    const ratio = revenue / Math.max(1, stock.target);
    stock.sentiment = clamp(
      stock.sentiment +
        (beat
          ? 0.05 + Math.min(0.1, (ratio - 1) * 0.2)
          : -0.06 - Math.min(0.12, (1 - ratio) * 0.3)),
      0.5,
      1.8,
    );
    stock.lastQuarter = { day: s.day, revenue, target: stock.target };
    stock.quarterStart = s.day;
    // Investors expect growth from what was actually achieved.
    stock.target = Math.max(1, revenue) * QUARTER_GROWTH;
    if (!beat) s.company.reputation = clamp(s.company.reputation - 1);
    notify(
      s,
      beat ? "Quartalszahlen über den Erwartungen" : "Aktionäre enttäuscht",
      beat
        ? `Umsatz ${Math.round(revenue).toLocaleString("de-DE")} € (Ziel ${Math.round(stock.lastQuarter.target).toLocaleString("de-DE")} €). Der Kurs zieht an.`
        : `Umsatz ${Math.round(revenue).toLocaleString("de-DE")} € statt ${Math.round(stock.lastQuarter.target).toLocaleString("de-DE")} €. Der Kurs gibt nach.`,
      beat ? "success" : "warning",
    );
  }
}

/** Price change since the IPO in percent. */
export const sinceIpo = (stock: StockState) =>
  ((stock.price - stock.ipoPrice) / stock.ipoPrice) * 100;

/** New shares needed to pay for a company in a share swap. */
export const swapShares = (s: GameState, price: number) =>
  s.stock ? Math.ceil(price / s.stock.price) : 0;

export function swapBlocker(s: GameState, c: CompanyOffer) {
  const stock = s.stock;
  if (!stock) return "Fusionen per Aktientausch gibt es nach dem Börsengang.";
  if (holdingsOf(s).some((h) => h.id === c.id))
    return "Gehört bereits zu deiner Group.";
  const shares = swapShares(s, c.price);
  if (stock.owned / (stock.shares + shares) < 0.5)
    return "Du würdest die Mehrheit an deiner Group verlieren.";
  return null;
}

/**
 * Merges a company into the group by issuing new shares instead of paying
 * cash. The founder's stake is diluted accordingly.
 */
export function mergeCompany(s: GameState, c: CompanyOffer) {
  const blocker = swapBlocker(s, c);
  if (blocker) throw new Error(blocker);
  const stock = s.stock!;
  const shares = swapShares(s, c.price);
  stock.shares += shares;
  s.holdings = [
    ...holdingsOf(s),
    {
      id: c.id,
      name: c.name,
      sector: c.sector,
      value: c.base,
      paid: c.price,
      since: s.day,
      earned: 0,
      merged: true,
    },
  ];
  s.company.reputation = clamp(s.company.reputation + 2);
  notify(
    s,
    "Fusion abgeschlossen",
    `${c.name} gehört per Aktientausch zur ${groupStats(s).name}. Dein Anteil: ${Math.round(ownership(stock) * 100)} %.`,
    "success",
  );
}
