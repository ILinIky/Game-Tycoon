import type { GameState } from "../types";
import { notify } from "../events/events";
import { groupStats, holdingsOf } from "../market/holdings";
import { gameTotals } from "../projects/archive";
import { ownConsoles } from "../market/platforms";
import { TECHNOLOGIES } from "../config/technologies";
import { techLevel } from "../research/research";

export type AchievementCategory =
  "Spiele" | "Studio" | "Wirtschaft" | "Imperium";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  check: (s: GameState) => boolean;
}

const bestScore = (s: GameState) => Math.max(0, ...s.games.map((g) => g.score));

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-game",
    name: "Hallo Welt",
    description: "Veröffentliche dein erstes Spiel.",
    category: "Spiele",
    check: (s) => gameTotals(s).count >= 1,
  },
  {
    id: "games-10",
    name: "Fließband",
    description: "Veröffentliche 10 Spiele.",
    category: "Spiele",
    check: (s) => gameTotals(s).count >= 10,
  },
  {
    id: "games-50",
    name: "Spieleschmiede",
    description: "Veröffentliche 50 Spiele.",
    category: "Spiele",
    check: (s) => gameTotals(s).count >= 50,
  },
  {
    id: "games-100",
    name: "Lebenswerk",
    description: "Veröffentliche 100 Spiele.",
    category: "Spiele",
    check: (s) => gameTotals(s).count >= 100,
  },
  {
    id: "score-8",
    name: "Kritikerliebling",
    description: "Erreiche eine Wertung von 8,0.",
    category: "Spiele",
    check: (s) => bestScore(s) >= 8,
  },
  {
    id: "score-9",
    name: "Meisterwerk",
    description: "Erreiche eine Wertung von 9,0.",
    category: "Spiele",
    check: (s) => bestScore(s) >= 9,
  },
  {
    id: "perfect-review",
    name: "10 von 10",
    description: "Ein Magazin vergibt deinem Spiel die perfekte 10.",
    category: "Spiele",
    check: (s) => s.games.some((g) => g.reviews.some((r) => r.score >= 10)),
  },
  {
    id: "chart-1",
    name: "Nummer eins",
    description: "Erobere Platz 1 der Verkaufscharts.",
    category: "Spiele",
    check: (s) =>
      s.games.some((g) => g.chartPeak === 1) || gameTotals(s).bestChart === 1,
  },
  {
    id: "million-seller",
    name: "Millionenseller",
    description: "Verkaufe ein Spiel eine Million Mal.",
    category: "Spiele",
    check: (s) => s.games.some((g) => g.units >= 1_000_000),
  },
  {
    id: "series-3",
    name: "Kultserie",
    description: "Veröffentliche den dritten Teil einer Serie.",
    category: "Spiele",
    check: (s) => s.games.some((g) => (g.entry ?? 1) >= 3),
  },
  {
    id: "blockbuster",
    name: "Großes Kino",
    description: "Veröffentliche einen AAA+ Blockbuster oder größer.",
    category: "Spiele",
    check: (s) =>
      s.games.some((g) => ["Blockbuster", "Mega", "Legend"].includes(g.size)),
  },
  {
    id: "legend",
    name: "Jahrhundertspiel",
    description: "Veröffentliche ein Jahrhundertspiel.",
    category: "Spiele",
    check: (s) => s.games.some((g) => g.size === "Legend"),
  },
  {
    id: "goty",
    name: "Spiel des Jahres",
    description: "Gewinne die Auszeichnung Spiel des Jahres.",
    category: "Spiele",
    check: (s) => s.awards.some((a) => a.kind === "goty"),
  },
  {
    id: "team-10",
    name: "Echtes Team",
    description: "Beschäftige 10 Mitarbeiter.",
    category: "Studio",
    check: (s) => s.employees.length >= 10,
  },
  {
    id: "team-50",
    name: "Großraumbüro",
    description: "Beschäftige 50 Mitarbeiter.",
    category: "Studio",
    check: (s) => s.employees.length >= 50,
  },
  {
    id: "team-100",
    name: "Hundertschaft",
    description: "Beschäftige 100 Mitarbeiter.",
    category: "Studio",
    check: (s) => s.employees.length >= 100,
  },
  {
    id: "campus",
    name: "Eigener Campus",
    description: "Ziehe in den Studio-Campus.",
    category: "Studio",
    check: (s) => s.company.office >= 3,
  },
  {
    id: "tower",
    name: "Skyline",
    description: "Ziehe in den Studio-Tower.",
    category: "Studio",
    check: (s) => s.company.office >= 5,
  },
  {
    id: "hq",
    name: "Konzernzentrale",
    description: "Beziehe die Konzernzentrale.",
    category: "Studio",
    check: (s) => s.company.office >= 7,
  },
  {
    id: "engine",
    name: "Eigene Technik",
    description: "Entwickle deine erste eigene Engine.",
    category: "Studio",
    check: (s) => s.engines.length > 1,
  },
  {
    id: "research-30",
    name: "Wissensdurst",
    description: "Erforsche 30 Technologien.",
    category: "Studio",
    check: (s) => s.technologies.length >= 30,
  },
  {
    id: "research-late",
    name: "Zukunftsforscher",
    description: "Erforsche eine Technologie der Stufe VI.",
    category: "Studio",
    check: (s) =>
      TECHNOLOGIES.some((t) => t.tier === 6 && techLevel(s, t.id) > 0),
  },
  {
    id: "fans-1m",
    name: "Fangemeinde",
    description: "Gewinne eine Million Fans.",
    category: "Studio",
    check: (s) => s.company.fans >= 1_000_000,
  },
  {
    id: "million",
    name: "Erste Million",
    description: "Habe eine Million Euro auf dem Konto.",
    category: "Wirtschaft",
    check: (s) => s.company.cash >= 1_000_000,
  },
  {
    id: "revenue-1b",
    name: "Umsatzmilliarde",
    description: "Erziele eine Milliarde Euro Spieleumsatz.",
    category: "Wirtschaft",
    check: (s) => gameTotals(s).revenue >= 1e9,
  },
  {
    id: "billion-group",
    name: "Milliardenkonzern",
    description: "Deine Group ist eine Milliarde Euro wert.",
    category: "Wirtschaft",
    check: (s) => groupStats(s).value >= 1e9,
  },
  {
    id: "group-100b",
    name: "Weltkonzern",
    description: "Deine Group ist 100 Milliarden Euro wert.",
    category: "Wirtschaft",
    check: (s) => groupStats(s).value >= 1e11,
  },
  {
    id: "ipo",
    name: "Glocke läuten",
    description: "Bringe deine Group an die Börse.",
    category: "Wirtschaft",
    check: (s) => !!s.stock,
  },
  {
    id: "stock-double",
    name: "Kursrakete",
    description: "Verdopple den Aktienkurs seit dem Börsengang.",
    category: "Wirtschaft",
    check: (s) => !!s.stock && s.stock.price >= s.stock.ipoPrice * 2,
  },
  {
    id: "first-acquisition",
    name: "Einkaufstour",
    description: "Übernimm dein erstes Unternehmen.",
    category: "Imperium",
    check: (s) => holdingsOf(s).length + s.subsidiaries.length >= 1,
  },
  {
    id: "acquisitions-10",
    name: "Sammler",
    description: "Besitze 10 Unternehmen.",
    category: "Imperium",
    check: (s) => holdingsOf(s).length + s.subsidiaries.length >= 10,
  },
  {
    id: "merger",
    name: "Aktientausch",
    description: "Fusioniere per Aktientausch mit einem Unternehmen.",
    category: "Imperium",
    check: (s) => holdingsOf(s).some((h) => h.merged),
  },
  {
    id: "console",
    name: "Plattformhalter",
    description: "Bringe deine eigene Konsole auf den Markt.",
    category: "Imperium",
    check: (s) => ownConsoles(s).length >= 1,
  },
  {
    id: "console-50m",
    name: "In jedem Wohnzimmer",
    description: "Verkaufe 50 Millionen Konsolen einer Generation.",
    category: "Imperium",
    check: (s) => ownConsoles(s).some((c) => c.installed >= 50_000_000),
  },
];

export const achievementsOf = (s: Pick<GameState, "achievements">) =>
  s.achievements ?? {};

/** Unlocks newly reached achievements; returns their ids. */
export function checkAchievements(s: GameState) {
  const unlocked = { ...achievementsOf(s) };
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (unlocked[a.id] !== undefined || !a.check(s)) continue;
    unlocked[a.id] = s.day;
    fresh.push(a.id);
  }
  if (!fresh.length) return fresh;
  s.achievements = unlocked;
  // Older saves unlock many at once: one summary instead of a flood.
  if (fresh.length > 3)
    notify(
      s,
      `${fresh.length} Erfolge freigeschaltet`,
      "Sieh dir deine Meilensteine unter Erfolge an.",
      "success",
    );
  else
    for (const id of fresh) {
      const a = ACHIEVEMENTS.find((x) => x.id === id)!;
      notify(s, `Erfolg freigeschaltet: ${a.name}`, a.description, "success");
    }
  return fresh;
}
