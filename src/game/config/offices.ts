import type { GameProject } from "../types";

/** Office tiers. Prices are in 1990 euros and grow with the market. */
export const OFFICES = [
  {
    name: "Das erste Büro",
    capacity: 3,
    rent: 450,
    cost: 0,
    slots: 1,
    subtitle: "Kleine Räume. Große Ideen.",
  },
  {
    name: "Kreativ-Loft",
    capacity: 8,
    rent: 1500,
    cost: 20000,
    slots: 2,
    subtitle: "Platz für dein nächstes Kapitel.",
  },
  {
    name: "Produktionsstudio",
    capacity: 16,
    rent: 5000,
    cost: 150000,
    slots: 3,
    subtitle: "Ein Zuhause für ambitionierte Teams.",
  },
  {
    name: "Studio-Campus",
    capacity: 30,
    rent: 16000,
    cost: 900000,
    slots: 4,
    subtitle: "Von der Idee zur Institution.",
  },
  {
    name: "Hauptquartier",
    capacity: 50,
    rent: 45000,
    cost: 5000000,
    slots: 5,
    subtitle: "Eine Marke mit eigener Adresse.",
  },
  {
    name: "Studio-Tower",
    capacity: 80,
    rent: 120000,
    cost: 25000000,
    slots: 6,
    subtitle: "Die Skyline trägt deinen Namen.",
  },
];

export interface FacilityEffects {
  /** Development speed bonus as fraction. */
  speed?: number;
  /** Bug rate reduction as fraction. */
  bugs?: number;
  /** Stress gain reduction as fraction. */
  stress?: number;
  /** Energy drain reduction as fraction. */
  energy?: number;
  /** Skill growth bonus as fraction. */
  learning?: number;
  /** Training cost reduction as fraction. */
  training?: number;
  /** Research point bonus as fraction. */
  research?: number;
  /** Campaign hype bonus as fraction. */
  campaign?: number;
  /** Fan gain bonus on release as fraction. */
  fans?: number;
  /** Quality bonus for games with a matching design focus. */
  focus?: { focus: NonNullable<GameProject["designFocus"]>; quality: number };
}

export interface Facility {
  id: string;
  name: string;
  description: string;
  cost: number;
  upkeep: number;
  office: number;
  effects: FacilityEffects;
}

/** Facilities fill the limited slots of an office. */
export const FACILITIES: Facility[] = [
  {
    id: "coffee",
    name: "Espressobar",
    description: "Guter Kaffee hält das Team wach: +5 % Tempo, 25 % weniger Energieverlust.",
    cost: 4000,
    upkeep: 120,
    office: 0,
    effects: { speed: 0.05, energy: 0.25 },
  },
  {
    id: "lounge",
    name: "Lounge & Arcade",
    description: "Ein Ort zum Abschalten: 30 % weniger Stress.",
    cost: 6000,
    upkeep: 150,
    office: 0,
    effects: { stress: 0.3 },
  },
  {
    id: "library",
    name: "Bibliothek",
    description: "Fachbücher und Magazine: +20 % Forschungspunkte.",
    cost: 9000,
    upkeep: 180,
    office: 0,
    effects: { research: 0.2 },
  },
  {
    id: "server",
    name: "Serverraum",
    description: "Build-Server und Backups: 20 % weniger Bug-Risiko.",
    cost: 15000,
    upkeep: 400,
    office: 1,
    effects: { bugs: 0.2 },
  },
  {
    id: "sound",
    name: "Tonstudio",
    description: "Eigene Aufnahmen: +3 Qualität bei Schwerpunkt Atmosphäre.",
    cost: 20000,
    upkeep: 450,
    office: 1,
    effects: { focus: { focus: "atmosphere", quality: 3 } },
  },
  {
    id: "testlab",
    name: "Testlabor",
    description: "Spieler testen früh: +3 Qualität bei Schwerpunkt Spielsysteme.",
    cost: 20000,
    upkeep: 450,
    office: 1,
    effects: { focus: { focus: "systems", quality: 3 } },
  },
  {
    id: "workshop",
    name: "Technik-Werkstatt",
    description: "Dev-Kits und Messgeräte: +3 Qualität bei Schwerpunkt Technik.",
    cost: 20000,
    upkeep: 450,
    office: 1,
    effects: { focus: { focus: "technology", quality: 3 } },
  },
  {
    id: "academy",
    name: "Akademie",
    description: "Interne Kurse: +50 % Lerntempo, Weiterbildung 30 % günstiger.",
    cost: 45000,
    upkeep: 900,
    office: 2,
    effects: { learning: 0.5, training: 0.3 },
  },
  {
    id: "showroom",
    name: "Showroom",
    description: "Präsentationen für Presse und Fans: +40 % Kampagnen-Hype, +15 % Fans.",
    cost: 60000,
    upkeep: 1100,
    office: 2,
    effects: { campaign: 0.4, fans: 0.15 },
  },
];
