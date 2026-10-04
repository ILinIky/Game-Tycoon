import type { GameState } from "../types";
import { marketSnapshot, worldCompanies } from "../leaderboard";
import { holdingsOf, ownsCompany, type CompanyOffer } from "./holdings";
import { worldSeed } from "./marketCycle";

/** A real company of the game world with today's price and mergers applied. */
export type Acquirable = ReturnType<typeof worldCompanies>[number];

let cached: { key: string; list: Acquirable[] } | null = null;

/** Today's market of real companies (mergers removed, prices moved). */
export function catalog(s: GameState) {
  const owned = holdingsOf(s).map((h) => h.id);
  const seed = worldSeed(s);
  const key = `${s.day}:${seed}:${owned.join(",")}`;
  if (cached?.key !== key)
    cached = { key, list: worldCompanies({ day: s.day, seed, owned }) };
  return cached.list;
}

const eur = (usd: number) => Math.round(usd / marketSnapshot.usdPerEur);

/** Current market value of a company in euros. */
export const companyPrice = (c: Pick<Acquirable, "valueUsd">) =>
  eur(c.valueUsd);

/** Offer at today's share price; `base` is the value without market swings. */
export const companyOffer = (c: Acquirable): CompanyOffer => ({
  id: c.id,
  name: c.name,
  sector: c.sector,
  base: eur(c.baseUsd),
  price: eur(c.valueUsd),
});

export function searchCompanies(s: GameState, query: string, limit = 8) {
  const q = query.trim().toLocaleLowerCase("de-DE");
  if (!q) return [];
  return catalog(s)
    .filter((c) =>
      `${c.name} ${c.ticker}`.toLocaleLowerCase("de-DE").includes(q),
    )
    .sort(
      (a, b) =>
        Number(!a.name.toLocaleLowerCase("de-DE").startsWith(q)) -
          Number(!b.name.toLocaleLowerCase("de-DE").startsWith(q)) ||
        b.valueUsd - a.valueUsd,
    )
    .slice(0, limit);
}

/** The most valuable companies the studio can afford right now. */
export function affordableCompanies(s: GameState, limit = 6) {
  return catalog(s)
    .filter((c) => !ownsCompany(s, c.id) && companyPrice(c) <= s.company.cash)
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .slice(0, limit);
}

/** The cheapest companies, as goals for studios without enough capital. */
export function cheapestCompanies(s: GameState, limit = 6) {
  return catalog(s)
    .filter((c) => !ownsCompany(s, c.id))
    .sort((a, b) => a.valueUsd - b.valueUsd)
    .slice(0, limit);
}
