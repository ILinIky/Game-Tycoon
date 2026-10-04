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
  {
    name: "Entertainment-Park",
    capacity: 90,
    rent: 260000,
    cost: 80000000,
    slots: 9,
    subtitle: "Ein eigenes Viertel für Ideen, Bühnen und Labore.",
  },
  {
    name: "Konzernzentrale",
    capacity: 100,
    rent: 600000,
    cost: 300000000,
    slots: 12,
    subtitle: "Das Herz eines weltweiten Unterhaltungskonzerns.",
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
  /** Flat quality bonus for every game. */
  quality?: number;
  /** Starting hype for new projects. */
  hype?: number;
  /** Sales bonus as fraction. */
  sales?: number;
  /** Daily motivation gain of every employee. */
  morale?: number;
  /** Monthly loyalty gain of every employee. */
  loyalty?: number;
  /** Skill bonus of new candidates. */
  recruit?: number;
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
  {
    id: "canteen",
    name: "Kantine",
    description: "Frisches Essen für alle: Motivation steigt täglich, +3 Loyalität pro Monat.",
    cost: 30000,
    upkeep: 700,
    office: 1,
    effects: { morale: 0.04, loyalty: 3 },
  },
  {
    id: "scouting",
    name: "Talent-Scouting",
    description: "Eigene Scouts auf Messen und Unis: Kandidaten mit +8 Fähigkeiten.",
    cost: 50000,
    upkeep: 1000,
    office: 2,
    effects: { recruit: 8 },
  },
  {
    id: "gym",
    name: "Fitness & Spa",
    description: "Sport, Sauna, Ruheräume: 20 % weniger Stress, 30 % weniger Energieverlust.",
    cost: 70000,
    upkeep: 1300,
    office: 2,
    effects: { stress: 0.2, energy: 0.3 },
  },
  {
    id: "people",
    name: "People & Culture",
    description: "Karrierepfade und Feedback: +5 Loyalität pro Monat, +20 % Lerntempo.",
    cost: 90000,
    upkeep: 1600,
    office: 3,
    effects: { loyalty: 5, learning: 0.2 },
  },
  {
    id: "mocap",
    name: "Motion-Capture-Studio",
    description: "Echte Darsteller im Anzug: +2 Qualität für alle Spiele.",
    cost: 250000,
    upkeep: 4500,
    office: 3,
    effects: { quality: 2 },
  },
  {
    id: "datacenter",
    name: "Rechenzentrum",
    description: "Eigene Server-Farm: 15 % weniger Bugs, +5 % Tempo.",
    cost: 300000,
    upkeep: 6000,
    office: 3,
    effects: { bugs: 0.15, speed: 0.05 },
  },
  {
    id: "agency",
    name: "Marketing-Agentur",
    description: "Hauseigene Kreativagentur: +8 Start-Hype, +30 % Kampagnen-Hype.",
    cost: 400000,
    upkeep: 7000,
    office: 4,
    effects: { hype: 8, campaign: 0.3 },
  },
  {
    id: "innovation",
    name: "Innovationslabor",
    description: "Prototypen-Teams: +35 % Forschungspunkte, +20 % Lerntempo.",
    cost: 500000,
    upkeep: 8000,
    office: 4,
    effects: { research: 0.35, learning: 0.2 },
  },
  {
    id: "cinema",
    name: "Premierenkino",
    description: "Weltpremieren für Presse und Fans: +5 % Verkäufe, +25 % Fans.",
    cost: 900000,
    upkeep: 12000,
    office: 5,
    effects: { sales: 0.05, fans: 0.25 },
  },
  {
    id: "arena",
    name: "E-Sport-Arena",
    description: "Eigene Turniere: +8 % Verkäufe, +5 Start-Hype, +30 % Fans.",
    cost: 3000000,
    upkeep: 35000,
    office: 6,
    effects: { sales: 0.08, hype: 5, fans: 0.3 },
  },
  {
    id: "museum",
    name: "Spielemuseum",
    description: "Deine Geschichte zum Anfassen: +1 Qualität, +6 % Verkäufe, +20 % Fans.",
    cost: 5000000,
    upkeep: 50000,
    office: 6,
    effects: { quality: 1, sales: 0.06, fans: 0.2 },
  },
  {
    id: "aicore",
    name: "KI-Kompetenzzentrum",
    description: "Eigene KI-Werkzeuge: +2 Qualität, +8 % Tempo, +20 % Forschung.",
    cost: 12000000,
    upkeep: 120000,
    office: 7,
    effects: { quality: 2, speed: 0.08, research: 0.2 },
  },
];
