import { describe, expect, it } from "vitest";
import { initialState } from "../initial";
import { tick } from "./tick";
import {
  createProject,
  release,
  quality,
  projectCost,
  projectDuration,
} from "../projects/projects";
import { recruit, hire } from "../employees/recruiting";
import { startResearch } from "../research/research";
import { validateSave } from "../persistence/saves";
import { monthlyCosts } from "../economy/economy";
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
  s.company.name = "Test Studio";
  return s;
}
function days(s: GameState, n: number) {
  for (let i = 0; i < n; i++) s = tick(s);
  return s;
}
describe("spielbarer Studio-Loop", () => {
  it("berechnet Ambition nur auf das Entwicklungsbudget und verändert Arbeitszeit und Risiko", () => {
    const s = founded();
    const focused = {
      ...input,
      platforms: ["pc", "arc"],
      ambition: "focused" as const,
    };
    const experimental = { ...input, ambition: "experimental" as const };
    expect(projectCost(s, focused)).toBe(4250 + 3500);
    expect(projectDuration(s, focused)).toBe(41);
    expect(projectCost(s, experimental)).toBe(6250);
    expect(projectDuration(s, experimental)).toBe(58);
    createProject(s, focused);
    const normal = founded();
    createProject(normal, { ...input, ambition: "balanced" });
    const risky = founded();
    createProject(risky, experimental);
    expect(days(s, 12).projects[0].bugs).toBeLessThanOrEqual(
      days(normal, 12).projects[0].bugs,
    );
    expect(days(risky, 12).projects[0].bugs).toBeGreaterThanOrEqual(
      days(normal, 12).projects[0].bugs,
    );
  });
  it("wertet die echten Teamfähigkeiten nach Designschwerpunkt und belohnt Experimente erst mit Erfahrung", () => {
    const s = founded();
    createProject(s, input);
    const p = s.projects[0];
    const e = s.employees[0];
    e.skills = {
      ...e.skills,
      design: 20,
      programming: 80,
      art: 10,
      audio: 10,
      writing: 20,
    };
    e.motivation = 50;
    const techQuality = quality(s, { ...p, designFocus: "technology" });
    const designQuality = quality(s, { ...p, designFocus: "systems" });
    expect(techQuality).toBeGreaterThan(designQuality + 8);
    expect(quality(s, { ...p, ambition: "experimental" })).toBeLessThan(
      quality(s, p),
    );
    e.skills = {
      ...e.skills,
      design: 68,
      programming: 68,
      art: 68,
      audio: 68,
      writing: 68,
    };
    expect(quality(s, { ...p, ambition: "experimental" })).toBeGreaterThan(
      quality(s, p),
    );
  });
  it("lädt bestehende Projekte ohne neue Designfelder und verweigert ungültige Entscheidungen", () => {
    const s = founded();
    createProject(s, input);
    expect(validateSave(s).projects[0].designFocus).toBeUndefined();
    const invalid = structuredClone(s) as unknown as {
      projects: { designFocus: string }[];
    };
    invalid.projects[0].designFocus = "unknown";
    expect(() => validateSave(invalid)).toThrow();
    const withDesign = founded();
    createProject(withDesign, {
      ...input,
      designFocus: "atmosphere",
      ambition: "focused",
    });
    expect(validateSave(withDesign).projects[0].ambition).toBe("focused");
  });
  it("entwickelt ein Spiel, veröffentlicht es und erzielt Umsatz und Wachstum", () => {
    let s = founded();
    createProject(s, input);
    expect(s.company.cash).toBe(45000);
    s = days(s, 65);
    expect(s.projects[0].progress).toBe(100);
    expect(s.projects[0].bugs).toBe(0);
    release(s, s.projects[0].id);
    expect(s.projects).toHaveLength(0);
    expect(s.games[0].reviews).toHaveLength(4);
    expect(s.games[0].score).toBeGreaterThan(4);
    const launchCash = s.company.cash;
    s = days(s, 40);
    expect(s.games[0].units).toBeGreaterThan(0);
    expect(s.games[0].revenue).toBeGreaterThan(0);
    expect(s.company.cash).toBeGreaterThan(launchCash);
    expect(s.company.fans).toBeGreaterThan(0);
    expect(s.company.reputation).toBeGreaterThan(0);
    expect(s.genreExperience.Strategie).toBe(1);
  });
  it("erzeugt Kandidaten erst nach sieben Tagen und belastet laufende Gehälter", () => {
    let s = founded();
    recruit(s, "Programmierung", "Junior", 650);
    s = days(s, 6);
    expect(s.candidates).toHaveLength(0);
    s = tick(s);
    expect(s.candidates).toHaveLength(3);
    hire(s, s.candidates[0].id);
    expect(s.employees).toHaveLength(2);
    expect(monthlyCosts(s)).toBeGreaterThan(1500);
    const cash = s.company.cash;
    s = tick(s);
    expect(cash - s.company.cash).toBeCloseTo(monthlyCosts(s) / 30, 5);
  });
  it("verhindert Doppelzuweisungen, vorzeitige Releases und unfinanzierte Projekte", () => {
    const s = founded();
    createProject(s, input);
    expect(() => createProject(s, { ...input, name: "Double" })).toThrow();
    expect(() => release(s, s.projects[0].id)).toThrow();
    const poor = founded();
    poor.company.cash = 100;
    expect(() => createProject(poor, input)).toThrow();
    expect(poor.company.cash).toBe(100);
  });
  it("verbraucht Forschungspunkte und schaltet eine Technologie nach Ablauf frei", () => {
    let s = founded();
    startResearch(s, "sprites");
    expect(s.company.researchPoints).toBe(2);
    expect(s.company.cash).toBe(48200);
    expect(() => startResearch(s, "ai")).toThrow();
    s = days(s, 12);
    expect(s.technologies).toContain("sprites");
    expect(s.research).toHaveLength(0);
  });
  it("berechnet Qualität aus Team, Synergie, Technologie und Bugs", () => {
    const s = founded();
    createProject(s, input);
    const p = s.projects[0];
    const baseline = quality(s, p);
    s.technologies.push("sprites");
    expect(quality(s, p)).toBeGreaterThan(baseline);
    p.bugs = 30;
    expect(quality(s, p)).toBeLessThan(baseline);
  });
  it("bietet einen Long Tail und bewahrt deterministische Zustände ohne Mutation", () => {
    let s = founded();
    createProject(s, input);
    s = days(s, 65);
    release(s, s.projects[0].id);
    const snapshot = JSON.stringify(s);
    const a = days(s, 30),
      b = days(s, 30);
    expect(a).toEqual(b);
    expect(JSON.stringify(s)).toBe(snapshot);
    const initialSales = a.games[0].units;
    const later = days(a, 300);
    expect(later.games[0].units).toBeGreaterThan(initialSales);
  });
  it("stoppt nach Zahlungsunfähigkeit", () => {
    const s = founded();
    s.company.cash = -14999;
    const end = tick(s);
    expect(end.company.bankrupt).toBe(true);
    expect(end.speed).toBe(0);
    expect(tick(end)).toBe(end);
  });
  it("validiert JSON-Importe, Referenzen und pausiert geladene Spielstände", () => {
    const s = founded();
    s.speed = 4;
    createProject(s, input);
    const loaded = validateSave(JSON.parse(JSON.stringify(s)) as unknown);
    expect(loaded.speed).toBe(0);
    expect(loaded.projects[0].name).toBe(input.name);
    expect(() => validateSave({ version: 1 })).toThrow();
    const invalid = structuredClone(s);
    invalid.projects[0].team = ["missing"];
    expect(() => validateSave(invalid)).toThrow();
    const corrupt = structuredClone(s);
    corrupt.employees[0].skills.audio = NaN;
    expect(() => validateSave(corrupt)).toThrow();
  });
});
