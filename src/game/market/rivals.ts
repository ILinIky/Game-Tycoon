import type {
  ChartEntry,
  Competitor,
  Employee,
  GameState,
  Genre,
  RivalGame,
} from "../types";
import { BALANCE, GENRES, OFFICES, SIZES } from "../config/balance";
import { clamp, date, random, uid } from "../utils";
import { notify } from "../events/events";
import { marketScale, nice, scaled } from "../economy/scale";
import { techEffects } from "../research/research";

const WORDS_A = ["Shadow", "Iron", "Neon", "Crystal", "Silent", "Solar", "Wild", "Lost", "Crimson", "Thunder", "Frozen", "Golden", "Hidden", "Rogue", "Cosmic"];
const WORDS_B = ["Circuit", "Harbor", "Legends", "Frontier", "Empire", "Drift", "Kingdom", "Protocol", "Odyssey", "Arena", "Tactics", "Saga", "Rush", "Horizon", "Quest"];

/** Studios that join the market over the years. */
export const NEW_RIVALS: (Competitor & { founded: number })[] = [
  { name: "Titan Forge", releases: 0, revenue: 0, founded: 1994, strength: 4 },
  { name: "Lumen Studios", releases: 0, revenue: 0, founded: 1998, strength: 3 },
  { name: "Polar Bit", releases: 0, revenue: 0, founded: 2002, strength: 2 },
  { name: "Helix Entertainment", releases: 0, revenue: 0, founded: 2006, strength: 5 },
  { name: "Juniper Games", releases: 0, revenue: 0, founded: 2011, strength: 3 },
];

const strengthOf = (c: Competitor) => c.strength ?? 2;
export const activeRivals = (s: GameState) => s.market.competitors.filter((c) => !c.owned);

function rivalTitle(s: GameState) {
  const a = WORDS_A[Math.floor(random(s) * WORDS_A.length)];
  const b = WORDS_B[Math.floor(random(s) * WORDS_B.length)];
  return random(s) < 0.25 ? `${a} ${b} ${2 + Math.floor(random(s) * 3)}` : `${a} ${b}`;
}

function weightedGenre(s: GameState): Genre {
  const total = GENRES.reduce((n, g) => n + s.market.popularity[g], 0);
  let roll = random(s) * total;
  for (const g of GENRES) {
    roll -= s.market.popularity[g];
    if (roll <= 0) return g;
  }
  return GENRES[0];
}

/** A competitor releases a named game; bigger studios ship bigger games. */
export function releaseRivalGame(s: GameState, c: Competitor) {
  const strength = strengthOf(c);
  const year = date(s.day).getUTCFullYear();
  const sizes = Object.keys(SIZES) as RivalGame["size"][];
  const max = Math.min(3, Math.floor(strength / 2 + (year - 1990) / 8));
  const size = sizes[Math.min(max, Math.floor(random(s) * (max + 1)))];
  const game: RivalGame = {
    id: uid(s, "rival"),
    title: rivalTitle(s),
    studio: c.name,
    genre: weightedGenre(s),
    size,
    score: Math.round(clamp(5 + strength * 0.55 + (random(s) - 0.5) * 3, 3, 9.6) * 10) / 10,
    releasedDay: s.day,
  };
  s.market.rivalGames = [game, ...(s.market.rivalGames ?? [])].slice(0, 60);
  c.releases++;
  c.revenue += nice(rivalWeekly(game, s.day) * 14 * SIZES[size].price * 0.7);
  return game;
}

/** Estimated weekly units of a rival game, comparable to own sales. */
export function rivalWeekly(g: RivalGame, day: number) {
  const age = day - g.releasedDay;
  if (age < 0 || age > 400) return 0;
  const decay = Math.exp(-age / (g.score > 7.5 ? 95 : 48)) + 0.02;
  return Math.round(
    7 *
      BALANCE.salesBase *
      marketScale({ day }) *
      SIZES[g.size].sales *
      (g.score / 5) ** 2 *
      1.9 *
      decay,
  );
}

const ownWeekly = (s: GameState, units: { day: number; units: number }[] = []) =>
  units.filter((r) => r.day > s.day - 7).reduce((n, r) => n + r.units, 0);

/** Weekly top 10 of own and rival games. */
export function updateCharts(s: GameState) {
  const previous = new Map((s.charts?.entries ?? []).map((e) => [e.id, e]));
  const candidates: Omit<ChartEntry, "rank" | "previous" | "weeks">[] = [
    ...s.games.map((g) => ({
      id: g.id,
      title: g.name,
      studio: s.company.name,
      own: true,
      units: ownWeekly(s, g.salesHistory),
    })),
    ...(s.market.rivalGames ?? []).map((g) => ({
      id: g.id,
      title: g.title,
      studio: g.studio,
      own: false,
      units: rivalWeekly(g, s.day),
    })),
  ].filter((c) => c.units > 0);
  const entries = candidates
    .sort((a, b) => b.units - a.units)
    .slice(0, 10)
    .map((c, i) => ({
      ...c,
      rank: i + 1,
      previous: previous.get(c.id)?.rank ?? null,
      weeks: (previous.get(c.id)?.weeks ?? 0) + 1,
    }));
  s.charts = { week: Math.floor(s.day / 7), day: s.day, entries };
  for (const e of entries.filter((x) => x.own)) {
    const g = s.games.find((x) => x.id === e.id)!;
    const firstTop = g.chartPeak === undefined || e.rank < g.chartPeak;
    g.chartPeak = Math.min(g.chartPeak ?? 99, e.rank);
    if (e.rank === 1 && firstTop) {
      s.company.reputation = clamp(s.company.reputation + 2);
      s.awards.push({ year: date(s.day).getUTCFullYear(), title: "Nr. 1 der Charts", game: g.name, kind: "chart" });
      notify(s, "Platz 1 der Charts!", `${g.name} ist das meistverkaufte Spiel der Woche.`, "success");
    }
  }
}

/** Monthly releases of rival studios and yearly newcomers. */
export function rivalsTick(s: GameState) {
  const year = date(s.day).getUTCFullYear();
  // Studios founded up to this year join (also for older saves).
  for (const r of NEW_RIVALS)
    if (r.founded <= year && !s.market.competitors.some((c) => c.name === r.name)) {
      s.market.competitors.push({ ...r });
      if (r.founded === year)
        notify(s, "Neues Studio am Markt", `${r.name} wurde gegründet und will in die Charts.`);
    }
  // The market starts with a few games already on sale.
  if (!(s.market.rivalGames ?? []).length) {
    const today = s.day;
    for (const c of activeRivals(s)) {
      s.day = Math.max(0, today - Math.floor(random(s) * 90));
      releaseRivalGame(s, c);
    }
    s.day = today;
  }
  if (s.day % 30 === 0)
    for (const c of activeRivals(s))
      if (random(s) < 0.45 + strengthOf(c) * 0.1) releaseRivalGame(s, c);
  if (s.day % 7 === 0) updateCharts(s);
}

// --- Übernahmen -----------------------------------------------------------

export const ACQUISITION_OFFICE = 3;

export function acquisitionPrice(s: GameState, c: Competitor) {
  return nice(150000 * strengthOf(c) ** 2.2 * marketScale(s) + c.revenue * 0.5);
}

export function acquisitionBlocker(s: GameState, c: Competitor) {
  if (c.owned) return "Gehört bereits zu deinem Studio.";
  if (s.company.office < ACQUISITION_OFFICE)
    return `Übernahmen ab ${OFFICES[ACQUISITION_OFFICE].name}.`;
  if (s.company.cash < acquisitionPrice(s, c)) return "Zu wenig Kapital.";
  return null;
}

/** Monthly profit of a subsidiary in 1990 euros. */
export const subsidiaryIncome = (strength: number) => 2500 * strength ** 2;

export function acquireStudio(s: GameState, name: string) {
  const c = s.market.competitors.find((x) => x.name === name);
  if (!c) throw new Error("Studio nicht gefunden.");
  const blocker = acquisitionBlocker(s, c);
  if (blocker) throw new Error(blocker);
  const price = acquisitionPrice(s, c);
  const strength = strengthOf(c);
  s.company.cash -= price;
  s.finances.at(-1)!.expenses += price;
  c.owned = true;
  s.subsidiaries.push({ name: c.name, since: s.day, income: subsidiaryIncome(strength), strength });
  s.company.fans += 2500 * strength;
  s.company.reputation = clamp(s.company.reputation + 3);
  const capacity = OFFICES[s.company.office].capacity;
  if (s.employees.length < capacity) {
    const veteran = veteranFrom(s, c);
    s.employees.push(veteran);
    notify(s, "Übernahme abgeschlossen", `${c.name} gehört jetzt zu deinem Studio. ${veteran.name} wechselt in dein Team.`, "success");
  } else notify(s, "Übernahme abgeschlossen", `${c.name} gehört jetzt zu deinem Studio.`, "success");
}

function veteranFrom(s: GameState, c: Competitor): Employee {
  const base = 58 + strengthOf(c) * 4;
  const skill = () => Math.round(clamp(base + random(s) * 14, 0, 92));
  const names = ["Kim Albers", "Jona Reiter", "Tess Moreau", "Ilias Brandt", "Mara Okafor"];
  return {
    id: uid(s, "employee"),
    name: names[Math.floor(random(s) * names.length)],
    role: (["Programmierung", "Game Design", "Art", "Audio"] as const)[Math.floor(random(s) * 4)],
    skills: {
      programming: skill(),
      design: skill(),
      art: skill(),
      audio: skill(),
      writing: skill(),
      marketing: skill(),
      management: skill(),
      research: skill(),
    },
    salary: nice(3200 * marketScale(s)),
    age: 38,
    experience: 12,
    motivation: 80,
    stress: 10,
    energy: 100,
    loyalty: 70,
    potential: 95,
    trait: "Teamplayer",
  };
}

/** Pays subsidiary profits monthly; returns the total. */
export function paySubsidiaries(s: GameState) {
  const total = Math.round(
    s.subsidiaries.reduce((n, x) => n + scaled(s, x.income), 0) *
      (1 + techEffects(s).income),
  );
  if (!total) return 0;
  s.company.cash += total;
  s.finances.at(-1)!.revenue += total;
  return total;
}
