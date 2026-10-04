import type { Employee, GameProject, GameState, Skill } from "../types";
import { clamp, random } from "../utils";
import { notify } from "../events/events";
import { marketScale, nice } from "../economy/scale";

export interface Perk {
  id: string;
  name: string;
  skill: Skill;
  description: string;
  /** Quality bonus per design focus (and `any` for all games). */
  quality?: Partial<Record<NonNullable<GameProject["designFocus"]> | "any", number>>;
}

export const PERK_THRESHOLD = 80;
export const PERKS: Perk[] = [
  { id: "vision", name: "Visionär", skill: "design", description: "+2,5 Qualität bei Spielsystemen, +1 bei allen anderen Spielen.", quality: { systems: 2.5, any: 1 } },
  { id: "engine", name: "Engine-Guru", skill: "programming", description: "Engines 25 % schneller, 10 % weniger Bugs im Team." },
  { id: "artdir", name: "Art Director", skill: "art", description: "+2,5 Qualität bei Atmosphäre, +1 bei allen anderen Spielen.", quality: { atmosphere: 2.5, any: 1 } },
  { id: "sound", name: "Klangmagier", skill: "audio", description: "+2 Qualität bei Atmosphäre, +0,5 bei allen anderen Spielen.", quality: { atmosphere: 2, any: 0.5 } },
  { id: "story", name: "Story-Talent", skill: "writing", description: "+1,5 Qualität für jedes Spiel.", quality: { any: 1.5 } },
  { id: "marketing", name: "Marketing-Ass", skill: "marketing", description: "+25 % Hype durch Kampagnen." },
  { id: "lead", name: "Teamleiter", skill: "management", description: "Sein Projektteam arbeitet 8 % schneller." },
  { id: "research", name: "Forschungsleiter", skill: "research", description: "+15 % Forschungspunkte für das Studio." },
];
export const perkById = (id?: string) => PERKS.find((p) => p.id === id);
export const hasPerk = (team: Employee[], id: string) => team.some((e) => e.perk === id);
export const countPerk = (s: GameState, id: string) => s.employees.filter((e) => e.perk === id).length;

/** Quality bonus from specialists in a project team (capped at +6). */
export function perkQuality(s: GameState, p: Pick<GameProject, "team" | "designFocus">) {
  const focus = p.designFocus ?? "systems";
  const total = s.employees
    .filter((e) => p.team.includes(e.id))
    .reduce((n, e) => {
      const q = perkById(e.perk)?.quality;
      return n + (q ? (q[focus] ?? q.any ?? 0) : 0);
    }, 0);
  return Math.min(6, total);
}

/** Specialists unlock once a skill reaches the threshold. */
export function unlockPerks(s: GameState) {
  for (const e of s.employees) {
    if (e.perk) continue;
    const best = PERKS.filter((p) => e.skills[p.skill] >= PERK_THRESHOLD).sort(
      (a, b) => e.skills[b.skill] - e.skills[a.skill],
    )[0];
    if (!best) continue;
    e.perk = best.id;
    e.motivation = clamp(e.motivation + 10);
    notify(s, "Spezialisierung freigeschaltet", `${e.name} ist jetzt ${best.name}: ${best.description}`, "success");
  }
}

/** Salary the market would pay for this employee today. */
export function fairSalary(e: Employee, s: Pick<GameState, "day">) {
  const skill = Object.values(e.skills).reduce((n, v) => n + v, 0) / 8;
  return nice((900 + skill * 30) * marketScale(s));
}

const RIVALS = ["Northstar Works", "Cobalt Collective", "Fern Interactive", "Titan Forge", "Lumen Studios"];

/** Monthly loyalty drift and poaching offers for unhappy staff. */
export function loyaltyTick(s: GameState) {
  for (const e of s.employees) {
    if (e.role === "Gründer") {
      e.loyalty = 100;
      continue;
    }
    const underpaid = e.salary < fairSalary(e, s) * 0.85 ? 15 : 0;
    const target =
      55 + (e.motivation - 60) * 0.5 - Math.max(0, e.stress - 50) * 0.6 - underpaid + (e.perk ? -5 : 0);
    e.loyalty = clamp(e.loyalty + (target - e.loyalty) * 0.15);
    const pending = s.events.some((ev) => ev.decision === "poach" && ev.target === e.id);
    if (e.loyalty < 35 && !pending && random(s) < 0.3) {
      const rival = RIVALS[Math.floor(random(s) * RIVALS.length)];
      notify(
        s,
        "Abwerbeversuch",
        `${rival} will ${e.name} abwerben. Ein Gegenangebot (+20 % Gehalt) hält ${e.name} im Team, sonst kündigt ${e.name} in 14 Tagen.`,
        "warning",
        "poach",
      );
      s.events[0].target = e.id;
    }
  }
}

/** Removes an employee from the studio and all assignments. */
export function dismiss(s: GameState, id: string) {
  const e = s.employees.find((x) => x.id === id);
  if (!e || e.role === "Gründer") return;
  s.employees = s.employees.filter((x) => x.id !== id);
  for (const p of s.projects) p.team = p.team.filter((m) => m !== id);
  if (s.engineProject) s.engineProject.team = s.engineProject.team.filter((m) => m !== id);
  for (const c of s.contracts.active) c.team = c.team.filter((m) => m !== id);
}

export function resolvePoach(s: GameState, eventId: string, keep: boolean) {
  const event = s.events.find((ev) => ev.id === eventId);
  if (!event || event.decision !== "poach") return;
  const e = s.employees.find((x) => x.id === event.target);
  delete event.decision;
  event.read = true;
  if (!e) return;
  if (keep) {
    const raise = nice(e.salary * 0.2);
    e.salary += raise;
    e.loyalty = clamp(e.loyalty + 35);
    e.motivation = clamp(e.motivation + 10);
    notify(s, "Gegenangebot angenommen", `${e.name} bleibt im Studio (+${raise.toLocaleString("de-DE")} € Gehalt).`, "success");
  } else {
    dismiss(s, e.id);
    notify(s, "Kündigung", `${e.name} hat das Studio verlassen.`, "warning");
  }
}

/** Unanswered poaching offers end with the employee leaving. */
export function expirePoaching(s: GameState) {
  for (const ev of s.events)
    if (ev.decision === "poach" && s.day - ev.day >= 14) resolvePoach(s, ev.id, false);
}
