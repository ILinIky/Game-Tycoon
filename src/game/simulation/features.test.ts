import { describe, expect, it } from "vitest";
import { initialState } from "../initial";
import { tick } from "./tick";
import { createProject, projectCost, release } from "../projects/projects";
import { validateSave } from "../persistence/saves";
import { PLATFORMS } from "../config/platforms";
import {
  availablePlatforms,
  gameReach,
  platformShare,
  platformStatus,
} from "../market/platforms";
import {
  acceptContract,
  contractOffer,
  publisherOffers,
  refreshOffers,
} from "../contracts/contracts";
import { sequelPlan } from "../projects/franchise";
import {
  dlcBlocker,
  priceFactor,
  setPrice,
  startDlc,
  startSale,
} from "../projects/pricing";
import { loyaltyTick, resolvePoach, unlockPerks } from "../employees/perks";
import {
  acquireStudio,
  acquisitionPrice,
  releaseRivalGame,
  updateCharts,
} from "../market/rivals";
import { bookExpo, EXPO_DAY } from "../marketing/expo";
import { isAssigned } from "../employees/assignment";
import type { GameState, ProjectInput, ReleasedGame } from "../types";

const input: ProjectInput = {
  name: "Orbital Letters",
  genre: "Strategie",
  theme: "Weltraum",
  platforms: ["pc"],
  audience: "Teen",
  size: "Indie",
  team: ["founder"],
  engine: "basic",
  designFocus: "systems",
};
function founded() {
  const s = initialState();
  s.company.founded = true;
  return s;
}
function days(s: GameState, n: number) {
  for (let i = 0; i < n; i++) s = tick(s);
  return s;
}
function released(s: GameState, score = 8): ReleasedGame {
  createProject(s, input);
  const p = s.projects[0];
  p.progress = 100;
  p.elapsed = p.duration;
  release(s, p.id);
  const g = s.games[0];
  g.score = score;
  return g;
}
const dayOf = (year: number) => Math.round((Date.UTC(year, 0, 1) - Date.UTC(1990, 0, 1)) / 86400000);

describe("Konsolen-Generationen", () => {
  it("folgen einem Lebenszyklus von Ankündigung bis Einstellung", () => {
    const prism = PLATFORMS.find((p) => p.id === "prism")!;
    expect(platformStatus(prism, dayOf(1993) + 10)).toBe("announced");
    expect(platformStatus(prism, dayOf(1994) + 10)).toBe("launch");
    expect(platformStatus(prism, dayOf(1997))).toBe("prime");
    expect(platformStatus(prism, dayOf(2001))).toBe("fading");
    expect(platformStatus(prism, dayOf(2003))).toBe("retired");
    expect(platformShare(prism, dayOf(1994))).toBeLessThan(platformShare(prism, dayOf(1997)));
    expect(platformShare(prism, dayOf(2003))).toBe(0);
  });
  it("bieten nur aktuelle Plattformen an und belohnen Launch-Titel", () => {
    const s = founded();
    s.day = dayOf(2001) + 30;
    const ids = availablePlatforms(s).map((p) => p.id);
    expect(ids).toContain("prism2");
    expect(ids).not.toContain("arc");
    const launch = gameReach({ platforms: ["orbit"], releasedDay: s.day }, s.day);
    const later = gameReach({ platforms: ["orbit"], releasedDay: s.day - 400 }, s.day);
    expect(launch).toBeGreaterThan(later);
    expect(() => createProject(s, { ...input, platforms: ["arc"] })).toThrow();
  });
});

describe("Aufträge und Publisher", () => {
  it("bezahlt fertige Aufträge und blockiert das Team", () => {
    let s = founded();
    refreshOffers(s);
    expect(s.contracts.offers).toHaveLength(3);
    const offer = s.contracts.offers[0];
    offer.work = 5;
    offer.level = 30;
    acceptContract(s, offer.id, ["founder"]);
    expect(isAssigned(s, "founder")).toBe(true);
    const cash = s.company.cash;
    s = days(s, 10);
    expect(s.contracts.completed).toBe(1);
    expect(s.company.cash).toBeGreaterThan(cash);
  });
  it("storniert Aufträge nach verpasster Frist", () => {
    let s = founded();
    const offer = contractOffer(s);
    offer.work = 999;
    offer.days = 3;
    s.contracts.offers = [offer];
    acceptContract(s, offer.id, ["founder"]);
    s = days(s, 5);
    expect(s.contracts.failed).toBe(1);
    expect(s.contracts.active).toHaveLength(0);
  });
  it("zahlt einen Vorschuss und teilt später den Umsatz", () => {
    const s = founded();
    const budget = projectCost(s, input);
    const deal = publisherOffers(s, budget)[0];
    const cash = s.company.cash;
    createProject(s, { ...input, publisher: deal });
    expect(s.company.cash).toBe(cash - budget + deal.advance);
    expect(s.projects[0].publisher?.share).toBe(0.2);
    const locked = publisherOffers(s, budget).find((p) => p.locked)!;
    expect(() => createProject(s, { ...input, name: "X", team: [], publisher: locked })).toThrow();
  });
});

describe("Fortsetzungen", () => {
  it("erben Hype und zählen die Serie weiter", () => {
    const s = founded();
    const original = released(s, 8.4);
    const plan = sequelPlan(s, original.id)!;
    expect(plan.entry).toBe(2);
    expect(plan.name).toBe("Orbital Letters 2");
    createProject(s, { ...input, name: plan.name, sequelOf: original.id });
    expect(s.projects[0].franchise).toBe(original.id);
    expect(s.projects[0].hype).toBeGreaterThanOrEqual(plan.hype);
    expect(() =>
      createProject(s, { ...input, name: "Falsch", genre: "RPG", sequelOf: original.id, team: [] }),
    ).toThrow();
  });
  it("erlauben keine Fortsetzung schwacher Spiele", () => {
    const s = founded();
    const weak = released(s, 4.5);
    expect(sequelPlan(s, weak.id)!.eligible).toBe(false);
  });
});

describe("Preis, Rabatt und Erweiterungen", () => {
  it("macht Preise abhängig von der Qualität", () => {
    const s = founded();
    const g = released(s, 9);
    setPrice(s, g.id, 1.4);
    const strong = priceFactor(g, s.day);
    g.score = 5;
    const weak = priceFactor(g, s.day);
    expect(strong).toBeGreaterThan(weak);
  });
  it("startet Rabattaktionen und Erweiterungen mit Sperrzeiten", () => {
    let s = founded();
    const g = released(s, 8);
    expect(() => startSale(s, g.id, 0.5)).toThrow();
    s = days(s, 46);
    const game = s.games[0];
    startSale(s, game.id, 0.5);
    expect(() => startSale(s, game.id, 0.25)).toThrow();
    expect(dlcBlocker(s, game)).toBeNull();
    startDlc(s, game.id);
    s = days(s, 31);
    expect(s.games[0].dlcs).toBe(1);
    expect(s.games[0].revivedDay).toBeDefined();
  });
});

describe("Mitarbeiter", () => {
  it("schaltet Spezialisierungen ab Skill 80 frei", () => {
    const s = founded();
    s.employees[0].skills.design = 85;
    unlockPerks(s);
    expect(s.employees[0].perk).toBe("vision");
  });
  it("lässt unzufriedene Mitarbeiter abwerben", () => {
    const s = founded();
    const e = { ...structuredClone(s.employees[0]), id: "e2", name: "Mika", role: "Art" as const, loyalty: 5, stress: 95, motivation: 30, salary: 100 };
    s.employees.push(e);
    for (let i = 0; i < 40 && !s.events.some((ev) => ev.decision === "poach"); i++) loyaltyTick(s);
    const event = s.events.find((ev) => ev.decision === "poach")!;
    expect(event.target).toBe("e2");
    resolvePoach(s, event.id, false);
    expect(s.employees.some((x) => x.id === "e2")).toBe(false);
  });
});

describe("Charts, Übernahmen, Messe und Jahresrückblick", () => {
  it("führt eigene und fremde Spiele in den Charts", () => {
    let s = founded();
    released(s, 9);
    releaseRivalGame(s, s.market.competitors[0]);
    s = days(s, 7);
    updateCharts(s);
    expect(s.charts!.entries.length).toBeGreaterThan(0);
    expect(s.charts!.entries.some((e) => e.own)).toBe(true);
  });
  it("übernimmt Konkurrenten ab dem Campus", () => {
    const s = founded();
    const rival = s.market.competitors[0];
    expect(() => acquireStudio(s, rival.name)).toThrow();
    s.company.office = 3;
    s.company.cash = acquisitionPrice(s, rival) + 1;
    acquireStudio(s, rival.name);
    expect(rival.owned).toBe(true);
    expect(s.subsidiaries).toHaveLength(1);
  });
  it("veranstaltet die GameExpo mit gebuchtem Stand", () => {
    let s = founded();
    createProject(s, input);
    s.day = EXPO_DAY - 20;
    s.company.cash = 1e6;
    bookExpo(s, "small", [s.projects[0].id]);
    const hype = s.projects[0].hype;
    s = days(s, 20);
    expect(s.expo.result).not.toBeNull();
    expect(s.projects[0].hype).toBeGreaterThan(hype);
  });
  it("erstellt zum Jahreswechsel einen Rückblick", () => {
    let s = founded();
    released(s, 8);
    s.day = 363;
    s = days(s, 3);
    expect(s.yearReviews[0].year).toBe(1990);
    expect(s.yearReviews[0].released).toBe(1);
  });
  it("lädt alte Spielstände ohne neue Systeme", () => {
    const s = founded();
    const old = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    for (const key of ["contracts", "charts", "expo", "awards", "subsidiaries", "yearStats", "yearReviews"])
      delete old[key];
    const loaded = validateSave(old);
    expect(loaded.contracts.offers).toEqual([]);
    expect(loaded.expo.booth).toBeNull();
    expect(loaded.awards).toEqual([]);
  });
});
