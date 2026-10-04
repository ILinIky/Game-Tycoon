import { describe, expect, it } from "vitest";
import { initialState } from "../initial";
import { validateSave } from "../persistence/saves";
import { createProject, projectCost } from "./projects";
import { applyProductionPreset, saveProductionPreset } from "./presets";
import type { ProjectInput } from "../types";
const input: ProjectInput = {
  name: "Orbit",
  genre: "Strategie",
  theme: "Weltraum",
  platforms: ["pc"],
  audience: "Teen",
  size: "Indie",
  team: ["founder"],
  engine: "basic",
  designFocus: "systems",
  ambition: "balanced",
};
describe("Produktionsvorlagen", () => {
  it("speichert Einstellungen unabhängig von Titel und Genre und bleibt im Spielstand erhalten", () => {
    const state = initialState();
    const original = structuredClone(input);
    saveProductionPreset(state, "Mein Team", original);
    original.platforms.push("arc");
    const loaded = validateSave(state);
    const preset = loaded.productionPresets![0];
    expect(preset.settings.platforms).toEqual(["pc"]);
    expect(preset.settings).not.toHaveProperty("name");
    expect(preset.settings).not.toHaveProperty("genre");
    const result = applyProductionPreset(loaded, preset, {
      ...input,
      name: "Neue Idee",
      genre: "Puzzle",
    });
    expect(result.input.name).toBe("Neue Idee");
    expect(result.input.genre).toBe("Puzzle");
    expect(result.input.team).toEqual(["founder"]);
    expect(result.issues).toEqual([]);
    expect(state.company.cash).toBe(50_000);
  });
  it("meldet belegte Teams statt einen anderen Mitarbeiter einzusetzen", () => {
    const state = initialState();
    saveProductionPreset(state, "Indie", input);
    createProject(state, input);
    const result = applyProductionPreset(
      state,
      state.productionPresets![0],
      input,
    );
    expect(result.input.team).toEqual([]);
    expect(result.issues[0]).toMatch(/belegt/);
  });
  it("aktualisiert gleiche Namen und berechnet das Budget neu", () => {
    const state = initialState();
    saveProductionPreset(state, "Standard", input);
    saveProductionPreset(state, "standard", {
      ...input,
      platforms: ["pc", "arc"],
    });
    expect(state.productionPresets).toHaveLength(1);
    const result = applyProductionPreset(
      state,
      state.productionPresets![0],
      input,
    ).input;
    const before = projectCost(state, result);
    state.licenses.push("arc");
    expect(projectCost(state, result)).toBeLessThan(before);
  });
  it("migriert alte Spielstände und weist ungültige Vorlagen zurück", () => {
    expect(validateSave(initialState()).productionPresets).toEqual([]);
    const state = initialState();
    saveProductionPreset(state, "Indie", input);
    state.productionPresets![0].settings.platforms = ["missing"];
    expect(() => validateSave(state)).toThrow(/Produktionsvorlagen/);
  });
});
