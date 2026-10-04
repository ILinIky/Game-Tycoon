import type { GameProject } from "../types";

/**
 * Optional production features chosen in the game design step. Each one
 * raises budget and often time, and pays back through sales, hype or quality.
 */
export interface GameFeature {
  id: string;
  name: string;
  description: string;
  /** Budget and development time multipliers. */
  cost: number;
  days: number;
  /** Sales multiplier, flat quality and starting hype. */
  sales: number;
  quality: number;
  hype: number;
  /** Bug rate multiplier. */
  bugs: number;
}

export const GAME_FEATURES: GameFeature[] = [
  {
    id: "localization",
    name: "Lokalisierung",
    description: "Zwölf Sprachen öffnen neue Märkte.",
    cost: 1.08,
    days: 1.04,
    sales: 1.12,
    quality: 0,
    hype: 0,
    bugs: 1,
  },
  {
    id: "multiplayer",
    name: "Mehrspieler-Modus",
    description: "Gemeinsam spielen hält Fans länger bei der Stange.",
    cost: 1.2,
    days: 1.12,
    sales: 1.18,
    quality: 1,
    hype: 4,
    bugs: 1.25,
  },
  {
    id: "openworld",
    name: "Offene Spielwelt",
    description: "Eine riesige Welt ohne Ladebildschirme.",
    cost: 1.35,
    days: 1.2,
    sales: 1.2,
    quality: 3,
    hype: 6,
    bugs: 1.3,
  },
  {
    id: "orchestra",
    name: "Orchester-Soundtrack",
    description: "Live eingespielt mit großem Orchester.",
    cost: 1.1,
    days: 1,
    sales: 1.04,
    quality: 2,
    hype: 3,
    bugs: 1,
  },
  {
    id: "cinematics",
    name: "Kinoreife Zwischensequenzen",
    description: "Trailer-Material, über das alle reden.",
    cost: 1.15,
    days: 1.06,
    sales: 1.06,
    quality: 1,
    hype: 10,
    bugs: 1,
  },
  {
    id: "collector",
    name: "Sammleredition",
    description: "Box, Artbook und Figur für die treuesten Fans.",
    cost: 1.06,
    days: 1,
    sales: 1.1,
    quality: 0,
    hype: 5,
    bugs: 1,
  },
  {
    id: "accessibility",
    name: "Barrierefreiheit",
    description: "Optionen, damit wirklich alle mitspielen können.",
    cost: 1.05,
    days: 1.03,
    sales: 1.07,
    quality: 1,
    hype: 0,
    bugs: 1,
  },
  {
    id: "polish",
    name: "Extra-Feinschliff",
    description: "Ein zusätzlicher Testmonat gegen Bugs.",
    cost: 1.12,
    days: 1.15,
    sales: 1,
    quality: 2,
    hype: 0,
    bugs: 0.6,
  },
];
export const FEATURE_IDS = GAME_FEATURES.map((f) => f.id);
export const featureById = (id: string) =>
  GAME_FEATURES.find((f) => f.id === id);

/** Combined effects of a project's chosen features. */
export function featureEffects(p: Pick<GameProject, "features">) {
  const total = { cost: 1, days: 1, sales: 1, quality: 0, hype: 0, bugs: 1 };
  for (const id of new Set(p.features ?? [])) {
    const f = featureById(id);
    if (!f) continue;
    total.cost *= f.cost;
    total.days *= f.days;
    total.sales *= f.sales;
    total.quality += f.quality;
    total.hype += f.hype;
    total.bugs *= f.bugs;
  }
  return total;
}

export const validFeatures = (v: unknown) =>
  v === undefined ||
  (Array.isArray(v) &&
    v.length <= GAME_FEATURES.length &&
    new Set(v).size === v.length &&
    v.every((id) => FEATURE_IDS.includes(id as string)));
