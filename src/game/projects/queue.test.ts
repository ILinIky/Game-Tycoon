import { describe, expect, it } from "vitest";
import { initialState } from "../initial";
import type { GameState, ProjectInput } from "../types";
import { BALANCE, PLATFORMS } from "../config/balance";
import { validateSave } from "../persistence/saves";
import { tick } from "../simulation/tick";
import { cancelEngine, startEngine } from "../engines/engines";
import { createProject, projectCost, release } from "./projects";
import { saveProductionPreset } from "./presets";
import {
  enqueueFromPreset,
  MAX_PRODUCTION_QUEUE,
  processProductionQueue,
  productionQueueStatus,
} from "./queue";

const input: ProjectInput = {
  name: "Original",
  genre: "Strategie",
  theme: "Weltraum",
  audience: "Teen",
  size: "Indie",
  platforms: ["pc"],
  team: ["founder"],
  engine: "basic",
  designFocus: "systems",
  ambition: "balanced",
};
function studio() {
  const s = initialState();
  s.company.founded = true;
  s.company.cash = 100_000;
  saveProductionPreset(s, "Indie-Team", input);
  return s;
}
function enqueue(s: GameState, titles = ["First", "Second"], auto = true) {
  enqueueFromPreset(s, s.productionPresets![0].id, titles, "Strategie", auto);
}
function secondTeam(s: GameState) {
  s.employees.push({
    ...structuredClone(s.employees[0]),
    id: "second",
    name: "Sam",
  });
  saveProductionPreset(s, "Team B", { ...input, team: ["second"] });
  return s.productionPresets!.at(-1)!;
}
describe("Produktionswarteschlange", () => {
  it("speichert mehrere Titel als unveränderliche Pläne, ohne Geld oder Team zu reservieren", () => {
    const s = studio();
    const cash = s.company.cash;
    enqueue(s, [" First ", "", "Second"]);
    expect(s.company.cash).toBe(cash);
    expect(s.finances[0].expenses).toBe(0);
    expect(s.projects).toHaveLength(0);
    expect(s.productionQueue!.map((entry) => entry.input.name)).toEqual([
      "First",
      "Second",
    ]);
    s.productionPresets![0].settings.platforms.push("arc");
    s.productionPresets![0].name = "Changed";
    s.productionPresets = [];
    const loaded = validateSave(s);
    expect(loaded.productionQueue![0].input.platforms).toEqual(["pc"]);
    expect(loaded.productionQueue![0].presetName).toBe("Indie-Team");
    processProductionQueue(loaded);
    expect(loaded.projects[0].name).toBe("First");
  });
  it("entwickelt und veröffentlicht eine Folge ohne doppelte Teambelegung oder manuellen Release", () => {
    let s = studio();
    enqueue(s);
    s.speed = 12;
    processProductionQueue(s);
    const firstId = s.projects[0].id;
    while (!s.games.length && s.day < 100) s = tick(s);
    expect(s.games[0].id).toBe(firstId);
    expect(s.games[0].autoReleased).toBe(true);
    expect(s.games[0].salesHistoryStartDay).toBe(s.day + 1);
    expect(s.projects).toHaveLength(1);
    expect(s.projects[0].name).toBe("Second");
    expect(s.projects[0].progress).toBe(0);
    expect(s.productionQueue).toHaveLength(0);
    expect(s.speed).toBe(12);
    while (s.games.length < 2 && s.day < 180) s = tick(s);
    expect(s.games.map((g) => g.name)).toEqual(["Second", "First"]);
    expect(s.projects).toHaveLength(0);
    expect(s.games.every((g) => g.autoReleased)).toBe(true);
  });
  it("wartet auf Geld und berechnet Lizenzkosten beim tatsächlichen Start neu", () => {
    const s = studio();
    saveProductionPreset(s, "Indie-Team", {
      ...input,
      platforms: ["pc", "arc"],
    });
    enqueue(s, ["Budget"]);
    const queued = s.productionQueue![0];
    const estimate = projectCost(s, queued.input);
    s.company.cash = 100;
    processProductionQueue(s);
    expect(s.projects).toHaveLength(0);
    expect(productionQueueStatus(s, queued).label).toBe("Wartet auf Budget");
    s.licenses.push("arc");
    const actual = projectCost(s, queued.input);
    expect(actual).toBeLessThan(estimate);
    s.company.cash = actual;
    processProductionQueue(s);
    expect(s.projects[0].budget).toBe(actual);
    expect(s.company.cash).toBe(0);
    expect(s.finances[0].expenses).toBe(actual);
    expect(s.finances[0].cash).toBe(0);
  });
  it("hält die Reihenfolge für ein gemeinsames Team ein und lässt ein unabhängiges Team starten", () => {
    const s = studio();
    const b = secondTeam(s);
    enqueue(s, ["Blocked", "Same team"]);
    s.productionQueue![0].input.platforms = [
      PLATFORMS.find((p) => p.year > 1990)!.id,
    ];
    enqueueFromPreset(s, b.id, ["Independent"], "Puzzle", true);
    processProductionQueue(s);
    expect(s.projects.map((p) => p.name)).toEqual(["Independent"]);
    expect(s.productionQueue!.map((entry) => entry.input.name)).toEqual([
      "Blocked",
      "Same team",
    ]);
    expect(productionQueueStatus(s, s.productionQueue![1]).label).toBe(
      "In Reihenfolge",
    );
    s.productionQueue!.reverse();
    processProductionQueue(s);
    expect(s.projects.map((p) => p.name)).toEqual(["Independent", "Same team"]);
  });
  it("wartet auch auf Teams in der Engine-Schmiede", () => {
    const s = studio();
    startEngine(s, {
      name: "Framework",
      baseId: null,
      profile: "allround",
      modules: [],
      team: ["founder"],
    });
    enqueue(s, ["After engine"]);
    processProductionQueue(s);
    expect(s.projects).toHaveLength(0);
    expect(productionQueueStatus(s, s.productionQueue![0]).label).toBe(
      "Wartet auf Team",
    );
    cancelEngine(s);
    processProductionQueue(s);
    expect(s.projects[0].name).toBe("After engine");
  });
  it("beachtet den parallelen Produktionsplatz und stellt keine zusätzlichen Mitarbeiter ein", () => {
    const s = studio();
    for (let i = 0; i < BALANCE.maxProjects; i++) {
      const id = `busy-${i}`;
      s.employees.push({ ...structuredClone(s.employees[0]), id });
      createProject(s, { ...input, name: `Active ${i}`, team: [id] });
    }
    enqueue(s, ["Waiting for slot"]);
    processProductionQueue(s);
    expect(s.projects).toHaveLength(BALANCE.maxProjects);
    expect(productionQueueStatus(s, s.productionQueue![0]).label).toBe(
      "Wartet auf Platz",
    );
    expect(s.employees).toHaveLength(BALANCE.maxProjects + 1);
  });
  it("pausiert Autostart und Auto-Release, aber nicht die laufende Entwicklung", () => {
    let s = studio();
    enqueue(s);
    s.productionQueuePaused = true;
    processProductionQueue(s);
    expect(s.projects).toHaveLength(0);
    s.productionQueuePaused = false;
    processProductionQueue(s);
    s.productionQueuePaused = true;
    s = tick(s);
    expect(s.projects[0].progress).toBeGreaterThan(0);
    s.projects[0].progress = 100;
    processProductionQueue(s);
    expect(s.games).toHaveLength(0);
    expect(s.projects[0].name).toBe("First");
    s.productionQueuePaused = false;
    processProductionQueue(s);
    expect(s.games[0].name).toBe("First");
    expect(s.projects[0].name).toBe("Second");
  });
  it("lässt opt-out Spiele und vorher manuell gestartete Spiele bis zum bewussten Release stehen", () => {
    const s = studio();
    enqueue(s, ["Manual", "Next"], false);
    processProductionQueue(s);
    s.projects[0].progress = 100;
    processProductionQueue(s);
    expect(s.games).toHaveLength(0);
    expect(productionQueueStatus(s, s.productionQueue![0]).label).toBe(
      "Wartet auf Release",
    );
    release(s, s.projects[0].id);
    processProductionQueue(s);
    expect(s.projects[0].name).toBe("Next");
    expect(s.games[0].autoReleased).toBeUndefined();
    const ordinary = studio();
    createProject(ordinary, input);
    ordinary.projects[0].progress = 100;
    enqueue(ordinary, ["After manual"]);
    processProductionQueue(ordinary);
    expect(ordinary.games).toHaveLength(0);
    expect(ordinary.projects[0].name).toBe("Original");
  });
  it("behält Pläne bei fehlenden Referenzen oder Insolvenz und tauscht das Team nicht still aus", () => {
    const s = studio();
    secondTeam(s);
    enqueue(s, ["Missing"]);
    s.employees = s.employees.filter((e) => e.id !== "founder");
    const loaded = validateSave(s);
    expect(
      productionQueueStatus(loaded, loaded.productionQueue![0]).label,
    ).toBe("Team fehlt");
    processProductionQueue(loaded);
    expect(loaded.projects).toHaveLength(0);
    expect(loaded.productionQueue).toHaveLength(1);
    const bankrupt = studio();
    enqueue(bankrupt);
    bankrupt.company.bankrupt = true;
    processProductionQueue(bankrupt);
    expect(bankrupt.productionQueue).toHaveLength(2);
    expect(bankrupt.projects).toHaveLength(0);
  });
  it("nimmt einen fehlerhaften Batch gar nicht auf und begrenzt die Planung auf 50 wartende Spiele", () => {
    const s = studio();
    expect(() => enqueue(s, ["Valid", "x".repeat(49)])).toThrow(/48/);
    expect(s.productionQueue).toHaveLength(0);
    enqueue(
      s,
      Array.from({ length: MAX_PRODUCTION_QUEUE }, (_, i) => `Game ${i}`),
    );
    expect(() => enqueue(s, ["One more"])).toThrow(/50/);
    expect(s.productionQueue).toHaveLength(MAX_PRODUCTION_QUEUE);
    expect(s.company.cash).toBe(100_000);
  });
  it("migriert alte Spielstände und lehnt defekte Warteschlangen ab", () => {
    const s = studio();
    delete s.productionQueue;
    delete s.productionQueuePaused;
    expect(validateSave(s).productionQueue).toEqual([]);
    expect(validateSave(s).productionQueuePaused).toBe(false);
    enqueue(s);
    s.productionQueuePaused = true;
    expect(validateSave(s).productionQueuePaused).toBe(true);
    const duplicate = structuredClone(s);
    duplicate.productionQueue![1].id = duplicate.productionQueue![0].id;
    expect(() => validateSave(duplicate)).toThrow(/Produktionswarteschlange/);
    const invalid = structuredClone(s);
    invalid.productionQueue![0].input.team = ["founder", "founder"];
    expect(() => validateSave(invalid)).toThrow(/Produktionswarteschlange/);
    s.productionQueue![0].queuedDay = s.day + 1;
    expect(() => validateSave(s)).toThrow(/Produktionswarteschlange/);
  });
});
