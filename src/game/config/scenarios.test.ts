import { describe, expect, it } from "vitest";
import { initialState } from "../initial";
import { tick } from "../simulation/tick";
import { applyScenario, scenarioById, SCENARIOS } from "./scenarios";
import { monthlyCosts, sales } from "../economy/economy";
import { createProject, projectCost, release } from "../projects/projects";
import { validateSave } from "../persistence/saves";
import type { ProjectInput } from "../types";

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

describe("Szenarien und Schwierigkeit", () => {
  it("startet spätere Szenarien mit Jahr, Kapital, Team und Technik", () => {
    for (const scenario of SCENARIOS) {
      let s = initialState();
      s.company.founded = true;
      applyScenario(s, scenario);
      expect(new Date(Date.UTC(1990, 0, 1 + s.day)).getUTCFullYear()).toBe(
        scenario.year,
      );
      expect(s.company.cash).toBe(scenario.cash);
      expect(s.employees).toHaveLength(scenario.staff + 1);
      if (scenario.year > 1990)
        expect(s.technologies.length).toBeGreaterThan(5);
      for (let i = 0; i < 40; i++) s = tick(s);
      expect(s.company.bankrupt).toBe(false);
      expect(validateSave(JSON.parse(JSON.stringify(s))).scenario).toBe(
        scenario.id,
      );
    }
  });
  it("macht das Spiel leichter oder schwerer", () => {
    const at = (difficulty: "easy" | "normal" | "hard") => {
      const s = initialState();
      s.company.founded = true;
      s.difficulty = difficulty;
      return s;
    };
    expect(projectCost(at("hard"), input)).toBeGreaterThan(
      projectCost(at("easy"), input),
    );
    expect(monthlyCosts(at("hard"))).toBeGreaterThan(monthlyCosts(at("easy")));
    const revenue = (difficulty: "easy" | "hard") => {
      const s = at(difficulty);
      createProject(s, input);
      const p = s.projects[0];
      p.progress = 100;
      p.elapsed = p.duration;
      release(s, p.id);
      s.day += 2;
      return sales(s);
    };
    expect(revenue("easy")).toBeGreaterThan(revenue("hard"));
    expect(scenarioById("unknown").id).toBe("classic");
  });
});
