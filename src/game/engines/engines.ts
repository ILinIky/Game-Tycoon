import type {
  Employee,
  Engine,
  EngineInput,
  GameProject,
  GameState,
} from "../types";
import { ENGINE, ENGINE_PHASES, ENGINE_PROFILES } from "../config/engines";
import { TECHNOLOGIES } from "../config/technologies";
import { techById, techEffects, techLevel } from "../research/research";
import { clamp, random } from "../utils";
import { notify } from "../events/events";
import { scaled } from "../economy/scale";
import { isAssigned } from "../employees/assignment";
export { isAssigned, isWorking } from "../employees/assignment";


/** Researched technologies that can be built into an engine. */
export function availableModules(s: GameState) {
  return TECHNOLOGIES.filter(
    (t) => t.effects.engine && !t.maxLevel && techLevel(s, t.id) > 0,
  );
}

/** All engine-capable technologies, researched or not. */
export const ENGINE_MODULES = TECHNOLOGIES.filter(
  (t) => t.effects.engine && !t.maxLevel,
);

export function engineSpeed(s: GameState, team: string[]) {
  return s.employees
    .filter((e) => team.includes(e.id))
    .reduce(
      (n, e) =>
        n +
        (0.3 + e.skills.programming / 110) *
          (0.7 + e.motivation / 330) *
          (e.perk === "engine" ? 1.25 : 1),
      0,
    );
}

function stabilityFor(s: GameState, input: EngineInput, members: Employee[]) {
  const skill =
    members.reduce((n, e) => n + e.skills.programming, 0) /
    Math.max(1, members.length);
  return Math.round(
    clamp(
      30 +
        skill * 0.4 +
        ENGINE_PROFILES[input.profile].stability +
        techEffects(s).bugs * 40,
      10,
      100,
    ),
  );
}

export function stabilityLevels(stability: number) {
  return stability >= 80 ? 2 : stability >= 55 ? 1 : 0;
}

export function engineLevel(s: GameState, modules: string[], stability: number) {
  return (
    1 +
    modules.reduce((n, id) => n + (techById(id)?.effects.engine ?? 0), 0) +
    techLevel(s, "optimize") +
    stabilityLevels(stability)
  );
}

/** Cost, work, duration and expected result of an engine plan. */
export function enginePlan(s: GameState, input: EngineInput) {
  const base = s.engines.find((e) => e.id === input.baseId);
  const members = s.employees.filter((e) => input.team.includes(e.id));
  const inBase = (id: string) => !!base?.modules.includes(id);
  const work = Math.round(
    ENGINE.baseWork * (base ? 0.6 : 1) +
      input.modules.reduce(
        (n, id) => n + ENGINE.moduleWork * (inBase(id) ? ENGINE.upgradeFactor : 1),
        0,
      ),
  );
  const cost = scaled(
    s,
    ENGINE.baseCost * (base ? 0.6 : 1) +
      input.modules.reduce(
        (n, id) => n + ENGINE.moduleCost * (inBase(id) ? ENGINE.upgradeFactor : 1),
        0,
      ),
  );
  const stability = stabilityFor(s, input, members);
  const speed = engineSpeed(s, input.team);
  return {
    work,
    cost,
    stability,
    speed,
    days: speed ? Math.ceil(work / speed) : Infinity,
    level: engineLevel(s, input.modules, stability),
    version: base ? (base.version ?? 1) + 1 : 1,
  };
}

export function startEngine(s: GameState, input: EngineInput) {
  const plan = enginePlan(s, input);
  const modules = availableModules(s).map((t) => t.id);
  if (s.engineProject) throw new Error("Es läuft bereits eine Engine-Entwicklung.");
  if (!input.name.trim()) throw new Error("Gib deiner Engine einen Namen.");
  if (!input.team.length || input.team.length > ENGINE.maxTeam)
    throw new Error(`Weise 1 bis ${ENGINE.maxTeam} Teammitglieder zu.`);
  if (input.team.some((id) => !s.employees.some((e) => e.id === id) || isAssigned(s, id)))
    throw new Error("Ein Teammitglied ist bereits einem Projekt zugewiesen.");
  if (!input.modules.every((id) => modules.includes(id)))
    throw new Error("Nur erforschte Module können integriert werden.");
  if (input.baseId && !s.engines.some((e) => e.id === input.baseId))
    throw new Error("Die Basis-Engine existiert nicht.");
  if (s.company.cash < plan.cost)
    throw new Error("Dafür reicht dein Budget aktuell nicht.");
  s.company.cash -= plan.cost;
  s.finances.at(-1)!.expenses += plan.cost;
  s.engineProject = {
    name: input.name.trim(),
    version: plan.version,
    baseId: input.baseId,
    profile: input.profile,
    modules: [...input.modules],
    team: [...input.team],
    work: plan.work,
    done: 0,
    stability: plan.stability,
    budget: plan.cost,
    started: s.day,
  };
  notify(
    s,
    "Die Engine-Schmiede läuft",
    `${input.name.trim()} ${plan.version > 1 ? `v${plan.version} ` : ""}ist in Entwicklung.`,
    "success",
  );
}

export function cancelEngine(s: GameState) {
  if (!s.engineProject) throw new Error("Es läuft keine Engine-Entwicklung.");
  notify(
    s,
    "Engine-Entwicklung gestoppt",
    `${s.engineProject.name} wurde abgebrochen. Das Team ist wieder frei.`,
    "warning",
  );
  s.engineProject = null;
}

export const engineProgress = (p: NonNullable<GameState["engineProject"]>) =>
  clamp((p.done / p.work) * 100);

/** Index of the current phase for a progress in percent. */
export function enginePhase(progress: number) {
  let sum = 0;
  for (let i = 0; i < ENGINE_PHASES.length; i++) {
    sum += ENGINE_PHASES[i].share * 100;
    if (progress < sum) return i;
  }
  return ENGINE_PHASES.length - 1;
}

/** Number of modules already docked during the integration phase. */
export function dockedModules(p: NonNullable<GameState["engineProject"]>) {
  const progress = engineProgress(p);
  const start = (ENGINE_PHASES[0].share + ENGINE_PHASES[1].share) * 100;
  const span = ENGINE_PHASES[2].share * 100;
  return Math.floor(clamp((progress - start) / span, 0, 1) * p.modules.length);
}

export function engineTick(s: GameState) {
  const p = s.engineProject;
  if (!p) return;
  const before = enginePhase(engineProgress(p));
  const docked = dockedModules(p);
  p.done = Math.min(p.work, p.done + engineSpeed(s, p.team));
  const phase = enginePhase(engineProgress(p));
  if (dockedModules(p) > docked)
    notify(
      s,
      "Modul angedockt",
      `${techById(p.modules[dockedModules(p) - 1])?.name} ist jetzt Teil von ${p.name}.`,
    );
  if (phase !== before)
    notify(s, "Neue Engine-Phase", `${p.name}: ${ENGINE_PHASES[phase].name} beginnt.`);
  if (phase === 3 && p.done < p.work) {
    const roll = random(s);
    if (roll < 0.02) {
      p.stability = clamp(p.stability + 6);
      notify(s, "Sauberer Code", `Das Team optimiert ${p.name}: +6 Stabilität.`, "success");
    } else if (roll > 0.985) {
      p.stability = clamp(p.stability - 5);
      p.done = Math.max(0, p.done - p.work * 0.04);
      notify(s, "Speicherleck entdeckt", `${p.name} verliert Zeit und Stabilität.`, "warning");
    }
  }
  if (p.done < p.work) return;
  const engine: Engine = {
    id: `engine-${s.day}-${s.engines.length}`,
    name: p.name,
    level: engineLevel(s, p.modules, p.stability),
    modules: ["2D Rendering", ...p.modules],
    version: p.version,
    profile: p.profile,
    stability: p.stability,
    created: s.day,
    games: 0,
    licensed: false,
    licenseRevenue: 0,
  };
  s.engines.push(engine);
  for (const e of s.employees.filter((e) => p.team.includes(e.id))) {
    e.skills.programming = clamp(e.skills.programming + 2);
    e.experience += 0.2;
  }
  s.engineProject = null;
  notify(
    s,
    "Engine fertiggestellt",
    `${engine.name}${engine.version! > 1 ? ` v${engine.version}` : ""} erreicht Level ${engine.level} und ist für neue Spiele bereit.`,
    "success",
  );
}

/** Bonuses a game receives from the engine it is built with. */
export function engineBonus(
  s: GameState,
  engineId: string,
  focus?: GameProject["designFocus"],
) {
  const e = s.engines.find((x) => x.id === engineId);
  if (!e) return { quality: 2, profile: 0, routine: 0, bugs: 0, exclusivity: 0 };
  const profile = e.profile
    ? ENGINE_PROFILES[e.profile].focus === null
      ? ENGINE.allroundBonus
      : ENGINE_PROFILES[e.profile].focus === (focus ?? "systems")
        ? ENGINE.profileBonus
        : 0
    : 0;
  const exclusivity = e.licensed ? ENGINE.exclusivityPenalty : 0;
  return {
    quality: e.level * 2 + profile - exclusivity,
    profile,
    exclusivity,
    routine: Math.min(ENGINE.routineMax, (e.games ?? 0) * ENGINE.routinePerGame),
    bugs: (e.stability ?? 0) / 250,
  };
}

/** Researched engine modules missing in an engine. */
export function missingModules(s: GameState, e: Engine) {
  return availableModules(s).filter((t) => !e.modules.includes(t.id));
}

export function licenseIncome(s: GameState, e: Engine) {
  if (!e.licensed) return 0;
  const age = (s.day - (e.created ?? 0)) / 365;
  const freshness = Math.max(0.15, 1 - age * 0.18);
  return scaled(
    s,
    e.level ** 2 *
      ENGINE.licenseBase *
      freshness *
      (1 + s.company.reputation / 200),
  );
}

export function toggleLicense(s: GameState, id: string) {
  const e = s.engines.find((x) => x.id === id);
  if (!e) throw new Error("Engine nicht gefunden.");
  if (!e.licensed && e.level < ENGINE.licenseMinLevel)
    throw new Error(`Lizenzen sind ab Engine-Level ${ENGINE.licenseMinLevel} gefragt.`);
  e.licensed = !e.licensed;
  notify(
    s,
    e.licensed ? "Engine lizenziert" : "Lizenzprogramm beendet",
    e.licensed
      ? `Andere Studios nutzen jetzt ${e.name}. Monatlich fließen Lizenzgebühren.`
      : `${e.name} ist wieder exklusiv für dein Studio.`,
    e.licensed ? "success" : "info",
  );
}

/** Monthly license payments; returns the total. */
export function payLicenses(s: GameState) {
  let total = 0;
  for (const e of s.engines) {
    const income = licenseIncome(s, e);
    if (!income) continue;
    e.licenseRevenue = (e.licenseRevenue ?? 0) + income;
    total += income;
  }
  if (total) {
    s.company.cash += total;
    s.finances.at(-1)!.revenue += total;
    notify(
      s,
      "Lizenzeinnahmen",
      `Andere Studios zahlen ${Math.round(total).toLocaleString("de-DE")} € für deine Engines.`,
      "success",
    );
  }
  return total;
}
