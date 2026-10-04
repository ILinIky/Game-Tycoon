import type { Employee, GameProject, GameState, Skill } from "../types";
import { clamp, random } from "../utils";
import { notify } from "../events/events";
import { BALANCE } from "../config/balance";
import { facilityEffects } from "../office/office";
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
  return nice((600 + skill * 26) * marketScale(s));
}

const RIVALS = ["Northstar Works", "Cobalt Collective", "Fern Interactive", "Titan Forge", "Lumen Studios"];

/** Days an employee waits for a counter-offer before resigning. */
export const POACH_DAYS = 14;
/** Days between two salary requests of the same employee. */
const SALARY_REQUEST_COOLDOWN = 120;

const isUnderpaid = (e: Employee, s: Pick<GameState, "day">) => e.salary < fairSalary(e, s) * 0.9;

/** Salary that keeps an employee: at least the market value, at least +20 %. */
export function retentionSalary(e: Employee, s: Pick<GameState, "day">) {
  return Math.max(nice(e.salary * 1.2), fairSalary(e, s));
}

/** Readable reasons why an employee is unhappy, most important first. */
export function unrestReasons(e: Employee, s: Pick<GameState, "day">) {
  const reasons: string[] = [];
  if (isUnderpaid(e, s))
    reasons.push(
      `Gehalt unter Marktwert (${e.salary.toLocaleString("de-DE")} € statt ${fairSalary(e, s).toLocaleString("de-DE")} €)`,
    );
  if (e.stress > 60) reasons.push(`zu viel Stress (${Math.round(e.stress)} %)`);
  if (e.motivation < 45) reasons.push(`wenig Motivation (${Math.round(e.motivation)} %)`);
  return reasons;
}

const pendingFor = (s: GameState, id: string, decision?: "poach" | "salary") =>
  s.events.some((ev) => ev.target === id && (decision ? ev.decision === decision : ev.decision === "poach" || ev.decision === "salary"));

/** Monthly loyalty drift, salary requests and poaching offers for unhappy staff. */
export function loyaltyTick(s: GameState) {
  for (const e of s.employees) {
    if (e.role === "Gründer") {
      e.loyalty = 100;
      continue;
    }
    const underpaid = e.salary < fairSalary(e, s) * 0.85 ? 15 : 0;
    const target =
      55 + (e.motivation - 60) * 0.5 - Math.max(0, e.stress - 50) * 0.6 - underpaid + (e.perk ? -5 : 0);
    e.loyalty = clamp(
      e.loyalty + (target - e.loyalty) * 0.15 + facilityEffects(s).loyalty,
    );
    // Staff ask for a raise first, before rivals get a chance.
    const recentRequest = s.events.some(
      (ev) => ev.target === e.id && ev.title === "Gehaltswunsch" && s.day - ev.day < SALARY_REQUEST_COOLDOWN,
    );
    if (isUnderpaid(e, s) && e.loyalty < 65 && !recentRequest && !pendingFor(s, e.id)) {
      notify(
        s,
        "Gehaltswunsch",
        `${e.name} wünscht sich mehr Gehalt: ${fairSalary(e, s).toLocaleString("de-DE")} € statt ${e.salary.toLocaleString("de-DE")} € im Monat. Ohne Erhöhung sinkt die Loyalität weiter und Konkurrenten versuchen, ${e.name} abzuwerben.`,
        "warning",
        "salary",
      );
      s.events[0].target = e.id;
      continue;
    }
    if (e.loyalty < 35 && !pendingFor(s, e.id, "poach") && random(s) < 0.3) {
      const rival = RIVALS[Math.floor(random(s) * RIVALS.length)];
      const reasons = unrestReasons(e, s);
      notify(
        s,
        "Kündigung droht",
        `${rival} will ${e.name} abwerben${reasons.length ? `. Grund: ${reasons.join(", ")}` : ""}. Mit ${retentionSalary(e, s).toLocaleString("de-DE")} € Gehalt bleibt ${e.name}, sonst kündigt ${e.name} in ${POACH_DAYS} Tagen.`,
        "warning",
        "poach",
      );
      s.events[0].target = e.id;
      // Pause, so the offer cannot run out unnoticed at high speed.
      s.speed = 0;
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
  if (s.consoleProject) s.consoleProject.team = s.consoleProject.team.filter((m) => m !== id);
  for (const c of s.contracts.active) c.team = c.team.filter((m) => m !== id);
  closeDecisions(s, id);
}

/** Severance for letting an employee go: one monthly salary. */
export const severancePay = (e: Employee) => e.salary;

/** Lets an employee go; the rest of the team is a little unsettled. */
export function fireEmployee(s: GameState, id: string) {
  const e = s.employees.find((x) => x.id === id);
  if (!e) throw new Error("Mitarbeiter nicht gefunden.");
  if (e.role === "Gründer") throw new Error("Den Gründer kannst du nicht entlassen.");
  const pay = severancePay(e);
  if (s.company.cash < pay) throw new Error("Für die Abfindung fehlt Kapital.");
  s.company.cash -= pay;
  s.finances.at(-1)!.expenses += pay;
  dismiss(s, id);
  for (const other of s.employees)
    if (other.role !== "Gründer") other.motivation = clamp(other.motivation - 3);
  notify(s, "Trennung", `${e.name} verlässt das Studio (Abfindung ${pay.toLocaleString("de-DE")} €).`, "info");
}

/** Closes all open salary and poaching decisions of an employee. */
function closeDecisions(s: GameState, id: string) {
  for (const ev of s.events)
    if (ev.target === id && (ev.decision === "poach" || ev.decision === "salary")) {
      delete ev.decision;
      ev.read = true;
    }
}

export function resolvePoach(s: GameState, eventId: string, keep: boolean) {
  const event = s.events.find((ev) => ev.id === eventId);
  if (!event || event.decision !== "poach") return;
  const e = s.employees.find((x) => x.id === event.target);
  delete event.decision;
  event.read = true;
  if (!e) return;
  if (keep) {
    const salary = retentionSalary(e, s);
    const raise = salary - e.salary;
    e.salary = salary;
    e.loyalty = clamp(e.loyalty + 35);
    e.motivation = clamp(e.motivation + 10);
    e.stress = clamp(e.stress - 15);
    closeDecisions(s, e.id);
    notify(s, "Gegenangebot angenommen", `${e.name} bleibt im Studio (+${raise.toLocaleString("de-DE")} € Gehalt).`, "success");
  } else {
    dismiss(s, e.id);
    notify(s, "Kündigung", `${e.name} hat das Studio verlassen.`, "warning");
  }
}

/** Answers a single employee's salary request. */
export function resolveSalary(s: GameState, eventId: string, accept: boolean) {
  const event = s.events.find((ev) => ev.id === eventId);
  if (!event || event.decision !== "salary") return;
  const e = s.employees.find((x) => x.id === event.target);
  delete event.decision;
  event.read = true;
  if (!e) return;
  if (accept) {
    const salary = Math.max(e.salary, fairSalary(e, s));
    const raise = salary - e.salary;
    e.salary = salary;
    e.loyalty = clamp(e.loyalty + 25);
    e.motivation = clamp(e.motivation + 8);
    notify(s, "Gehalt angepasst", `${e.name} verdient jetzt ${salary.toLocaleString("de-DE")} € (+${raise.toLocaleString("de-DE")} €).`, "success");
  } else {
    e.loyalty = clamp(e.loyalty - 5);
    e.motivation = clamp(e.motivation - 6);
  }
}

/** Raises an underpaid employee to the market value on the player's initiative. */
export function adjustSalary(s: GameState, id: string) {
  const e = s.employees.find((x) => x.id === id);
  if (!e || e.role === "Gründer") return;
  const salary = fairSalary(e, s);
  if (salary <= e.salary) throw new Error(`${e.name} verdient bereits den Marktwert.`);
  e.salary = salary;
  e.loyalty = clamp(e.loyalty + 20);
  e.motivation = clamp(e.motivation + 8);
  closeDecisions(s, e.id);
  notify(s, "Gehalt angepasst", `${e.name} verdient jetzt ${salary.toLocaleString("de-DE")} € im Monat.`, "success");
}

/** New salary of every employee after the yearly team raise. */
export const teamRaiseSalary = (e: Employee, s: Pick<GameState, "day">) =>
  Math.max(Math.round(e.salary * BALANCE.raiseFactor), fairSalary(e, s));

/** Additional monthly costs of the yearly team raise. */
export const teamRaiseCost = (s: GameState) =>
  s.employees
    .filter((e) => e.role !== "Gründer")
    .reduce((n, e) => n + teamRaiseSalary(e, s) - e.salary, 0);

/** Answers the yearly team-wide raise request. */
export function resolveTeamRaise(s: GameState, eventId: string, accept: boolean) {
  const event = s.events.find((ev) => ev.id === eventId);
  if (!event || event.decision !== "raise") return;
  for (const e of s.employees.filter((e) => e.role !== "Gründer")) {
    if (accept) {
      e.salary = teamRaiseSalary(e, s);
      e.motivation = clamp(e.motivation + 15);
      e.loyalty = clamp(e.loyalty + 12);
      closeDecisions(s, e.id);
    } else {
      e.motivation = clamp(e.motivation - 12);
      e.loyalty = clamp(e.loyalty - 10);
    }
  }
  delete event.decision;
  event.read = true;
}

/** Days until an unanswered poaching offer ends with a resignation. */
export const poachDaysLeft = (s: GameState, eventDay: number) => Math.max(0, POACH_DAYS - (s.day - eventDay));

/** Unanswered poaching offers end with the employee leaving. */
export function expirePoaching(s: GameState) {
  for (const ev of s.events)
    if (ev.decision === "poach" && s.day - ev.day >= POACH_DAYS) resolvePoach(s, ev.id, false);
}
