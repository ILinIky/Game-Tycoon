import type { GameState } from "../types";
import { BALANCE, PHASES } from "../config/balance";
import { monthlyCosts, sales } from "../economy/economy";
import { clamp, random } from "../utils";
import { notify } from "../events/events";
import { candidates } from "../employees/recruiting";
import { quality } from "../projects/projects";
import { updateMarket } from "../market/market";
import { ambitionFor } from "../config/design";
import { researchTick, techEffects } from "../research/research";
import { engineBonus, engineTick, payLicenses } from "../engines/engines";
import { isWorking } from "../employees/assignment";
import { facilityEffects } from "../office/office";
import { bankruptcyLimit, scaled } from "../economy/scale";
import { processProductionQueue } from "../projects/queue";
import { contractTick } from "../contracts/contracts";
import { pricingTick } from "../projects/pricing";
import {
  expirePoaching,
  hasPerk,
  loyaltyTick,
  teamRaiseCost,
  unlockPerks,
} from "../employees/perks";
import { paySubsidiaries, rivalsTick } from "../market/rivals";
import { payHoldings } from "../market/holdings";
import { expoTick } from "../marketing/expo";
import { yearTick } from "../progress/yearly";
export function tick(source: GameState): GameState {
  if (!source.company.founded || source.company.bankrupt) return source;
  const s = structuredClone(source);
  s.day++;
  if (s.day > 1 && s.day % 30 === 1)
    s.finances.push({
      day: s.day,
      revenue: 0,
      expenses: 0,
      cash: s.company.cash,
    });
  const ledger = s.finances.at(-1)!;
  yearTick(s);
  const facility = facilityEffects(s);
  const bugRate = (1 - techEffects(s).bugs) * (1 - facility.bugs);
  const revenue = sales(s);
  const costs = monthlyCosts(s) / 30;
  s.company.cash += revenue - costs;
  ledger.revenue += revenue;
  ledger.expenses += costs;
  ledger.cash = s.company.cash;
  for (const p of s.projects) {
    if (p.progress >= 100) continue;
    const team = s.employees.filter((e) => p.team.includes(e.id));
    // A project without staff (e.g. after a resignation) pauses.
    if (!team.length) continue;
    const morale =
      team.reduce((n, e) => n + e.motivation, 0) / Math.max(team.length, 1);
    const speed =
      (0.6 + morale / 250) *
      (team.some((e) => e.trait === "Perfektionist") ? 0.92 : 1) *
      (team.some((e) => e.trait === "Teamplayer") ? 1.07 : 1) *
      Math.min(1.6, 1 + (team.length - 1) * 0.16) *
      (1 + facility.speed) *
      (hasPerk(team, "lead") ? 1.08 : 1);
    p.elapsed = Math.min(p.duration, p.elapsed + speed);
    p.progress = clamp((p.elapsed / p.duration) * 100);
    p.phase = PHASES[Math.min(5, Math.floor((p.progress / 100) * 6))];
    for (const e of team) {
      p.points.design += e.skills.design / 120;
      p.points.technology += e.skills.programming / 120;
      p.points.art += e.skills.art / 120;
      p.points.content += e.skills.writing / 120;
      p.points.audio += e.skills.audio / 120;
      p.points.polish += p.progress > 65 ? 1 : 0;
    }
    if (
      p.progress < 65 &&
      random(s) <
        0.22 *
          ambitionFor(p).bugs *
          bugRate *
          (1 - engineBonus(s, p.engine).bugs) *
          (hasPerk(team, "engine") ? 0.9 : 1)
    )
      p.bugs += 1;
    if (p.progress > 65)
      p.bugs = Math.max(
        0,
        p.bugs - (team.some((e) => e.trait === "Bug Hunter") ? 1.4 : 0.7),
      );
    p.quality = quality(s, p);
    if (random(s) < 0.012) {
      p.points.design += 4;
      p.hype += 2;
      notify(
        s,
        "Kreativer Durchbruch",
        `Das Team von ${p.name} hat eine besonders gute Idee.`,
        "success",
      );
    }
    if (p.progress >= 100)
      notify(
        s,
        "Bereit für die Welt",
        `${p.name} kann jetzt veröffentlicht werden.`,
        "success",
      );
  }
  for (const e of s.employees) {
    const busy = isWorking(s, e.id);
    // Busy staff settle at a medium stress level instead of burning out.
    e.stress = clamp(
      e.stress +
        (busy ? 0.22 * (1 - facility.stress) - e.stress * 0.004 : -0.65),
    );
    e.energy = clamp(
      e.energy + (busy ? -0.1 * (1 - facility.energy) : 0.8),
      35,
    );
    e.motivation = clamp(
      e.motivation + (e.stress > 60 ? -0.18 : busy ? -0.008 : 0.12),
      25,
    );
    e.experience += busy ? 0.003 : 0;
    if (busy && s.day % 30 === 0)
      for (const key of Object.keys(e.skills) as (keyof typeof e.skills)[])
        // Growth stops at the employee's potential.
        e.skills[key] = Math.min(
          Math.max(e.potential, e.skills[key]),
          clamp(
            e.skills[key] +
              BALANCE.skillGrowth *
                (e.trait === "Schneller Lerner" ? 2 : 1) *
                (1 + facility.learning),
          ),
        );
  }
  if (s.recruitment && --s.recruitment.remaining <= 0) candidates(s);
  researchTick(s);
  engineTick(s);
  contractTick(s);
  pricingTick(s);
  if (s.day % 30 === 0) {
    payLicenses(s);
    paySubsidiaries(s);
    payHoldings(s);
    unlockPerks(s);
    loyaltyTick(s);
  }
  expirePoaching(s);
  rivalsTick(s);
  updateMarket(s);
  expoTick(s);
  if (s.day % 30 === 0)
    notify(
      s,
      "Monatsabschluss",
      `Umsatz: ${Math.round(ledger.revenue)} € · Kosten: ${Math.round(ledger.expenses)} €`,
    );
  if (s.day % BALANCE.raiseInterval === 0 && s.employees.length > 1)
    notify(
      s,
      "Zeit für Anerkennung",
      `Dein Team wünscht sich eine Gehaltserhöhung (+8 %, mindestens Marktwert): ${teamRaiseCost(s).toLocaleString("de-DE")} € mehr pro Monat.`,
      "warning",
      "raise",
    );
  if (s.company.cash < scaled(s, 5000) && s.day % 15 === 0)
    notify(
      s,
      "Liquidität im Blick behalten",
      "Ein Kredit kann deinem Studio Zeit verschaffen.",
      "warning",
    );
  if (s.company.cash < bankruptcyLimit(s)) {
    s.company.bankrupt = true;
    s.speed = 0;
    notify(
      s,
      "Dein Studio ist zahlungsunfähig",
      "Lade einen Spielstand oder gründe ein neues Studio.",
      "warning",
    );
  }
  processProductionQueue(s);
  // Keep the ledger so lifetime revenue and profit survive beyond ten years.
  return s;
}
