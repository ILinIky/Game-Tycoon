import type { BoothSize, ExpoResult, GameState } from "../types";
import { clamp, date, random } from "../utils";
import { notify } from "../events/events";
import { scaled } from "../economy/scale";
import { quality } from "../projects/projects";
import { facilityEffects } from "../office/office";
import { countPerk } from "../employees/perks";

/** Day of the year (0-based) on which the GameExpo opens. */
export const EXPO_DAY = 160;
export const EXPO_BOOKING_START = 90;

export const BOOTHS: Record<
  BoothSize,
  { name: string; cost: number; hype: number; fans: number; slots: number; award: number }
> = {
  small: { name: "Kleiner Stand", cost: 6000, hype: 10, fans: 300, slots: 1, award: 0.6 },
  medium: { name: "Messestand", cost: 25000, hype: 18, fans: 1200, slots: 2, award: 0.8 },
  large: { name: "Showbühne", cost: 90000, hype: 30, fans: 4000, slots: 3, award: 1 },
};

export function dayOfYear(day: number) {
  const d = date(day);
  return Math.round((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000);
}

/** Days until this year's expo; negative once it is over. */
export const daysToExpo = (s: GameState) => EXPO_DAY - dayOfYear(s.day);
export const boothCost = (s: GameState, booth: BoothSize) => scaled(s, BOOTHS[booth].cost);

export function expoBlocker(s: GameState, booth: BoothSize, projects: string[]) {
  const days = daysToExpo(s);
  if (days <= 0) return "Die GameExpo ist für dieses Jahr vorbei.";
  if (dayOfYear(s.day) < EXPO_BOOKING_START) return `Buchung ab ${EXPO_DAY - EXPO_BOOKING_START} Tage vor der Messe.`;
  if (s.expo.booth) return "Dein Stand ist bereits gebucht.";
  if (!projects.length) return "Wähle mindestens ein Projekt in Entwicklung.";
  if (projects.length > BOOTHS[booth].slots) return `${BOOTHS[booth].name}: höchstens ${BOOTHS[booth].slots} Projekte.`;
  if (projects.some((id) => !s.projects.some((p) => p.id === id))) return "Nur Spiele in Entwicklung.";
  if (s.company.cash < boothCost(s, booth)) return "Zu wenig Kapital.";
  return null;
}

export function bookExpo(s: GameState, booth: BoothSize, projects: string[]) {
  const blocker = expoBlocker(s, booth, projects);
  if (blocker) throw new Error(blocker);
  const cost = boothCost(s, booth);
  s.company.cash -= cost;
  s.finances.at(-1)!.expenses += cost;
  s.expo = { year: date(s.day).getUTCFullYear(), booth, projects: [...projects], result: null };
  notify(s, "Stand gebucht", `${BOOTHS[booth].name} auf der GameExpo ${s.expo.year} ist reserviert.`, "success");
}

const REACTIONS = {
  great: ["„Der heimliche Star der Messe.“", "„Lange Schlangen am Stand – zu Recht.“", "„Das Spiel, über das alle reden.“"],
  good: ["„Ein vielversprechender Auftritt.“", "„Solide Demo mit klarer Handschrift.“", "„Wir behalten das Studio im Blick.“"],
  weak: ["„Noch etwas roh, aber mit Ideen.“", "„Die Demo ruckelte, der Ansatz überzeugt.“", "„Hier fehlt noch Feinschliff.“"],
};

/** Runs the expo on its day: hype, fans and a possible Best-of-Show award. */
export function expoTick(s: GameState) {
  const year = date(s.day).getUTCFullYear();
  if (s.expo.year !== year) s.expo = { year, booth: null, projects: [], result: null };
  const days = daysToExpo(s);
  if (days === 30 && !s.expo.booth)
    notify(s, "GameExpo in 30 Tagen", "Buche im Marketing einen Stand und zeige deine Projekte der Welt.");
  if (days !== 0) return;
  if (!s.expo.booth) {
    notify(s, `GameExpo ${year}`, "Die Messe fand ohne dein Studio statt. Die Konkurrenz nutzte die Bühne.");
    return;
  }
  const booth = BOOTHS[s.expo.booth];
  const boost = 1 + facilityEffects(s).campaign + (countPerk(s, "marketing") ? 0.25 : 0);
  const shown = s.projects.filter((p) => s.expo.projects.includes(p.id));
  let award: string | null = null;
  const reactions: string[] = [];
  let best = 0;
  for (const p of shown) {
    p.hype = clamp(p.hype + booth.hype * boost);
    const q = quality(s, p);
    const tier = q >= 75 ? "great" : q >= 60 ? "good" : "weak";
    reactions.push(`${p.name}: ${REACTIONS[tier][Math.floor(random(s) * 3)]}`);
    const chance = clamp((q - 60) / 40, 0, 0.9) * booth.award;
    if (q > best && random(s) < chance) {
      best = q;
      award = p.name;
    }
  }
  const fans = Math.round(booth.fans * boost);
  s.company.fans += fans;
  s.company.reputation = clamp(s.company.reputation + 1);
  if (award) {
    const p = shown.find((x) => x.name === award)!;
    p.hype = clamp(p.hype + 15);
    s.company.reputation = clamp(s.company.reputation + 4);
    s.awards.push({ year, title: "Best of Show", game: award, kind: "expo" });
  }
  const result: ExpoResult = {
    year,
    booth: s.expo.booth,
    projects: shown.map((p) => p.name),
    hype: Math.round(booth.hype * boost),
    fans,
    award,
    reactions,
  };
  s.expo.result = result;
  notify(
    s,
    `GameExpo ${year}`,
    award ? `${award} gewinnt „Best of Show“! +${fans} Fans.` : `Dein Stand begeistert ${fans} neue Fans.`,
    "success",
  );
}
