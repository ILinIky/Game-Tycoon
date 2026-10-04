import { BALANCE, GENRES } from "./config/balance";
import type { Employee, GameState } from "./types";

/** Default state of the feature systems added after the first release. */
export function featureDefaults(
  day: number,
  cash: number,
  fans: number,
  staff: number,
  reputation: number,
): Pick<
  GameState,
  | "contracts"
  | "charts"
  | "expo"
  | "awards"
  | "subsidiaries"
  | "yearStats"
  | "yearReviews"
> {
  const year = new Date(Date.UTC(1990, 0, 1 + day)).getUTCFullYear();
  return {
    contracts: { offers: [], active: [], completed: 0, failed: 0 },
    charts: null,
    expo: { year, booth: null, projects: [], result: null },
    awards: [],
    subsidiaries: [],
    yearStats: {
      year,
      revenue: 0,
      expenses: 0,
      cashStart: cash,
      fansStart: fans,
      staffStart: staff,
      repStart: reputation,
    },
    yearReviews: [],
  };
}
export function founder(name = "Alex"): Employee {
  return {
    id: "founder",
    name,
    role: "Gründer",
    salary: BALANCE.founderSalary,
    age: 25,
    experience: 2,
    motivation: 90,
    stress: 5,
    energy: 100,
    loyalty: 100,
    potential: 95,
    trait: "Kreativ",
    skills: {
      programming: 54,
      design: 62,
      art: 42,
      audio: 35,
      writing: 50,
      marketing: 30,
      management: 45,
      research: 40,
    },
  };
}
export function initialState(): GameState {
  return {
    version: 1,
    day: 0,
    speed: 0,
    seed: 19900701,
    company: {
      name: "Dein Studio",
      founder: "Alex",
      cash: BALANCE.initialCash,
      fans: 0,
      reputation: 0,
      office: 0,
      debt: 0,
      researchPoints: 20,
      founded: false,
      bankrupt: false,
    },
    employees: [founder()],
    projects: [],
    productionQueue: [],
    productionQueuePaused: false,
    games: [],
    engines: [
      {
        id: "basic",
        name: "Zero Framework",
        level: 1,
        modules: ["2D Rendering"],
      },
    ],
    engineProject: null,
    facilities: [],
    technologies: [],
    research: [],
    researchLevels: {},
    lab: { level: 0, focus: "balanced" },
    recruitment: null,
    candidates: [],
    market: {
      popularity: Object.fromEntries(
        GENRES.map((g, i) => [g, 52 + ((i * 17) % 38)]),
      ) as Record<(typeof GENRES)[number], number>,
      competitors: [
        { name: "Northstar Works", releases: 0, revenue: 0, strength: 2 },
        { name: "Cobalt Collective", releases: 0, revenue: 0, strength: 2 },
        { name: "Fern Interactive", releases: 0, revenue: 0, strength: 1 },
      ],
      rivalGames: [],
    },
    events: [],
    finances: [{ day: 0, revenue: 0, expenses: 0, cash: BALANCE.initialCash }],
    genreExperience: {},
    licenses: ["pc"],
    ...featureDefaults(0, BALANCE.initialCash, 0, 1, 0),
  };
}
