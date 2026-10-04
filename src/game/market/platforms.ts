import type { GameState, Platform, ReleasedGame } from "../types";
import { PLATFORMS } from "../config/platforms";

export type PlatformStatus =
  | "future"
  | "announced"
  | "launch"
  | "prime"
  | "fading"
  | "retired";

export const LAUNCH_BONUS = 0.3;
const RAMP_YEARS = 2;
const FADE_YEARS = 3;

/** Fractional calendar year of a game day (1990.0 = 1 January 1990). */
export const yearOf = (day: number) => 1990 + day / 365;

/** Market weight of a platform on a given day, following its life cycle. */
export function platformShare(p: Platform, day: number) {
  const y = yearOf(day);
  if (y < p.year) return 0;
  if (p.end !== undefined && y >= p.end + 1) return 0;
  const age = y - p.year;
  // Platforms already on the market when the game starts are established.
  const ramp =
    p.year > 1990 && age < RAMP_YEARS ? 0.35 + 0.65 * (age / RAMP_YEARS) : 1;
  if (p.end === undefined) return p.share * ramp;
  const left = p.end + 1 - y;
  const fade = left < FADE_YEARS ? 0.12 + 0.88 * (left / FADE_YEARS) : 1;
  return p.share * Math.min(ramp, fade);
}

export function platformStatus(p: Platform, day: number): PlatformStatus {
  const y = yearOf(day);
  if (y < p.year - 1) return "future";
  if (y < p.year) return "announced";
  if (p.end !== undefined && y >= p.end + 1) return "retired";
  if (p.year > 1990 && y < p.year + 1) return "launch";
  if (p.end !== undefined && p.end + 1 - y < FADE_YEARS) return "fading";
  return "prime";
}

export const STATUS_LABEL: Record<PlatformStatus, string> = {
  future: "In Zukunft",
  announced: "Angekündigt",
  launch: "Launch-Jahr",
  prime: "Etabliert",
  fading: "Läuft aus",
  retired: "Eingestellt",
};

/** Platforms a new project can target today. */
export function availablePlatforms(s: Pick<GameState, "day">) {
  return PLATFORMS.filter((p) => {
    const status = platformStatus(p, s.day);
    return status !== "future" && status !== "announced" && status !== "retired";
  });
}

export const isAvailable = (s: Pick<GameState, "day">, id: string) =>
  availablePlatforms(s).some((p) => p.id === id);

/** Launch titles (released in a platform's first year) stay more visible. */
export function isLaunchTitle(p: Platform, releasedDay: number) {
  const y = yearOf(releasedDay);
  return p.year > 1990 && y >= p.year && y < p.year + 1;
}

/** Reach multiplier of a released game across its platforms (1 ≈ PC 1990). */
export function gameReach(g: Pick<ReleasedGame, "platforms" | "releasedDay">, day: number) {
  return (
    g.platforms.reduce((n, id) => {
      const p = PLATFORMS.find((x) => x.id === id);
      if (!p) return n;
      return n + platformShare(p, day) * (isLaunchTitle(p, g.releasedDay) ? 1 + LAUNCH_BONUS : 1);
    }, 0) / 50
  );
}

/** Platforms whose status changes this year, for yearly news. */
export function platformNews(year: number) {
  return {
    announced: PLATFORMS.filter((p) => p.year === year + 1),
    launched: PLATFORMS.filter((p) => p.year === year),
    retired: PLATFORMS.filter((p) => p.end === year - 1),
  };
}
