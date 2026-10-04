import type { GameState, OwnConsole, ReleasedGame } from "../types";
import { PLATFORMS } from "../config/platforms";
import { isAssigned } from "../employees/assignment";
import { notify } from "../events/events";
import { marketScale, scaled } from "../economy/scale";
import { bookInvestment } from "../economy/valuation";
import { clamp, date } from "../utils";
import {
  allPlatforms,
  consolePlatform,
  ownConsoles,
  ownPlatformId,
  isOwnPlatform,
  platformShare,
  yearOf,
} from "../market/platforms";

export {
  allPlatforms,
  consolePlatform,
  ownConsoles,
  ownPlatformId,
  isOwnPlatform,
};

/** Studio-Tower or bigger. */
export const CONSOLE_OFFICE = 5;
/** Development budget in 1990 euros; later generations cost more. */
export const CONSOLE_COST = 30_000_000;
/** Work units of a generation; a team of ten experts needs about two years. */
export const CONSOLE_WORK = 9000;
export const CONSOLE_MIN_TEAM = 6;
/** Years a console stays on the market. */
export const CONSOLE_LIFE = 7;
/** Sales bonus of games that appear only on the studio's own console. */
export const EXCLUSIVE_BONUS = 0.25;

export const consoleCost = (s: GameState, generation: number) =>
  scaled(s, CONSOLE_COST * (1 + (generation - 1) * 0.35));
export const consoleWork = (generation: number) =>
  Math.round(CONSOLE_WORK * (1 + (generation - 1) * 0.2));

export const nextGeneration = (s: GameState) =>
  Math.max(0, ...ownConsoles(s).map((c) => c.generation)) + 1;

export function consoleBlocker(s: GameState, team: string[]) {
  if (s.consoleProject) return "Es wird bereits eine Konsole entwickelt.";
  if (s.company.office < CONSOLE_OFFICE)
    return "Eigene Hardware braucht mindestens den Studio-Tower.";
  if (team.length < CONSOLE_MIN_TEAM)
    return `Wähle mindestens ${CONSOLE_MIN_TEAM} Teammitglieder.`;
  if (
    team.some(
      (id) => !s.employees.some((e) => e.id === id) || isAssigned(s, id),
    )
  )
    return "Ein Teammitglied ist bereits verplant.";
  if (s.company.cash < consoleCost(s, nextGeneration(s)))
    return "Für die Entwicklung fehlt Kapital.";
  return null;
}

export function startConsole(s: GameState, name: string, team: string[]) {
  const title = name.trim().slice(0, 32);
  if (!title) throw new Error("Gib deiner Konsole einen Namen.");
  const blocker = consoleBlocker(s, team);
  if (blocker) throw new Error(blocker);
  const generation = nextGeneration(s);
  const budget = consoleCost(s, generation);
  s.company.cash -= budget;
  s.finances.at(-1)!.expenses += budget;
  bookInvestment(s, budget);
  s.consoleProject = {
    name: title,
    generation,
    team: [...team],
    work: consoleWork(generation),
    done: 0,
    budget,
    started: s.day,
  };
  notify(
    s,
    "Hardware-Labor eröffnet",
    `Die Entwicklung von ${title} beginnt.`,
    "success",
  );
}

export function cancelConsole(s: GameState) {
  if (!s.consoleProject) return;
  notify(
    s,
    "Hardware gestoppt",
    `${s.consoleProject.name} wurde eingestellt.`,
    "warning",
  );
  s.consoleProject = null;
}

/** Daily work of the hardware team: programming, art and design count. */
export function consoleSpeed(s: GameState, team: string[]) {
  return s.employees
    .filter((e) => team.includes(e.id))
    .reduce(
      (n, e) =>
        n +
        (e.skills.programming * 0.6 +
          e.skills.art * 0.2 +
          e.skills.design * 0.2) /
          60,
      0,
    );
}

export const consoleProgress = (s: GameState) =>
  s.consoleProject ? (s.consoleProject.done / s.consoleProject.work) * 100 : 0;

/** Most powerful platform on the market today. */
const topPower = (day: number) =>
  Math.max(
    ...PLATFORMS.filter((p) => yearOf(day) >= p.year).map((p) => p.power),
  );

export function consoleTick(s: GameState) {
  const p = s.consoleProject;
  if (p) {
    p.done = Math.min(p.work, p.done + consoleSpeed(s, p.team));
    if (p.done >= p.work) {
      const c: OwnConsole = {
        id: `${s.day}-${p.generation}`,
        name: p.name,
        generation: p.generation,
        launched: s.day,
        end: s.day + CONSOLE_LIFE * 365,
        power: Math.round(topPower(s.day) * 1.15),
        installed: 0,
        licenseRevenue: 0,
      };
      s.consoles = [...ownConsoles(s), c];
      s.consoleProject = null;
      s.company.reputation = clamp(s.company.reputation + 6);
      s.company.fans += 50000;
      notify(
        s,
        `${c.name} ist im Handel`,
        `Deine eigene Konsole ist erschienen. Andere Studios zahlen Lizenzgebühren, und deine Spiele für ${c.name} gelten als Exklusivtitel.`,
        "success",
      );
    }
  }
}

/** Consoles sold this month: hype from exclusives, reputation and life cycle. */
export function consoleMonthlySales(s: GameState, c: OwnConsole) {
  const platform = consolePlatform(c);
  const life = platformShare(platform, s.day) / platform.share;
  if (life <= 0) return 0;
  const exclusives = s.games.filter(
    (g) =>
      g.platforms.includes(ownPlatformId(c)) &&
      s.day - g.releasedDay < 365 &&
      g.score >= 7,
  );
  const pull = 1 + exclusives.reduce((n, g) => n + (g.score - 6) * 0.08, 0);
  return Math.round(450_000 * life * pull * (0.5 + s.company.reputation / 100));
}

/** Monthly hardware sales and license fees from other studios. */
export function payConsoles(s: GameState) {
  let total = 0;
  for (const c of ownConsoles(s)) {
    const sold = consoleMonthlySales(s, c);
    c.installed += sold;
    if (s.day > c.end + 365) continue;
    // Third-party studios pay per console in households.
    const fees = Math.round(c.installed * 0.25 * marketScale(s));
    c.licenseRevenue += fees;
    total += fees;
  }
  if (!total) return 0;
  s.company.cash += total;
  s.finances.at(-1)!.revenue += total;
  return total;
}

/** Own-console games: exclusives sell better (on top of the platform reach). */
export function exclusiveFactor(g: Pick<ReleasedGame, "platforms">) {
  if (!g.platforms.some(isOwnPlatform)) return 1;
  return g.platforms.every(isOwnPlatform) ? 1 + EXCLUSIVE_BONUS : 1.1;
}

export const consoleYear = (c: OwnConsole) => date(c.launched).getUTCFullYear();
