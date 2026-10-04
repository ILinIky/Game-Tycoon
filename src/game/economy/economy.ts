import { dlcRevival, effectivePrice, priceFactor } from "../projects/pricing";
import { seriesSales } from "../projects/franchise";
import { BALANCE, SIZES } from "../config/balance";
import { gameReach } from "../market/platforms";
import type { GameState } from "../types";
import { recordSales, salesFade, salesLifetime } from "./salesHistory";
import { lab, techEffects } from "../research/research";
import { marketScale, scaled } from "./scale";
import { facilityEffects, facilityUpkeep, officeRent } from "../office/office";
import { featureEffects } from "../config/features";
export function monthlyCosts(s: GameState) {
  return (
    officeRent(s) +
    s.employees.reduce((n, e) => n + e.salary, 0) +
    s.employees.length * scaled(s, BALANCE.softwarePerEmployee) +
    scaled(s, lab(s).upkeep) +
    facilityUpkeep(s) +
    s.company.debt * BALANCE.loanInterest
  );
}
export function sales(s: GameState) {
  let revenue = 0;
  const tech = techEffects(s);
  const facility = facilityEffects(s);
  const market = marketScale(s);
  // Fans help logarithmically so big studios do not snowball endlessly.
  const fanFactor = 1 + Math.log10(1 + s.company.fans / 500) * 0.2;
  for (const g of s.games) {
    const age = s.day - g.releasedDay;
    if (age < 1 || age > salesLifetime(g)) continue;
    const reach = gameReach(g, s.day);
    const decay =
      Math.exp(-age / ((g.score > 7.5 ? 95 : 48) * (1 + tech.longTail))) +
      0.025 +
      dlcRevival(g, s.day);
    const demand =
      BALANCE.salesBase *
      market *
      (SIZES[g.size]?.sales ?? 1) *
      Math.pow(g.score / 5, 2) *
      reach *
      (s.market.popularity[g.genre] / 65) *
      (1 + g.hype / 100) *
      fanFactor *
      (1 + s.company.reputation / 250);
    const competition =
      1 /
      (1 +
        Math.min(
          BALANCE.competitionCap,
          s.market.competitors.reduce((n, c) => n + c.releases, 0),
        ) *
          0.012);
    const units = Math.max(
      0,
      Math.floor(
        demand *
          decay *
          competition *
          priceFactor(g, s.day) *
          seriesSales(g) *
          salesFade(g, s.day) *
          (g.patched ? 1.1 : 1) *
          (1 + tech.sales + facility.sales) *
          featureEffects(g).sales,
      ),
    );
    const earned =
      units *
      effectivePrice(g, s.day) *
      0.7 *
      (1 + tech.revenue) *
      (1 - (g.publisher?.share ?? 0));
    recordSales(g, s.day, units, earned);
    g.units += units;
    g.revenue += earned;
    revenue += earned;
    s.company.fans = Math.max(
      0,
      s.company.fans + Math.floor(units * (g.score - 4.8) * 0.018),
    );
  }
  return revenue;
}
