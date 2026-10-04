import { describe, expect, it } from "vitest";
import { initialState } from "../initial";
import { tick } from "./tick";
import {
  createProject,
  projectCost,
  quality,
  release,
} from "../projects/projects";
import { recruit } from "../employees/recruiting";
import { fireEmployee } from "../employees/perks";
import { techEffects } from "../research/research";
import { TECHNOLOGIES, LABS } from "../config/technologies";
import { FACILITIES, OFFICES } from "../config/offices";
import { buildFacility, facilityEffects } from "../office/office";
import { validQueuedInput } from "../projects/queue";
import type { GameState, ProjectInput } from "../types";

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
function revenueOf(setup: (s: GameState) => void) {
  let s = founded();
  setup(s);
  createProject(s, input);
  const p = s.projects[0];
  p.progress = 100;
  p.elapsed = p.duration;
  release(s, p.id);
  s.games[0].score = 8;
  for (let i = 0; i < 30; i++) s = tick(s);
  return s.games[0].revenue;
}

describe("Forschung im Late Game", () => {
  it("hat Stufe V und VI, einen Live-Service-Zweig und gültige Voraussetzungen", () => {
    const ids = new Set(TECHNOLOGIES.map((t) => t.id));
    expect(ids.size).toBe(TECHNOLOGIES.length);
    expect(
      TECHNOLOGIES.filter((t) => t.tier >= 5).length,
    ).toBeGreaterThanOrEqual(20);
    expect(TECHNOLOGIES.some((t) => t.category === "live")).toBe(true);
    for (const t of TECHNOLOGIES)
      for (const r of t.requires) {
        expect(ids.has(r)).toBe(true);
        const req = TECHNOLOGIES.find((x) => x.id === r)!;
        if (t.category !== "programs")
          expect(req.tier).toBeLessThanOrEqual(t.tier);
      }
    expect(LABS.length).toBe(6);
  });
  it("erhöht mit Umsatz-Forschung die Einnahmen pro Verkauf", () => {
    const base = revenueOf(() => {});
    const boosted = revenueOf((s) => {
      s.technologies.push("digital", "subscriptions", "liveops");
    });
    expect(
      techEffects({ ...founded(), technologies: ["digital"] }).revenue,
    ).toBeCloseTo(0.12);
    expect(boosted).toBeGreaterThan(base * 1.3);
  });
});

describe("Gebäude und Einrichtungen", () => {
  it("bietet mehr Gebäude mit mehr Räumen", () => {
    expect(OFFICES.length).toBe(8);
    expect(OFFICES.at(-1)!.slots).toBeGreaterThanOrEqual(12);
    expect(FACILITIES.length).toBeGreaterThanOrEqual(20);
  });
  it("wirkt mit neuen Einrichtungen auf Qualität, Verkäufe und Moral", () => {
    const s = founded();
    s.company.office = 3;
    s.company.cash = 1e8;
    createProject(s, input);
    const before = quality(s, s.projects[0]);
    buildFacility(s, "mocap");
    buildFacility(s, "canteen");
    expect(quality(s, s.projects[0])).toBeGreaterThan(before);
    expect(facilityEffects(s).morale).toBeGreaterThan(0);
    const sales = revenueOf((x) => {
      x.company.office = 6;
      x.company.cash = 1e8;
      buildFacility(x, "arena");
    });
    expect(sales).toBeGreaterThan(revenueOf(() => {}));
  });
});

describe("Team", () => {
  it("findet bei gemischter Suche Talente aus verschiedenen Bereichen", () => {
    const s = founded();
    recruit(s, "Mix", "Junior", 650, true);
    expect(new Set(s.candidates.map((c) => c.role)).size).toBe(4);
  });
  it("entlässt Mitarbeiter gegen eine Abfindung", () => {
    const s = founded();
    recruit(s, "Art", "Junior", 650, true);
    s.employees.push(s.candidates[0]);
    const e = s.employees[1];
    const cash = s.company.cash;
    fireEmployee(s, e.id);
    expect(s.employees).toHaveLength(1);
    expect(cash - s.company.cash).toBe(e.salary);
    expect(() => fireEmployee(s, "founder")).toThrow();
  });
});

describe("Produktionsextras", () => {
  it("kosten mehr Budget und verkaufen sich besser", () => {
    const s = founded();
    const extras = { ...input, features: ["multiplayer", "localization"] };
    expect(projectCost(s, extras)).toBeGreaterThan(projectCost(s, input));
    expect(validQueuedInput(extras)).toBe(true);
    expect(validQueuedInput({ ...input, features: ["jetpack"] })).toBe(false);
    const plain = revenueOf(() => {});
    let boosted = founded();
    boosted.company.cash = 1e6;
    createProject(boosted, extras);
    const p = boosted.projects[0];
    p.progress = 100;
    p.elapsed = p.duration;
    p.bugs = 0;
    release(boosted, p.id);
    boosted.games[0].score = 8;
    for (let i = 0; i < 30; i++) boosted = tick(boosted);
    expect(boosted.games[0].revenue).toBeGreaterThan(plain * 1.25);
  });
});
