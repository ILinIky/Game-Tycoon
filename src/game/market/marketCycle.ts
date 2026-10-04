/**
 * Stock market mood. Deterministic per day, so no prices need to be stored:
 * a slow business cycle (about seven years), a medium wave and a short one.
 */
export function marketIndex(day: number) {
  return (
    1 +
    0.16 * Math.sin((day / 2555) * Math.PI * 2 + 0.6) +
    0.06 * Math.sin((day / 410) * Math.PI * 2 + 1.7) +
    0.025 * Math.sin((day / 63) * Math.PI * 2)
  );
}

function hash(id: string) {
  let h = 2166136261;
  for (const char of id) h = Math.imul(h ^ char.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/**
 * Share price factor of a single company relative to its snapshot value:
 * the market mood plus company-specific waves of ±30 %.
 */
export function companyFactor(id: string, day: number) {
  const h = hash(id);
  const period = 260 + (h % 420);
  const phase = (h % 1000) / 159;
  const own =
    1 +
    0.22 * Math.sin((day / period) * Math.PI * 2 + phase) +
    0.08 * Math.sin((day / (37 + (h % 31))) * Math.PI * 2 + phase * 2);
  return Math.max(0.35, marketIndex(day) * own);
}

/** Change of a company's price over the last `days` days in percent. */
export function priceTrend(id: string, day: number, days = 30) {
  const before = companyFactor(id, Math.max(0, day - days));
  return ((companyFactor(id, day) - before) / before) * 100;
}

/** Stable seed of a save for world events that are derived, not stored. */
export const worldSeed = (s: { company: { founder: string } }) =>
  hash(`world:${s.company.founder || "Studio"}`);
