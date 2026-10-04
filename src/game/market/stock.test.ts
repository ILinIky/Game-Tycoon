import { describe, expect, it } from "vitest";
import { initialState } from "../initial";
import { tick } from "../simulation/tick";
import type { GameState } from "../types";
import {
  buyBack,
  goPublic,
  ipoBlocker,
  issueShares,
  mergeCompany,
  ownership,
  QUARTER_DAYS,
  stockOnRelease,
  stockTick,
} from "./stock";
import {
  buyOutRival,
  hostileBid,
  payRivalDividend,
  resolveTakeover,
  rivalsCopy,
  releaseRivalGame,
} from "./rivals";
import { cheapestCompanies, companyOffer } from "./companyMarket";

function rich(): GameState {
  const s = initialState();
  s.company.founded = true;
  s.company.office = 3;
  s.company.cash = 5e7;
  return s;
}

describe("Börsengang und Aktie", () => {
  it("braucht Campus und Firmenwert", () => {
    const s = initialState();
    s.company.founded = true;
    expect(ipoBlocker(s)).toBeTruthy();
    expect(ipoBlocker(rich())).toBeNull();
  });
  it("bringt Kapital und verteilt Aktien", () => {
    const s = rich();
    const cash = s.company.cash;
    goPublic(s, 0.25);
    expect(s.stock).toBeTruthy();
    expect(s.company.cash).toBeGreaterThan(cash * 1.2);
    expect(ownership(s.stock!)).toBeCloseTo(0.75, 2);
    expect(() => goPublic(s, 0.25)).toThrow();
  });
  it("reagiert auf Releases und Quartalszahlen", () => {
    const s = rich();
    goPublic(s, 0.25);
    const mood = s.stock!.sentiment;
    stockOnRelease(s, { score: 9.5, size: "AAA" });
    expect(s.stock!.sentiment).toBeGreaterThan(mood);
    const before = s.stock!.sentiment;
    s.day += QUARTER_DAYS;
    stockTick(s);
    // No revenue at all misses the target.
    expect(s.stock!.sentiment).toBeLessThan(before);
    expect(s.stock!.lastQuarter).toBeTruthy();
    expect(s.events[0].title).toBe("Aktionäre enttäuscht");
  });
  it("kauft Aktien zurück und erhöht das Kapital", () => {
    const s = rich();
    goPublic(s, 0.25);
    const stake = ownership(s.stock!);
    buyBack(s);
    expect(ownership(s.stock!)).toBeGreaterThan(stake);
    const cash = s.company.cash;
    issueShares(s);
    expect(s.company.cash).toBeGreaterThan(cash);
  });
  it("fusioniert per Aktientausch und verwässert den Anteil", () => {
    const s = rich();
    goPublic(s, 0.15);
    const stake = ownership(s.stock!);
    const offer = companyOffer(cheapestCompanies(s, 1)[0]);
    const cash = s.company.cash;
    mergeCompany(s, offer);
    expect(s.holdings![0].merged).toBe(true);
    expect(s.company.cash).toBe(cash);
    expect(ownership(s.stock!)).toBeLessThan(stake);
  });
  it("aktualisiert den Kurs täglich im Spiel", () => {
    let s = rich();
    goPublic(s, 0.25);
    for (let i = 0; i < 14; i++) s = tick(s);
    expect(s.stock!.history.length).toBeGreaterThan(1);
  });
});

describe("Aktive Konkurrenz", () => {
  it("kopiert erfolgreiche Genres", () => {
    const s = rich();
    rivalsCopy(s, "Horror", "Night Hall");
    expect(s.market.trend?.genre).toBe("Horror");
    const studio = s.market.competitors.find((c) =>
      s.market.trend!.studios.includes(c.name),
    )!;
    const popularity = s.market.popularity.Horror;
    const game = releaseRivalGame(s, studio);
    expect(game.genre).toBe("Horror");
    expect(s.market.popularity.Horror).toBeLessThan(popularity);
  });
  it("versucht feindliche Übernahmen, die man abwehren oder auskaufen kann", () => {
    const s = rich();
    goPublic(s, 0.4);
    s.stock!.sentiment = 0.6;
    for (
      let i = 0;
      i < 40 && !s.events.some((e) => e.decision === "takeover");
      i++
    )
      hostileBid(s);
    const event = s.events.find((e) => e.decision === "takeover")!;
    expect(event).toBeTruthy();
    resolveTakeover(s, event.id, false);
    expect(s.stock!.rivalStake).toBeGreaterThan(0);
    s.finances.push({
      day: s.day,
      revenue: 0,
      expenses: 0,
      cash: s.company.cash,
    });
    s.finances.at(-2)!.revenue = 1e6;
    expect(payRivalDividend(s)).toBeGreaterThan(0);
    s.company.cash = 1e12;
    buyOutRival(s);
    expect(s.stock!.rivalStake).toBe(0);
  });
});
