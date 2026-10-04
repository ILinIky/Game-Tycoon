import type { EngineProfile, GameProject } from "../types";

export const ENGINE_PROFILES: Record<
  EngineProfile,
  {
    name: string;
    short: string;
    description: string;
    focus: GameProject["designFocus"] | null;
    stability: number;
  }
> = {
  graphics: {
    name: "Grafik-Engine",
    short: "Grafik",
    description: "+4 Qualität bei Designschwerpunkt Atmosphäre.",
    focus: "atmosphere",
    stability: 0,
  },
  systems: {
    name: "Systems-Engine",
    short: "Systeme",
    description: "+4 Qualität bei Designschwerpunkt Spielsysteme.",
    focus: "systems",
    stability: 0,
  },
  performance: {
    name: "Performance-Engine",
    short: "Technik",
    description: "+4 Qualität bei Technik-Schwerpunkt, +15 Stabilität.",
    focus: "technology",
    stability: 15,
  },
  allround: {
    name: "Allround-Engine",
    short: "Allround",
    description: "+1,5 Qualität für jedes Spiel, unabhängig vom Schwerpunkt.",
    focus: null,
    stability: 5,
  },
};

export const ENGINE_PHASES = [
  { name: "Architektur", share: 0.15, text: "Grundgerüst und Speicherverwaltung" },
  { name: "Kernsystem", share: 0.25, text: "Renderer, Eingabe und Spielschleife" },
  { name: "Modul-Integration", share: 0.3, text: "Erforschte Module docken an" },
  { name: "Optimierung", share: 0.2, text: "Stabilität und Performance" },
  { name: "Feinschliff", share: 0.1, text: "Werkzeuge und Dokumentation" },
];

export const ENGINE = {
  baseWork: 24,
  moduleWork: 7,
  /** Work and cost factor for modules already contained in the base engine. */
  upgradeFactor: 0.4,
  baseCost: 3000,
  moduleCost: 1200,
  maxTeam: 3,
  profileBonus: 4,
  allroundBonus: 1.5,
  licenseMinLevel: 3,
  exclusivityPenalty: 2,
  routinePerGame: 0.03,
  routineMax: 0.15,
  licenseBase: 22,
};
