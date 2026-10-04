import { describe, expect, it } from "vitest";
import { initialState } from "./initial";
import {
  buildRanking,
  formatRankingValue,
  marketSnapshot,
  rankingValue,
  realCompanies,
  estimatedWorldRank,
  formatWorldRank,
  worldNeighborhood,
  WORLD_COMPANY_COUNT,
  WORLD_MILESTONES,
} from "./leaderboard";
import { studioValuation } from "./economy/valuation";

describe("Weltvergleich", () => {
  it("liefert eine eindeutige, gültige Datenbasis aus vielen Branchen", () => {
    expect(realCompanies.length).toBeGreaterThanOrEqual(1000);
    expect(new Set(realCompanies.map((entry) => entry.id)).size).toBe(
      realCompanies.length,
    );
    expect(
      new Set(realCompanies.map((entry) => entry.sector)).size,
    ).toBeGreaterThanOrEqual(10);
    expect(
      new Set(realCompanies.map((entry) => entry.country)).size,
    ).toBeGreaterThan(15);
    for (const entry of realCompanies) {
      expect(Number.isFinite(entry.valueUsd) && entry.valueUsd > 0).toBe(true);
      expect(entry.name).toBe(entry.name.trim());
      expect(entry.sourceUrl).toMatch(/^https:\/\/companiesmarketcap\.com\//);
    }
  });
  it("setzt ein neues Studio ans Ende und verändert den Spielstand nicht", () => {
    const state = initialState();
    const before = JSON.stringify(state);
    const ranking = buildRanking(state.company);
    expect(ranking).toHaveLength(realCompanies.length + 1);
    const player = ranking.at(-1)!;
    expect(player.player).toBe(true);
    expect(player.rank).toBe(ranking.length);
    expect(rankingValue(player.valueUsd, "EUR")).toBeCloseTo(
      studioValuation(state.company),
    );
    expect(JSON.stringify(state)).toBe(before);
  });
  it("verschiebt den Spieler durch echten Fortschritt und teilt gleiche Werte", () => {
    const company = initialState().company;
    const target = realCompanies.find((entry) => entry.name === "Nintendo")!;
    const targetEur = target.valueUsd / marketSnapshot.usdPerEur;
    company.cash = targetEur + 1;
    const ranking = buildRanking(company);
    const player = ranking.find((entry) => entry.player)!;
    expect(player.rank).toBeLessThan(
      ranking.find((entry) => entry.id === target.id)!.rank,
    );
    company.cash = targetEur;
    const tied = buildRanking(company);
    expect(tied.find((entry) => entry.player)!.rank).toBe(
      tied.find((entry) => entry.id === target.id)!.rank,
    );
    company.cash = 10e12;
    expect(buildRanking(company)[0].player).toBe(true);
  });
  it("zeigt Milliarden und Billionen auf Deutsch und rechnet Währungen richtig", () => {
    expect(formatRankingValue(5e12, "USD")).toBe("5 Bio. $");
    expect(formatRankingValue(3e9, "USD")).toBe("3 Mrd. $");
    expect(formatRankingValue(20e6, "USD")).toBe("20 Mio. $");
    expect(rankingValue(112.25, "EUR")).toBeCloseTo(100);
    expect(rankingValue(112.25, "USD")).toBe(112.25);
  });
  it("verwendet dasselbe Bewertungsmodell inklusive Schulden wie die Statistik", () => {
    const company = initialState().company;
    company.cash = 30_000;
    company.debt = 40_000;
    company.fans = 120;
    company.reputation = 3;
    expect(studioValuation(company)).toBe(120 * 12 + 3 * 900);
  });
  it("berechnet einen monotonen Modellrang mit Millionen Unternehmen", () => {
    const ranks = [0, 10_000, 50_000, 100_000, 1e6, 1e9, 1e12, 10e12].map(
      (eur) => estimatedWorldRank(eur * marketSnapshot.usdPerEur),
    );
    expect(ranks[0]).toBe(WORLD_COMPANY_COUNT);
    expect(ranks[2]).toBeGreaterThan(1e6);
    expect(ranks.at(-1)).toBe(1);
    for (let i = 1; i < ranks.length; i++)
      expect(ranks[i]).toBeLessThanOrEqual(ranks[i - 1]);
    expect(formatWorldRank(17_834_239)).toBe("≈ #17.800.000");
  });
  it("stellt Modellstufen eindeutig dar und hält Wachstumsziele fest", () => {
    const company = initialState().company;
    const nearby = worldNeighborhood(company);
    expect(nearby.filter((entry) => entry.player)).toHaveLength(1);
    for (const entry of nearby.filter((entry) => !entry.player)) {
      expect(entry.model).toBe(true);
      expect(entry.sourceUrl).toBeUndefined();
      expect(entry.rank).toBe(estimatedWorldRank(entry.valueUsd));
    }
    const next = (cash: number) => WORLD_MILESTONES.find(([eur]) => eur > cash);
    expect(next(50_000)).toEqual(next(60_000));
    expect(next(75_000)).not.toEqual(next(60_000));
    expect(
      realCompanies.find((entry) => entry.ticker === "BMW.DE")?.sector,
    ).toBe("Mobilität");
    expect(realCompanies.find((entry) => entry.ticker === "NKE")?.sector).toBe(
      "Konsum & Handel",
    );
  });
});
