import type { GameState } from "../types";
import { marketSnapshot, realCompanies } from "../leaderboard";
import { ownsCompany, type CompanyOffer } from "./holdings";

/** Real companies from the market snapshot; loaded with the views that need them. */
export type Acquirable = (typeof realCompanies)[number];

/** Market value of a real company in euros. */
export const companyPrice = (c: Pick<Acquirable, "valueUsd">) =>
  Math.round(c.valueUsd / marketSnapshot.usdPerEur);

export const companyOffer = (c: Acquirable): CompanyOffer => ({
  id: c.id,
  name: c.name,
  sector: c.sector,
  price: companyPrice(c),
});

export function searchCompanies(query: string, limit = 8) {
  const q = query.trim().toLocaleLowerCase("de-DE");
  if (!q) return [];
  return realCompanies
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
  return realCompanies
    .filter((c) => !ownsCompany(s, c.id) && companyPrice(c) <= s.company.cash)
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .slice(0, limit);
}

/** The cheapest companies, as goals for studios without enough capital. */
export function cheapestCompanies(s: GameState, limit = 6) {
  return realCompanies
    .filter((c) => !ownsCompany(s, c.id))
    .sort((a, b) => a.valueUsd - b.valueUsd)
    .slice(0, limit);
}
