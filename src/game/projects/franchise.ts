import type { GameState, ReleasedGame } from "../types";
import { clamp } from "../utils";

export const SEQUEL_MIN_SCORE = 6;

/** All released entries of the series a game belongs to, oldest first. */
export function seriesOf(s: GameState, game: Pick<ReleasedGame, "id" | "franchise">) {
  const root = game.franchise ?? game.id;
  return s.games
    .filter((g) => g.id === root || g.franchise === root)
    .sort((a, b) => (a.entry ?? 1) - (b.entry ?? 1));
}

/** Plan data for a sequel to a released game. */
export function sequelPlan(s: GameState, baseId: string) {
  const base = s.games.find((g) => g.id === baseId);
  if (!base) return null;
  const series = seriesOf(s, base);
  const latest = series.at(-1)!;
  const entry = (latest.entry ?? 1) + 1;
  const sinceLast = (s.day - latest.releasedDay) / 365;
  const fatigue = Math.max(0, entry - 3) * 3 + (sinceLast < 1.5 ? 4 : 0);
  return {
    base,
    root: base.franchise ?? base.id,
    entry,
    series,
    hype: Math.round(clamp((base.score - 5) * 8 + series.length * 3, 0, 45)),
    quality: 3 - fatigue,
    fatigue,
    sales: 1 + 0.12 * Math.min(entry - 1, 3),
    name: `${(base.franchise ? s.games.find((g) => g.id === base.franchise)?.name : base.name) ?? base.name} ${entry}`,
    eligible: base.score >= SEQUEL_MIN_SCORE,
  };
}

/** Quality bonus or fatigue penalty stored per sequel at project start. */
export function seriesQuality(p: { entry?: number; sequelOf?: string }, s: GameState) {
  if (!p.sequelOf) return 0;
  const plan = sequelPlan(s, p.sequelOf);
  return plan ? plan.quality : 0;
}

export const seriesSales = (g: Pick<ReleasedGame, "entry">) =>
  1 + 0.12 * Math.min(Math.max(0, (g.entry ?? 1) - 1), 3);
