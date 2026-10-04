import type { GameState, ReleasedGame } from "../types";
import { SIZES } from "../config/balance";
import { clamp } from "../utils";
import { notify } from "../events/events";
import { marketScale, nice } from "../economy/scale";
import { salesLifetime } from "../economy/salesHistory";

export const PRICE_STEPS = [0.6, 0.8, 1, 1.2, 1.4];
export const SALE_DAYS = 14;
export const SALE_COOLDOWN = 90;
export const MAX_DLCS = 3;
export const DLC_DAYS = 30;

export const basePrice = (g: Pick<ReleasedGame, "size">) => SIZES[g.size]?.price ?? 24;
export const onSale = (g: Pick<ReleasedGame, "sale">, day: number) => !!g.sale && g.sale.until >= day;
export const effectivePrice = (g: Pick<ReleasedGame, "price" | "sale">, day: number) =>
  g.price * (onSale(g, day) ? 1 - g.sale!.discount : 1);

/**
 * Price elasticity depends on quality: great games tolerate higher prices,
 * weaker ones sell much better when cheaper.
 */
export const elasticity = (score: number) => clamp(1.6 - score / 10, 0.6, 1.3);

export function priceFactor(g: Pick<ReleasedGame, "price" | "sale" | "size" | "score">, day: number) {
  const ratio = basePrice(g) / effectivePrice(g, day);
  return ratio ** elasticity(g.score) * (onSale(g, day) ? 1.4 : 1);
}

/** Extra demand after an expansion release, fading over ~40 days. */
export const dlcRevival = (g: Pick<ReleasedGame, "revivedDay">, day: number) =>
  g.revivedDay !== undefined && day >= g.revivedDay ? 0.6 * Math.exp(-(day - g.revivedDay) / 40) : 0;

const active = (g: ReleasedGame, day: number) => day - g.releasedDay < salesLifetime(g);

export function setPrice(s: GameState, id: string, factor: number) {
  const g = s.games.find((x) => x.id === id);
  if (!g) throw new Error("Spiel nicht gefunden.");
  if (!PRICE_STEPS.includes(factor)) throw new Error("Ungültiger Preis.");
  g.price = Math.round(basePrice(g) * factor);
}

export function saleBlocker(s: GameState, g: ReleasedGame) {
  if (!active(g, s.day)) return "Das Spiel ist nicht mehr im Handel.";
  if (onSale(g, s.day)) return "Die Aktion läuft bereits.";
  if (g.lastSale !== undefined && s.day - g.lastSale < SALE_COOLDOWN)
    return `Nächste Aktion in ${SALE_COOLDOWN - (s.day - g.lastSale)} Tagen.`;
  if (s.day - g.releasedDay < 30) return "Aktionen ab 30 Tagen nach Release.";
  return null;
}

export function startSale(s: GameState, id: string, discount: number) {
  const g = s.games.find((x) => x.id === id);
  if (!g) throw new Error("Spiel nicht gefunden.");
  if (![0.25, 0.5].includes(discount)) throw new Error("Ungültiger Rabatt.");
  const blocker = saleBlocker(s, g);
  if (blocker) throw new Error(blocker);
  g.sale = { until: s.day + SALE_DAYS, discount };
  g.lastSale = s.day;
  notify(s, "Rabattaktion gestartet", `${g.name} kostet ${SALE_DAYS} Tage lang ${discount * 100} % weniger.`, "success");
}

export function dlcCost(s: GameState, g: ReleasedGame) {
  const then = marketScale({ day: g.releasedDay });
  return nice(g.budget * 0.2 * (marketScale(s) / then) * (1 + (g.dlcs ?? 0) * 0.25));
}

export function dlcBlocker(s: GameState, g: ReleasedGame) {
  if ((g.dlcs ?? 0) >= MAX_DLCS) return "Maximal drei Erweiterungen.";
  if (g.dlcReady !== undefined && g.dlcReady > s.day) return "Die Erweiterung ist in Arbeit.";
  if (g.score < 5) return "Erweiterungen lohnen sich ab einer Wertung von 5,0.";
  if (s.day - g.releasedDay < 45) return "Erweiterungen ab 45 Tagen nach Release.";
  if (!active(g, s.day)) return "Das Spiel ist nicht mehr im Handel.";
  if (s.company.cash < dlcCost(s, g)) return "Zu wenig Kapital.";
  return null;
}

export function startDlc(s: GameState, id: string) {
  const g = s.games.find((x) => x.id === id);
  if (!g) throw new Error("Spiel nicht gefunden.");
  const blocker = dlcBlocker(s, g);
  if (blocker) throw new Error(blocker);
  const cost = dlcCost(s, g);
  s.company.cash -= cost;
  s.finances.at(-1)!.expenses += cost;
  g.dlcReady = s.day + DLC_DAYS;
  notify(s, "Erweiterung in Arbeit", `Ein externes Team entwickelt neue Inhalte für ${g.name}.`);
}

/** Releases finished expansions and ends discount campaigns. */
export function pricingTick(s: GameState) {
  for (const g of s.games) {
    if (g.dlcReady !== undefined && g.dlcReady <= s.day) {
      g.dlcs = (g.dlcs ?? 0) + 1;
      g.dlcReady = undefined;
      g.revivedDay = s.day;
      g.hype = clamp(g.hype + 20);
      notify(s, "Erweiterung veröffentlicht", `${g.name} erhält Erweiterung ${g.dlcs}. Die Verkäufe ziehen wieder an.`, "success");
    }
    if (g.sale && g.sale.until < s.day) g.sale = undefined;
  }
}
