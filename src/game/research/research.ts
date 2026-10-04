import { countPerk } from "../employees/perks";
import type {
  Genre,
  GameState,
  ResearchFocus,
  TechEffects,
  Technology,
} from "../types";
import { BALANCE, OFFICES } from "../config/balance";
import { LABS, RESEARCH_FOCUS, TECHNOLOGIES } from "../config/technologies";
import { clamp, date, random } from "../utils";
import { notify } from "../events/events";
import { isWorking } from "../employees/assignment";
import { scaled } from "../economy/scale";
import { facilityEffects } from "../office/office";

export type TechStatus =
  | "done"
  | "active"
  | "available"
  | "locked"
  | "future"
  | "maxed";

export const techById = (id: string) => TECHNOLOGIES.find((t) => t.id === id);

/** Completed levels of a technology (1 for normal ones once researched). */
export function techLevel(s: GameState, id: string) {
  return s.researchLevels[id] ?? (s.technologies.includes(id) ? 1 : 0);
}

export function lab(s: GameState) {
  return LABS[s.lab.level] ?? LABS[0];
}

type Totals = Required<Omit<TechEffects, "genres">> & {
  genres: Partial<Record<Genre, number>>;
};

/** Sum of all researched technology effects, including program levels. */
export function techEffects(s: GameState): Totals {
  const total: Totals = {
    quality: 0,
    speed: 0,
    cost: 0,
    bugs: 0,
    sales: 0,
    longTail: 0,
    hype: 0,
    campaign: 0,
    fans: 0,
    research: 0,
    labSpeed: 0,
    engine: 0,
    genres: {},
  };
  for (const t of TECHNOLOGIES) {
    const level = techLevel(s, t.id);
    if (!level) continue;
    const { genres, ...rest } = t.effects;
    for (const [key, value] of Object.entries(rest) as [
      keyof typeof rest,
      number,
    ][])
      total[key] += value * level;
    for (const [genre, value] of Object.entries(genres ?? {}) as [
      Genre,
      number,
    ][])
      total.genres[genre] = (total.genres[genre] ?? 0) + value * level;
  }
  total.speed = Math.min(total.speed, 0.45);
  total.cost = Math.min(total.cost, 0.35);
  total.bugs = Math.min(total.bugs, 0.6);
  return total;
}

/** Technologies the press already expects but the studio lacks. */
export function missingStandards(s: GameState) {
  const year = date(s.day).getUTCFullYear();
  return TECHNOLOGIES.filter(
    (t) => t.standard !== undefined && year >= t.standard && !techLevel(s, t.id),
  );
}

/** Rising expectations of players and press over the years. */
export function marketExpectation(s: GameState) {
  const year = date(s.day).getUTCFullYear();
  return (
    Math.max(0, year - BALANCE.expectationStart) * BALANCE.expectationPerYear
  );
}

export function standardPenalty(s: GameState) {
  return Math.min(
    BALANCE.standardPenaltyMax,
    missingStandards(s).length * BALANCE.standardPenalty,
  );
}

/** Quality contribution of research for a game of the given genre. */
export function techQuality(s: GameState, genre: Genre) {
  const e = techEffects(s);
  return e.quality + (e.genres[genre] ?? 0) - standardPenalty(s);
}

export function researchCost(s: GameState, t: Technology) {
  const level = t.maxLevel ? techLevel(s, t.id) : 0;
  return {
    points: Math.round(t.points * (1 + level * 0.6)),
    cost: scaled(s, t.cost * (1 + level * 0.5)),
    days: Math.round(t.days * (1 + level * 0.25)),
  };
}

export function researchSpeed(s: GameState) {
  return (
    lab(s).speed *
    RESEARCH_FOCUS[s.lab.focus].speed *
    (1 + techEffects(s).labSpeed)
  );
}

/** Research points earned per day by the whole team. */
export function researchIncome(s: GameState) {
  const base = s.employees.reduce((sum, e) => {
    const busy = isWorking(s, e.id);
    return (
      sum +
      (0.08 + e.skills.research / 500) * (busy ? 1 : BALANCE.idleResearch)
    );
  }, 0);
  return (
    base *
    RESEARCH_FOCUS[s.lab.focus].points *
    (1 +
      lab(s).research +
      techEffects(s).research +
      facilityEffects(s).research +
      countPerk(s, "research") * 0.15)
  );
}

export function releaseResearch(
  s: GameState,
  size: keyof typeof SIZE_RESEARCH,
) {
  return Math.round(
    BALANCE.projectResearch *
      SIZE_RESEARCH[size] *
      (1 + techEffects(s).research),
  );
}
const SIZE_RESEARCH = {
  Indie: 1,
  Small: 1.5,
  Medium: 2.5,
  AAA: 4,
  Blockbuster: 6,
  Mega: 8,
  Legend: 11,
};

export function techStatus(s: GameState, t: Technology): TechStatus {
  if (s.research.some((r) => r.techId === t.id)) return "active";
  const level = techLevel(s, t.id);
  if (t.maxLevel ? level >= t.maxLevel : level > 0)
    return t.maxLevel ? "maxed" : "done";
  if (date(s.day).getUTCFullYear() < t.year) return "future";
  if (!t.requires.every((id) => techLevel(s, id) > 0)) return "locked";
  return "available";
}

/** Reason why research cannot start right now, or null. */
export function researchBlocker(s: GameState, t: Technology) {
  const status = techStatus(s, t);
  if (status === "done" || status === "maxed") return "Bereits erforscht.";
  if (status === "active") return "Wird bereits erforscht.";
  if (status === "future") return `Verfügbar ab ${t.year}.`;
  if (status === "locked")
    return `Benötigt ${t.requires
      .filter((id) => !techLevel(s, id))
      .map((id) => techById(id)?.name ?? id)
      .join(" und ")}.`;
  if (s.research.length >= lab(s).slots)
    return "Alle Forschungsplätze sind belegt.";
  const price = researchCost(s, t);
  if (s.company.researchPoints < price.points)
    return "Zu wenige Forschungspunkte.";
  if (s.company.cash < price.cost) return "Zu wenig Kapital.";
  return null;
}

export function startResearch(s: GameState, id: string) {
  const t = techById(id);
  const blocker = t ? researchBlocker(s, t) : "Unbekannte Technologie.";
  if (!t || blocker)
    throw new Error(
      blocker ?? "Forschung ist noch nicht verfügbar oder Ressourcen fehlen.",
    );
  const price = researchCost(s, t);
  s.company.researchPoints -= price.points;
  s.company.cash -= price.cost;
  s.finances.at(-1)!.expenses += price.cost;
  s.research.push({
    techId: id,
    elapsed: 0,
    duration: price.days,
    points: price.points,
  });
}

/** Stops a research project and refunds half of the invested points. */
export function cancelResearch(s: GameState, id: string) {
  const project = s.research.find((r) => r.techId === id);
  if (!project) throw new Error("Diese Forschung läuft nicht.");
  s.research = s.research.filter((r) => r !== project);
  const refund = Math.floor((project.points ?? 0) / 2);
  s.company.researchPoints += refund;
  notify(
    s,
    "Forschung abgebrochen",
    `${techById(id)?.name ?? id} wurde gestoppt. ${refund} Forschungspunkte fließen zurück.`,
    "warning",
  );
}

export function setResearchFocus(s: GameState, focus: ResearchFocus) {
  if (!RESEARCH_FOCUS[focus]) throw new Error("Unbekannte Ausrichtung.");
  s.lab.focus = focus;
}

export function upgradeLab(s: GameState) {
  const next = LABS[s.lab.level + 1];
  if (!next) throw new Error("Dein Labor ist bereits voll ausgebaut.");
  if (s.company.office < next.office)
    throw new Error(`Dafür brauchst du mindestens ${OFFICES[next.office].name}.`);
  const cost = scaled(s, next.cost);
  if (s.company.cash < cost)
    throw new Error("Dafür reicht dein Budget aktuell nicht.");
  s.company.cash -= cost;
  s.finances.at(-1)!.expenses += cost;
  s.lab.level++;
  notify(
    s,
    "Labor ausgebaut",
    `${next.name}: ${next.slots} Forschungsplätze und ${Math.round((next.speed - 1) * 100)} % mehr Tempo.`,
    "success",
  );
}

/** Daily research progress: points, progress, breakthroughs and setbacks. */
export function researchTick(s: GameState) {
  s.company.researchPoints += researchIncome(s);
  if (!s.research.length) return;
  const speed = researchSpeed(s);
  const focus = RESEARCH_FOCUS[s.lab.focus];
  const talent = Math.max(...s.employees.map((e) => e.skills.research));
  for (const project of [...s.research]) {
    const tech = techById(project.techId)!;
    project.elapsed += speed;
    const roll = random(s);
    if (roll < focus.eureka + talent / 5000) {
      project.elapsed += project.duration * 0.25;
      notify(
        s,
        "Geistesblitz im Labor",
        `Bei ${tech.name} gelingt ein Durchbruch. Die Forschung springt nach vorn.`,
        "success",
      );
    } else if (roll > 1 - focus.setback) {
      project.elapsed = Math.max(0, project.elapsed - project.duration * 0.15);
      notify(
        s,
        "Rückschlag im Labor",
        `Ein Experiment für ${tech.name} ist gescheitert. Das kostet Zeit.`,
        "warning",
      );
    }
    if (project.elapsed < project.duration) continue;
    s.research = s.research.filter((r) => r !== project);
    const level = techLevel(s, tech.id) + 1;
    if (!s.technologies.includes(tech.id)) s.technologies.push(tech.id);
    if (tech.maxLevel) s.researchLevels[tech.id] = level;
    notify(
      s,
      "Forschung abgeschlossen",
      tech.maxLevel
        ? `${tech.name} erreicht Stufe ${level}.`
        : `${tech.name} ist für neue Projekte verfügbar.`,
      "success",
    );
  }
}

/** Research progress in percent, clamped for display. */
export const researchProgress = (p: GameState["research"][number]) =>
  clamp((p.elapsed / p.duration) * 100);

