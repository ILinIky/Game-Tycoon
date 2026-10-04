import { describe, expect, it } from "vitest";
import { initialState } from "../initial";
import { tick } from "../simulation/tick";
import { createProject, projectDuration, quality } from "../projects/projects";
import { validateSave } from "../persistence/saves";
import { TECHNOLOGIES } from "../config/technologies";
import {
  cancelResearch,
  missingStandards,
  researchBlocker,
  researchCost,
  researchIncome,
  startResearch,
  techById,
  techEffects,
  upgradeLab,
} from "./research";
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

describe("Forschung", () => {
  it("hat einen gültigen Techbaum ohne fehlende Voraussetzungen", () => {
    const ids = new Set(TECHNOLOGIES.map((t) => t.id));
    expect(ids.size).toBe(TECHNOLOGIES.length);
    for (const t of TECHNOLOGIES)
      for (const id of t.requires) {
        expect(ids.has(id)).toBe(true);
        expect(techById(id)!.year).toBeLessThanOrEqual(t.year);
      }
  });

  it("verlangt Voraussetzungen und begrenzt gleichzeitige Forschung auf die Laborplätze", () => {
    const s = founded();
    s.day = 1200;
    s.company.researchPoints = 500;
    expect(researchBlocker(s, techById("mode7")!)).toContain("Dynamische Sprites");
    expect(() => startResearch(s, "mode7")).toThrow();
    startResearch(s, "sprites");
    expect(researchBlocker(s, techById("audio")!)).toContain("Forschungsplätze");
    s.company.office = 1;
    upgradeLab(s);
    startResearch(s, "audio");
    expect(s.research).toHaveLength(2);
  });

  it("baut das Labor nur mit passendem Büro aus und berechnet Unterhalt", () => {
    const s = founded();
    expect(() => upgradeLab(s)).toThrow();
    s.company.office = 1;
    upgradeLab(s);
    expect(s.lab.level).toBe(1);
    expect(s.company.cash).toBe(50000 - 15000);
  });

  it("erstattet beim Abbrechen die Hälfte der Punkte", () => {
    const s = founded();
    startResearch(s, "sprites");
    cancelResearch(s, "sprites");
    expect(s.research).toHaveLength(0);
    expect(s.company.researchPoints).toBe(2 + 9);
  });

  it("wendet Effekte auf Dauer, Start-Hype und Genre-Qualität an", () => {
    const s = founded();
    const before = projectDuration(s, input);
    s.technologies.push("pipeline", "press");
    expect(projectDuration(s, input)).toBeLessThan(before);
    createProject(s, input);
    expect(s.projects[0].hype).toBe(3);
    const base = quality(s, s.projects[0]);
    s.technologies.push("ai");
    expect(quality(s, s.projects[0])).toBeGreaterThan(base + 2);
  });

  it("bestraft fehlende Branchenstandards", () => {
    const s = founded();
    createProject(s, input);
    const p = s.projects[0];
    s.day = 365 * 3 + 10; // 1993
    expect(missingStandards(s).map((t) => t.id)).toEqual(
      expect.arrayContaining(["sprites", "audio"]),
    );
    const outdated = quality(s, p);
    s.technologies.push("sprites", "audio");
    expect(missingStandards(s)).toHaveLength(0);
    expect(quality(s, p)).toBeGreaterThan(outdated + 3);
  });

  it("steigert wiederholbare Programme stufenweise mit wachsenden Kosten", () => {
    let s = founded();
    s.technologies.push("market");
    s.company.researchPoints = 400;
    s.company.cash = 100000;
    const program = techById("playtests")!;
    const first = researchCost(s, program);
    startResearch(s, "playtests");
    s = days(s, 40);
    expect(s.researchLevels.playtests).toBe(1);
    expect(researchCost(s, program).points).toBeGreaterThan(first.points);
    expect(techEffects(s).quality).toBe(1);
  });

  it("erzeugt mehr Punkte mit untätigem Team und Grundlagenfokus", () => {
    const s = founded();
    const idle = researchIncome(s);
    s.lab.focus = "fundamental";
    expect(researchIncome(s)).toBeCloseTo(idle * 1.3, 5);
    createProject(s, input);
    expect(researchIncome(s)).toBeLessThan(idle * 1.3);
  });

  it("migriert alte Spielstände mit einzelner Forschung", () => {
    const s = founded();
    const old = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    old.research = { techId: "sprites", elapsed: 3, duration: 12 };
    delete old.researchLevels;
    delete old.lab;
    const loaded = validateSave(old);
    expect(loaded.research).toEqual([
      { techId: "sprites", elapsed: 3, duration: 12 },
    ]);
    expect(loaded.lab).toEqual({ level: 0, focus: "balanced" });
    expect(loaded.researchLevels).toEqual({});
    old.research = null;
    expect(validateSave(old).research).toEqual([]);
  });
});
