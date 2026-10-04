import { describe, expect, it } from "vitest";
import { initialState } from "../initial";
import { tick } from "../simulation/tick";
import { createProject, projectCost, quality } from "../projects/projects";
import { marketScale, nice, scaled } from "../economy/scale";
import { monthlyCosts } from "../economy/economy";
import {
  buildFacility,
  facilityBlocker,
  facilityEffects,
  moveOffice,
  officeCost,
  removeFacility,
} from "./office";
import type { ProjectInput } from "../types";
import { SIZES } from "../config/balance";

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

describe("Büro und Wirtschaft", () => {
  it("lässt Preise mit dem Markt wachsen", () => {
    const s = founded();
    expect(marketScale(s)).toBe(1);
    const indie1990 = projectCost(s, input);
    s.day = 3650;
    expect(marketScale(s)).toBeCloseTo(1.09 ** 10, 5);
    expect(projectCost(s, input)).toBeGreaterThan(indie1990 * 2.3);
    expect(scaled(s, 1000)).toBe(nice(1000 * 1.09 ** 10));
    expect(nice(123456)).toBe(123000);
  });

  it("begrenzt Einrichtungen auf die Räume des Gebäudes", () => {
    const s = founded();
    buildFacility(s, "coffee");
    expect(facilityBlocker(s, "lounge")).toContain("Räume");
    expect(facilityBlocker(s, "server")).toContain("Kreativ-Loft");
    s.company.cash = 1e6;
    moveOffice(s);
    expect(s.company.office).toBe(1);
    buildFacility(s, "server");
    expect(facilityEffects(s).bugs).toBe(0.2);
    removeFacility(s, "coffee");
    expect(s.facilities).toEqual(["server"]);
  });

  it("verlangt für Umzüge skalierte Preise und berechnet Unterhalt", () => {
    const s = founded();
    s.day = 3650;
    s.company.cash = officeCost(s, 1) - 1;
    expect(() => moveOffice(s)).toThrow();
    s.company.cash += 1;
    const before = monthlyCosts(s);
    moveOffice(s);
    expect(s.company.cash).toBe(0);
    expect(monthlyCosts(s)).toBeGreaterThan(before);
  });

  it("gibt Fokus-Räumen einen Qualitätsbonus", () => {
    const s = founded();
    s.company.office = 1;
    createProject(s, input);
    const base = quality(s, s.projects[0]);
    buildFacility(s, "testlab");
    expect(quality(s, s.projects[0])).toBeGreaterThan(base);
    expect(quality(s, { ...s.projects[0], designFocus: "atmosphere" })).toBeLessThan(
      quality(s, s.projects[0]),
    );
  });

  it("verkauft größere Spiele deutlich besser", () => {
    const unitsFor = (size: ProjectInput["size"]) => {
      let s = founded();
      s.employees[0].skills.design = 90;
      s.company.cash = 1e7;
      for (let i = 0; i < 7; i++)
        s.employees.push({ ...s.employees[0], id: `e${i}`, name: `E ${i}`, salary: 0 });
      createProject(s, { ...input, size, team: s.employees.map((e) => e.id) });
      s.projects[0].progress = 100;
      s.projects[0].elapsed = s.projects[0].duration;
      const g = s.projects[0];
      s.games.unshift({
        ...g,
        releasedDay: s.day,
        score: 8,
        reviews: [],
        units: 0,
        revenue: 0,
        price: SIZES[size].price,
        patched: false,
      });
      s.projects = [];
      for (let i = 0; i < 30; i++) s = tick(s);
      return s.games[0].revenue;
    };
    expect(unitsFor("AAA")).toBeGreaterThan(unitsFor("Indie") * 15);
  });
});
