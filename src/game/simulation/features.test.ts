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
import {
  adjustSalary,
  fairSalary,
  loyaltyTick,
  resolvePoach,
  resolveSalary,
  unlockPerks,
} from "../employees/perks";
import { recruit } from "../employees/recruiting";
import {
  buyCompany,
  currentValue,
  groupStats,
  payHoldings,
  sellCompany,
} from "../market/holdings";
import {
  cheapestCompanies,
  companyOffer,
  searchCompanies,
} from "../market/companyMarket";
import { buildRanking, marketMergers, worldCompanies } from "../leaderboard";
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
  it("pausiert bei Abwerbeversuchen und hält Mitarbeiter mit Marktgehalt", () => {
    const s = founded();
    s.speed = 12;
    const e = { ...structuredClone(s.employees[0]), id: "e2", name: "Mika", role: "Art" as const, loyalty: 5, stress: 95, motivation: 30, salary: 100 };
    s.employees.push(e);
    for (let i = 0; i < 40 && !s.events.some((ev) => ev.decision === "poach"); i++) loyaltyTick(s);
    const event = s.events.find((ev) => ev.decision === "poach")!;
    expect(s.speed).toBe(0);
    expect(event.body).toContain("Gehalt unter Marktwert");
    resolvePoach(s, event.id, true);
    const kept = s.employees.find((x) => x.id === "e2")!;
    expect(kept.salary).toBeGreaterThanOrEqual(fairSalary(kept, s));
    expect(s.events.some((ev) => ev.target === "e2" && ev.decision)).toBe(false);
  });
  it("meldet Gehaltswünsche, bevor Mitarbeiter abgeworben werden", () => {
    const s = founded();
    const e = { ...structuredClone(s.employees[0]), id: "e2", name: "Mika", role: "Art" as const, loyalty: 60, stress: 10, motivation: 80, salary: 100 };
    s.employees.push(e);
    loyaltyTick(s);
    const event = s.events.find((ev) => ev.decision === "salary")!;
    expect(event.target).toBe("e2");
    resolveSalary(s, event.id, true);
    expect(s.employees[1].salary).toBe(fairSalary(s.employees[1], s));
    expect(() => adjustSalary(s, "e2")).toThrow();
  });
  it("stellt neue Mitarbeiter zum Marktwert ein und findet sie per Headhunter sofort", () => {
    const s = founded();
    recruit(s, "Art", "Junior", 650, true);
    expect(s.recruitment).toBeNull();
    expect(s.candidates).toHaveLength(4);
    expect(s.company.cash).toBe(50000 - 1300);
    for (const c of s.candidates)
      expect(c.salary).toBeGreaterThanOrEqual(fairSalary(c, s) * 0.9);
  });
  it("hält Dauerstress beschäftigter Mitarbeiter unter der Burnout-Grenze", () => {
    let s = founded();
    s.company.cash = 1e7;
    for (let i = 0; i < 4; i++) {
      createProject(s, { ...input, name: `Projekt ${i}` });
      s = days(s, 120);
      release(s, s.projects[0].id);
    }
    expect(s.employees[0].stress).toBeLessThan(60);
  });
});

describe("Unternehmensübernahmen & Group", () => {
  const cheapest = (s: GameState) => cheapestCompanies(s, 1)[0];
  it("findet echte Unternehmen über die Suche", () => {
    const s = founded();
    expect(searchCompanies(s, "nvidia")[0].name).toBe("NVIDIA");
    expect(searchCompanies(s, "")).toEqual([]);
  });
  it("kauft zum Marktwert, zahlt Gewinne aus und verkauft wieder", () => {
    const s = founded();
    const offer = companyOffer(cheapest(s));
    expect(() => buyCompany(s, offer)).toThrow();
    s.company.cash = offer.price + 1000;
    buyCompany(s, offer);
    expect(s.company.cash).toBe(1000);
    expect(() => buyCompany(s, offer)).toThrow();
    const paid = payHoldings(s);
    expect(paid).toBeGreaterThan(0);
    expect(s.holdings![0].earned).toBe(paid);
    const stats = groupStats(s);
    expect(stats.active).toBe(true);
    expect(stats.name).toBe(`${s.company.name} Group`);
    expect(stats.value).toBeGreaterThan(offer.price);
    sellCompany(s, offer.id);
    expect(s.holdings).toHaveLength(0);
    expect(s.company.cash).toBeGreaterThan(offer.price * 0.9);
  });
  it("lässt Kurse gekaufter Firmen schwanken", () => {
    const s = founded();
    const offer = companyOffer(cheapest(s));
    s.company.cash = offer.price;
    buyCompany(s, offer);
    const values = [0, 200, 400, 800, 1600].map((d) =>
      currentValue(s.holdings![0], d),
    );
    expect(new Set(values).size).toBeGreaterThan(3);
  });
  it("zeigt Group und Mitgliedsfirmen in der Weltrangliste", () => {
    const s = founded();
    const offer = companyOffer(cheapest(s));
    s.company.cash = offer.price;
    buyCompany(s, offer);
    const stats = groupStats(s);
    const ranking = buildRanking(s.company, {
      name: stats.name,
      value: stats.value,
      members: [offer.id],
    });
    expect(ranking.find((e) => e.group)?.name).toBe(stats.name);
    expect(ranking.find((e) => e.id === offer.id)?.memberOf).toBe(stats.name);
    expect(buildRanking(s.company).some((e) => e.group)).toBe(false);
  });
  it("lässt echte Firmen in der Spielwelt fusionieren, aber nie eigene", () => {
    const market = { day: 365 * 20, seed: 42, owned: [] as string[] };
    const mergers = marketMergers(market);
    expect(mergers.length).toBeGreaterThan(20);
    expect(marketMergers(market)).toEqual(mergers);
    const target = mergers[0].target;
    const world = worldCompanies(market);
    expect(world.some((c) => c.id === target)).toBe(false);
    expect(world.find((c) => c.id === mergers[0].acquirer)?.absorbed?.length).toBeGreaterThan(0);
    expect(
      marketMergers({ ...market, owned: [target] }).some((m) => m.target === target),
    ).toBe(false);
  });
  it("lädt Beteiligungen aus Spielständen", () => {
    const s = founded();
    const offer = companyOffer(cheapest(s));
    s.company.cash = offer.price;
    buyCompany(s, offer);
    const loaded = validateSave(JSON.parse(JSON.stringify(s)));
    expect(loaded.holdings).toHaveLength(1);
    const old = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    delete old.holdings;
    expect(validateSave(old).holdings).toEqual([]);
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
