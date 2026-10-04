import type { GameState } from "./types";
export const money = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
export const number = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    notation: n >= 100000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);
export function date(day: number) {
  return new Date(Date.UTC(1990, 0, 1 + day));
}
export function dateLabel(day: number) {
  return date(day).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
export function random(s: GameState) {
  s.seed = (s.seed * 1664525 + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
export const clamp = (n: number, low = 0, high = 100) =>
  Math.max(low, Math.min(high, n));
export function uid(s: GameState, prefix: string) {
  return `${prefix}-${s.day}-${Math.floor(random(s) * 1e9)}`;
}
