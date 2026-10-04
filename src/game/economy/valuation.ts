import type { Company } from "../types";

/** The game's existing valuation model, shared by statistics and the ranking. */
export function studioValuation(company: Company) {
  return (
    Math.max(0, company.cash - company.debt) +
    company.fans * 12 +
    company.reputation * 900
  );
}
