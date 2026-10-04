import { describe, expect, it } from "vitest";
import { initialState } from "../initial";
import { tick } from "../simulation/tick";
import { createProject, projectDuration, quality } from "../projects/projects";
import { validateSave } from "../persistence/saves";
import {
  cancelEngine,
  dockedModules,
  engineBonus,
  enginePlan,
  isAssigned,
  licenseIncome,
  missingModules,
  payLicenses,
  startEngine,
  toggleLicense,
} from "./engines";
import type { EngineInput, GameState, ProjectInput } from "../types";

const game: ProjectInput = {
  name: "Orbital Letters",
  genre: "Strategie",
  theme: "Weltraum",
  platforms: ["pc"],
  audience: "Teen",
  size: "Indie",
  team: ["founder"],
  engine: "basic",
  designFocus: "atmosphere",
};
const engine: EngineInput = {
  name: "Aurora",
  baseId: null,
  profile: "graphics",
  modules: ["sprites", "audio"],
  team: ["founder"],
};
function founded() {
  const s = initialState();
  s.company.founded = true;
  s.technologies.push("sprites", "audio");
  return s;
}
function finish(s: GameState) {
  for (let i = 0; i < 400 && s.engineProject; i++) s = tick(s);
  return s;
}

describe("Engine-Schmiede", () => {
  it("entwickelt eine Engine in Phasen mit zugewiesenem Team", () => {
    let s = founded();
    const plan = enginePlan(s, engine);
    startEngine(s, engine);
    expect(s.company.cash).toBe(50000 - plan.cost);
    expect(isAssigned(s, "founder")).toBe(true);
    expect(() => createProject(s, game)).toThrow();
    s = tick(s);
    expect(s.engineProject!.done).toBeGreaterThan(0);
    s = finish(s);
    const built = s.engines.at(-1)!;
    expect(built.name).toBe("Aurora");
    expect(built.profile).toBe("graphics");
    expect(built.level).toBeGreaterThanOrEqual(3);
    expect(isAssigned(s, "founder")).toBe(false);
  });

  it("dockt Module während der Integrationsphase an", () => {
    const s = founded();
    startEngine(s, engine);
    const p = s.engineProject!;
    p.done = p.work * 0.4;
    expect(dockedModules(p)).toBe(0);
    p.done = p.work * 0.7;
    expect(dockedModules(p)).toBe(2);
  });

  it("lehnt unerforschte Module und doppelte Entwicklung ab", () => {
    const s = founded();
    expect(() => startEngine(s, { ...engine, modules: ["3d"] })).toThrow();
    startEngine(s, engine);
    expect(() => startEngine(s, engine)).toThrow();
    cancelEngine(s);
    expect(s.engineProject).toBeNull();
  });

  it("gibt Profil-, Routine- und Stabilitätsboni an Spiele weiter", () => {
    let s = founded();
    startEngine(s, engine);
    s = finish(s);
    const id = s.engines.at(-1)!.id;
    const atmosphere = engineBonus(s, id, "atmosphere");
    const systems = engineBonus(s, id, "systems");
    expect(atmosphere.quality - systems.quality).toBe(4);
    expect(atmosphere.bugs).toBeGreaterThan(0);
    createProject(s, { ...game, engine: id });
    expect(quality(s, s.projects[0])).toBeGreaterThan(0);
    const before = projectDuration(s, { ...game, engine: id });
    s.engines.at(-1)!.games = 3;
    expect(projectDuration(s, { ...game, engine: id })).toBeLessThan(before);
  });

  it("macht Upgrades günstiger und erkennt fehlende Module", () => {
    let s = founded();
    startEngine(s, engine);
    s = finish(s);
    const base = s.engines.at(-1)!;
    s.technologies.push("mode7");
    expect(missingModules(s, base).map((t) => t.id)).toEqual(["mode7"]);
    const fresh = enginePlan(s, { ...engine, modules: ["sprites", "audio", "mode7"] });
    const upgrade = enginePlan(s, {
      ...engine,
      baseId: base.id,
      modules: ["sprites", "audio", "mode7"],
    });
    expect(upgrade.cost).toBeLessThan(fresh.cost);
    expect(upgrade.work).toBeLessThan(fresh.work);
    expect(upgrade.version).toBe(2);
  });

  it("zahlt Lizenzgebühren und kostet Exklusivität", () => {
    let s = founded();
    startEngine(s, engine);
    s = finish(s);
    const e = s.engines.at(-1)!;
    expect(() => toggleLicense(s, "basic")).toThrow();
    const exclusive = engineBonus(s, e.id, "atmosphere").quality;
    toggleLicense(s, e.id);
    expect(engineBonus(s, e.id, "atmosphere").quality).toBe(exclusive - 2);
    const cash = s.company.cash;
    const paid = payLicenses(s);
    expect(paid).toBe(licenseIncome(s, e));
    expect(s.company.cash).toBe(cash + paid);
    expect(e.licenseRevenue).toBe(paid);
  });

  it("speichert und lädt laufende Engine-Entwicklung", () => {
    const s = founded();
    startEngine(s, engine);
    const loaded = validateSave(JSON.parse(JSON.stringify(s)) as unknown);
    expect(loaded.engineProject?.name).toBe("Aurora");
    const old = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    delete old.engineProject;
    expect(validateSave(old).engineProject).toBeNull();
  });
});
