import type { GameState, ReleasedGame } from "../types";
import { salesPhase } from "../economy/salesHistory";
import { SEQUEL_MIN_SCORE } from "./franchise";

/** The archive keeps at most this many released games. */
export const MAX_ARCHIVED_GAMES = 100;

export const isOnSale = (g: ReleasedGame, day: number) =>
  salesPhase(g, day).active;

/** Newest entry of a series that can still be continued. */
const continuable = (s: GameState, g: ReleasedGame) =>
  g.score >= SEQUEL_MIN_SCORE &&
  !s.games.some(
    (x) =>
      x.franchise === (g.franchise ?? g.id) && (x.entry ?? 1) > (g.entry ?? 1),
  );

/**
 * Removes the oldest games that are no longer on sale once the archive holds
 * more than MAX_ARCHIVED_GAMES. Their totals stay in `retiredGames`.
 */
export function pruneArchive(s: GameState) {
  let excess = s.games.length - MAX_ARCHIVED_GAMES;
  if (excess <= 0) return;
  const removable = [...s.games]
    .filter((g) => !isOnSale(g, s.day) && !continuable(s, g))
    .sort((a, b) => a.releasedDay - b.releasedDay);
  const removed = new Set<string>();
  for (const g of removable) {
    if (excess-- <= 0) break;
    removed.add(g.id);
    const r = (s.retiredGames ??= {
      count: 0,
      units: 0,
      revenue: 0,
      scoreSum: 0,
      bestChart: null,
    });
    r.count++;
    r.units += g.units;
    r.revenue += g.revenue;
    r.scoreSum += g.score;
    if (g.chartPeak !== undefined)
      r.bestChart = Math.min(r.bestChart ?? 99, g.chartPeak);
  }
  s.games = s.games.filter((g) => !removed.has(g.id));
}

/** Lifetime totals of all released games, including removed ones. */
export function gameTotals(s: GameState) {
  const r = s.retiredGames;
  const count = s.games.length + (r?.count ?? 0);
  const scoreSum =
    s.games.reduce((n, g) => n + g.score, 0) + (r?.scoreSum ?? 0);
  const peaks = [...s.games.map((g) => g.chartPeak ?? 99), r?.bestChart ?? 99];
  const best = Math.min(99, ...peaks);
  return {
    count,
    units: s.games.reduce((n, g) => n + g.units, 0) + (r?.units ?? 0),
    revenue: s.games.reduce((n, g) => n + g.revenue, 0) + (r?.revenue ?? 0),
    avgScore: count ? scoreSum / count : null,
    bestChart: best === 99 ? null : best,
    retired: r?.count ?? 0,
  };
}
