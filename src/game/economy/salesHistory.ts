import { BALANCE } from "../config/balance";
import { date } from "../utils";
import type { ReleasedGame } from "../types";

export function salesLifetime(game: Pick<ReleasedGame, "score" | "dlcs">) {
  return (
    (game.score > 7.5 ? BALANCE.hitSalesActiveDays : BALANCE.salesActiveDays) +
    (game.dlcs ?? 0) * 120
  );
}
export function salesPhase(
  game: Pick<ReleasedGame, "score" | "releasedDay">,
  day: number,
) {
  const age = Math.max(0, day - game.releasedDay);
  if (age >= salesLifetime(game))
    return { label: "Archiv", active: false, tone: "archive" };
  if (age <= 30)
    return { label: "Release-Phase", active: true, tone: "launch" };
  if (age <= 90)
    return { label: "Wachstumsphase", active: true, tone: "growth" };
  return { label: "Katalogverkäufe", active: true, tone: "catalog" };
}
export function salesFade(
  game: Pick<ReleasedGame, "score" | "releasedDay">,
  day: number,
) {
  const remaining = salesLifetime(game) - (day - game.releasedDay);
  if (remaining <= 0) return 0;
  const ratio = Math.min(1, remaining / BALANCE.salesFadeDays);
  return ratio * ratio * (3 - 2 * ratio);
}
export function recordSales(
  game: ReleasedGame,
  day: number,
  units: number,
  revenue: number,
) {
  game.salesHistory ??= [];
  game.salesHistoryStartDay ??= day;
  const last = game.salesHistory.at(-1);
  if (last?.day === day) {
    last.units += units;
    last.revenue += revenue;
  } else game.salesHistory.push({ day, units, revenue });
  game.salesHistory = game.salesHistory.slice(-BALANCE.salesHistoryDays);
}

export interface SalesPoint {
  day: number;
  date: number;
  units: number | null;
  revenue: number | null;
  future: boolean;
}
const EPOCH = Date.UTC(1990, 0, 1);
const DAY_MS = 86_400_000;
export function salesMonth(
  game: ReleasedGame,
  currentDay: number,
  monthOffset = 0,
) {
  const now = date(currentDay);
  const first = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1),
  );
  const last = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  );
  const history = new Map(
    game.salesHistory?.map((entry) => [entry.day, entry]),
  );
  const points: SalesPoint[] = Array.from(
    { length: last.getUTCDate() },
    (_, index) => {
      const day = Math.round((first.getTime() - EPOCH) / DAY_MS) + index;
      const record = history.get(day);
      const future = day > currentDay;
      const beforeRelease = day <= game.releasedDay;
      const afterWindow = day >= game.releasedDay + salesLifetime(game);
      const known =
        record ??
        (!future && (beforeRelease || afterWindow)
          ? { units: 0, revenue: 0 }
          : null);
      return {
        day,
        date: index + 1,
        units: future ? null : (known?.units ?? null),
        revenue: future ? null : (known?.revenue ?? null),
        future,
      };
    },
  );
  const today = history.get(currentDay);
  return {
    label: first.toLocaleDateString("de-DE", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
    points,
    units: points.reduce((total, point) => total + (point.units ?? 0), 0),
    revenue: points.reduce((total, point) => total + (point.revenue ?? 0), 0),
    todayUnits: today?.units ?? null,
    partial: points.some((point) => !point.future && point.units === null),
    firstDay: points[0].day,
    hasHistory: Boolean(game.salesHistory?.length),
  };
}

export function combinedSalesMonth(games: ReleasedGame[], day: number) {
  const months = games.map((game) => salesMonth(game, day));
  if (!months.length) return null;
  return {
    ...months[0],
    units: months.reduce((sum, month) => sum + month.units, 0),
    revenue: months.reduce((sum, month) => sum + month.revenue, 0),
    todayUnits: months.every((month) => month.todayUnits !== null)
      ? months.reduce((sum, month) => sum + month.todayUnits!, 0)
      : null,
    partial: months.some((month) => month.partial),
    hasHistory: months.some((month) => month.hasHistory),
    points: months[0].points.map((point, index) => {
      const entries = months.map((month) => month.points[index]);
      return {
        ...point,
        units: entries.every((entry) => entry.units !== null)
          ? entries.reduce((sum, entry) => sum + entry.units!, 0)
          : null,
        revenue: entries.every((entry) => entry.revenue !== null)
          ? entries.reduce((sum, entry) => sum + entry.revenue!, 0)
          : null,
      };
    }),
  };
}
