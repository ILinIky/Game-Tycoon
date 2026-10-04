import type { GameState } from "../types";
import { FACILITIES, OFFICES } from "../config/offices";
import type { FacilityEffects } from "../config/offices";
import { nice, scaled } from "../economy/scale";
import { BALANCE } from "../config/balance";
import { notify } from "../events/events";

export const office = (s: GameState) => OFFICES[s.company.office] ?? OFFICES[0];
export const officeRent = (s: GameState) => scaled(s, office(s).rent);
export const officeCost = (s: GameState, level: number) =>
  scaled(s, OFFICES[level]?.cost ?? 0);
export const facilityById = (id: string) => FACILITIES.find((f) => f.id === id);
export const facilityCost = (s: GameState, id: string) =>
  scaled(s, facilityById(id)?.cost ?? 0);
export const facilityUpkeep = (s: GameState) =>
  s.facilities.reduce((n, id) => n + scaled(s, facilityById(id)?.upkeep ?? 0), 0);

type Totals = Required<Omit<FacilityEffects, "focus">> & {
  focus: Partial<Record<string, number>>;
};

/** Combined effects of all installed facilities. */
export function facilityEffects(s: GameState): Totals {
  const total: Totals = {
    speed: 0,
    bugs: 0,
    stress: 0,
    energy: 0,
    learning: 0,
    training: 0,
    research: 0,
    campaign: 0,
    fans: 0,
    quality: 0,
    hype: 0,
    sales: 0,
    morale: 0,
    loyalty: 0,
    recruit: 0,
    focus: {},
  };
  for (const id of s.facilities) {
    const { focus, ...rest } = facilityById(id)?.effects ?? {};
    for (const [k, v] of Object.entries(rest) as [keyof typeof rest, number][])
      total[k] += v;
    if (focus) total.focus[focus.focus] = (total.focus[focus.focus] ?? 0) + focus.quality;
  }
  return total;
}

export function facilityBlocker(s: GameState, id: string) {
  const f = facilityById(id);
  if (!f) return "Unbekannte Einrichtung.";
  if (s.facilities.includes(id)) return "Bereits eingerichtet.";
  if (s.company.office < f.office) return `Benötigt ${OFFICES[f.office].name}.`;
  if (s.facilities.length >= office(s).slots) return "Alle Räume sind belegt.";
  if (s.company.cash < facilityCost(s, id)) return "Zu wenig Kapital.";
  return null;
}

export function buildFacility(s: GameState, id: string) {
  const blocker = facilityBlocker(s, id);
  if (blocker) throw new Error(blocker);
  const cost = facilityCost(s, id);
  s.company.cash -= cost;
  s.finances.at(-1)!.expenses += cost;
  s.facilities.push(id);
  notify(s, "Neuer Raum im Studio", `${facilityById(id)!.name} ist eingerichtet.`, "success");
}

export function removeFacility(s: GameState, id: string) {
  if (!s.facilities.includes(id)) throw new Error("Diese Einrichtung gibt es nicht.");
  s.facilities = s.facilities.filter((f) => f !== id);
}

export function moveOffice(s: GameState) {
  const next = OFFICES[s.company.office + 1];
  if (!next) throw new Error("Dein Studio hat die maximale Bürogröße.");
  const cost = officeCost(s, s.company.office + 1);
  if (s.company.cash < cost) throw new Error("Dafür reicht dein Budget aktuell nicht.");
  s.company.cash -= cost;
  s.finances.at(-1)!.expenses += cost;
  s.company.office++;
  notify(s, "Raum für mehr", `Dein Studio zieht in ${next.name}.`, "success");
}

export const trainingCost = (s: GameState) =>
  nice(scaled(s, BALANCE.trainingCost) * (1 - facilityEffects(s).training));
