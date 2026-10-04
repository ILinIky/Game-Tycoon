import { describe, expect, it } from "vitest";
import { initialState } from "../initial";
import { tick } from "../simulation/tick";
import { createProject, release } from "./projects";
import { validQueuedInput } from "./queue";
import { gameTotals, MAX_ARCHIVED_GAMES, pruneArchive } from "./archive";
import { SIZES } from "../config/balance";
import { campaignCost } from "../economy/scale";
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
function staffed(s: GameState, n: number) {
  for (let i = s.employees.length; i < n; i++)
    s.employees.push({
      ...s.employees[0],
      id: `e${i}`,
      name: `E ${i}`,
      salary: 0,
    });
  return s.employees.map((e) => e.id);
}
function finish(s: GameState) {
  for (const p of s.projects) {
    p.progress = 100;
    p.elapsed = p.duration;
  }
}

describe("Projektumfang, Preis und Marketing", () => {
  it("schaltet große Produktionen erst mit größeren Büros frei", () => {
    const s = founded();
    s.company.cash = 1e9;
    const team = staffed(s, SIZES.Blockbuster.team);
    expect(() =>
      createProject(s, { ...input, size: "Blockbuster", team }),
    ).toThrow(/ab dem Büro/);
    s.company.office = SIZES.Blockbuster.office;
    createProject(s, { ...input, size: "Blockbuster", team });
    expect(s.projects).toHaveLength(1);
  });
  it("verkauft größere Produktionen deutlich besser als AAA", () => {
    const revenue = (size: ProjectInput["size"]) => {
      let s = founded();
      s.company.office = 5;
      s.company.cash = 1e10;
      s.employees[0].skills.design = 90;
      const team = staffed(s, SIZES[size].team);
      createProject(s, { ...input, size, team });
      finish(s);
      release(s, s.projects[0].id);
      s.games[0].score = 8;
      for (let i = 0; i < 30; i++) s = tick(s);
      return s.games[0].revenue;
    };
    const aaa = revenue("AAA");
    const blockbuster = revenue("Blockbuster");
    const mega = revenue("Mega");
    const legend = revenue("Legend");
    expect(blockbuster).toBeGreaterThan(aaa * 2);
    expect(mega).toBeGreaterThan(blockbuster * 2);
    expect(legend).toBeGreaterThan(mega * 2);
  });
  it("übernimmt den geplanten Verkaufspreis beim Release", () => {
    const s = founded();
    createProject(s, { ...input, priceFactor: 1.4 });
    finish(s);
    release(s, s.projects[0].id);
    expect(s.games[0].price).toBe(Math.round(SIZES.Indie.price * 1.4));
    expect(validQueuedInput({ ...input, priceFactor: 3 })).toBe(false);
    expect(validQueuedInput({ ...input, marketing: "loud" })).toBe(false);
    expect(
      validQueuedInput({ ...input, priceFactor: 0.8, marketing: "strong" }),
    ).toBe(true);
  });
  it("schaltet geplante Kampagnen automatisch während der Entwicklung", () => {
    let s = founded();
    createProject(s, { ...input, marketing: "strong" });
    const start = s.projects[0].hype;
    const cash = s.company.cash;
    while (s.projects[0].progress < 100) s = tick(s);
    expect(s.projects[0].campaigns).toBe(3);
    expect(s.projects[0].hype).toBeGreaterThan(start + 40);
    expect(cash - s.company.cash).toBeGreaterThan(3 * campaignCost(s) * 0.9);
  });
  it("stoppt den maximalen Hype bei 100", () => {
    let s = founded();
    createProject(s, { ...input, marketing: "max" });
    while (s.projects[0].progress < 100) s = tick(s);
    expect(s.projects[0].hype).toBe(100);
  });
});

describe("Spielearchiv", () => {
  it("entfernt ab 100 Spielen die ältesten Spiele ohne Verkäufe", () => {
    const s = founded();
    s.day = 5000;
    const game = (i: number, releasedDay: number): ReleasedGame => ({
      ...input,
      id: `g${i}`,
      name: `Spiel ${i}`,
      duration: 1,
      elapsed: 1,
      budget: 0,
      progress: 100,
      quality: 50,
      bugs: 0,
      hype: 0,
      phase: "Release",
      points: {
        design: 0,
        technology: 0,
        art: 0,
        content: 0,
        audio: 0,
        polish: 0,
      },
      releasedDay,
      score: 5,
      reviews: [],
      units: 10,
      revenue: 100,
      price: 15,
      patched: false,
    });
    // 5 active games and 100 old ones.
    s.games = [
      ...Array.from({ length: 5 }, (_, i) => game(1000 + i, 4990)),
      ...Array.from({ length: 100 }, (_, i) => game(i, 100 + i)),
    ];
    const before = gameTotals(s);
    pruneArchive(s);
    expect(s.games).toHaveLength(MAX_ARCHIVED_GAMES);
    expect(
      s.games.filter((g) => g.id.startsWith("g10")).length,
    ).toBeGreaterThan(0);
    expect(s.games.some((g) => g.id === "g0")).toBe(false);
    expect(s.retiredGames?.count).toBe(5);
    expect(gameTotals(s)).toMatchObject({
      count: before.count,
      units: before.units,
      revenue: before.revenue,
    });
  });
});
