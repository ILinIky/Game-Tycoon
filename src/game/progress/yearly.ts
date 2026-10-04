import type { GameState, YearReview } from "../types";
import { date } from "../utils";
import { notify } from "../events/events";
import { studioValuation } from "../economy/valuation";

const yearStart = (year: number) =>
  Math.round((Date.UTC(year, 0, 1) - Date.UTC(1990, 0, 1)) / 86_400_000);

/** Builds the review of a finished year from finances, games and awards. */
export function buildYearReview(s: GameState, year: number): YearReview {
  const from = yearStart(year);
  const to = yearStart(year + 1);
  const periods = s.finances.filter((f) => f.day >= from && f.day < to);
  const games = s.games.filter((g) => g.releasedDay >= from && g.releasedDay < to);
  const best = [...games].sort((a, b) => b.score - a.score)[0];
  return {
    year,
    revenue: Math.round(periods.reduce((n, f) => n + f.revenue, 0)),
    expenses: Math.round(periods.reduce((n, f) => n + f.expenses, 0)),
    released: games.length,
    best: best ? { name: best.name, score: best.score } : null,
    avgScore: games.length ? games.reduce((n, g) => n + g.score, 0) / games.length : 0,
    fansGained: s.company.fans - s.yearStats.fansStart,
    staffChange: s.employees.length - s.yearStats.staffStart,
    staff: s.employees.length,
    cash: Math.round(s.company.cash),
    reputation: Math.round(s.company.reputation),
    awards: s.awards.filter((a) => a.year === year).map((a) => `${a.title} · ${a.game}`),
    valuation: Math.round(studioValuation(s.company)),
  };
}

/** On New Year: game-of-the-year award, review and fresh yearly stats. */
export function yearTick(s: GameState) {
  const year = date(s.day).getUTCFullYear();
  if (year === date(s.day - 1).getUTCFullYear()) return;
  const previous = year - 1;
  const from = yearStart(previous);
  const best = s.games
    .filter((g) => g.releasedDay >= from && g.releasedDay < yearStart(year))
    .sort((a, b) => b.score - a.score)[0];
  if (best && best.score >= 8.5) {
    s.awards.push({ year: previous, title: "Spiel des Jahres", game: best.name, kind: "goty" });
    notify(s, "Spiel des Jahres", `${best.name} wird zum Spiel des Jahres ${previous} gekürt!`, "success");
  }
  const review = buildYearReview(s, previous);
  s.yearReviews = [review, ...s.yearReviews].slice(0, 40);
  s.yearStats = {
    year,
    revenue: 0,
    expenses: 0,
    cashStart: s.company.cash,
    fansStart: s.company.fans,
    staffStart: s.employees.length,
    repStart: s.company.reputation,
  };
}
