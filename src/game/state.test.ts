import { describe, expect, it } from "vitest";
import { initialState } from "./initial";
import { tick } from "./simulation/tick";
import { cloneState } from "./state";
import { createProject, release } from "./projects/projects";
import { packState, unpackState, validateSave } from "./persistence/saves";
import type { ProjectInput } from "./types";

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
function selling() {
  let s = initialState();
  s.company.founded = true;
  createProject(s, input);
  const p = s.projects[0];
  p.progress = 100;
  p.elapsed = p.duration;
  release(s, p.id);
  for (let i = 0; i < 5; i++) s = tick(s);
  return s;
}

describe("Spielstand-Kopien", () => {
  it("teilt Verkaufsverläufe, ohne den vorherigen Stand zu verändern", () => {
    const before = selling();
    const history = before.games[0].salesHistory!;
    const length = history.length;
    const copy = cloneState(before);
    expect(copy.games[0].salesHistory).toBe(history);
    expect(copy.company).not.toBe(before.company);
    const after = tick(before);
    expect(history).toHaveLength(length);
    expect(after.games[0].salesHistory!.length).toBe(length + 1);
    expect(before.games[0].salesHistory).toBe(history);
  });
  it("speichert Verkaufsverläufe kompakt und lädt sie unverändert", () => {
    const s = selling();
    const packed = packState(s) as unknown as Record<string, unknown>;
    const game = (packed.games as Record<string, unknown>[])[0];
    expect(game.salesHistory).toBeUndefined();
    expect(game.packedHistory).toBeDefined();
    const loaded = validateSave(unpackState(structuredClone(packed)));
    expect(loaded.games[0].salesHistory).toEqual(s.games[0].salesHistory);
  });
});
