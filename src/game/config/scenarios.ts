import type { Difficulty, Employee, GameState, Role } from "../types";
import { TECHNOLOGIES } from "./technologies";
import { featureDefaults } from "../initial";
import { fairSalary } from "../employees/perks";
import { nice } from "../economy/scale";

export interface Scenario {
  id: string;
  name: string;
  year: number;
  /** Starting capital in euros of that year. */
  cash: number;
  office: number;
  /** Employees besides the founder. */
  staff: number;
  fans: number;
  reputation: number;
  description: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "classic",
    name: "Garagenstart 1990",
    year: 1990,
    cash: 50_000,
    office: 0,
    staff: 0,
    fans: 0,
    reputation: 0,
    description: "Der klassische Weg: ein Schreibtisch, eine Idee, 50.000 €.",
  },
  {
    id: "boom",
    name: "Konsolenboom 1996",
    year: 1996,
    cash: 400_000,
    office: 1,
    staff: 3,
    fans: 2_000,
    reputation: 15,
    description: "3D erobert die Wohnzimmer. Ein kleines Team und ein Loft.",
  },
  {
    id: "startup",
    name: "Startup 2005",
    year: 2005,
    cash: 1_000_000,
    office: 2,
    staff: 6,
    fans: 10_000,
    reputation: 25,
    description: "Risikokapital, ein Produktionsstudio und große Pläne.",
  },
  {
    id: "heir",
    name: "Konzern-Erbe 2012",
    year: 2012,
    cash: 50_000_000,
    office: 4,
    staff: 24,
    fans: 250_000,
    reputation: 55,
    description:
      "Du übernimmst ein Hauptquartier mit Team. Jetzt wird es groß.",
  },
];
export const scenarioById = (id?: string) =>
  SCENARIOS.find((x) => x.id === id) ?? SCENARIOS[0];

export const DIFFICULTIES: Record<
  Difficulty,
  { name: string; description: string; sales: number; costs: number }
> = {
  easy: {
    name: "Entspannt",
    description: "+25 % Verkäufe, 15 % geringere Kosten.",
    sales: 1.25,
    costs: 0.85,
  },
  normal: {
    name: "Normal",
    description: "Die ausgewogene Studio-Erfahrung.",
    sales: 1,
    costs: 1,
  },
  hard: {
    name: "Hart",
    description: "−20 % Verkäufe, 20 % höhere Kosten.",
    sales: 0.8,
    costs: 1.2,
  },
};
export const difficultyOf = (s: Pick<GameState, "difficulty">) =>
  DIFFICULTIES[s.difficulty ?? "normal"] ?? DIFFICULTIES.normal;

const NAMES = [
  "Mika Weber",
  "Jules Hartmann",
  "Robin Nguyen",
  "Samira Beck",
  "Noah Winter",
  "Leonie Park",
  "Emil Santos",
  "Toni Fischer",
  "Kim Albers",
  "Jona Reiter",
  "Tess Moreau",
  "Ilias Brandt",
  "Mara Okafor",
  "Lio Kaya",
  "Ava Lindqvist",
];
const ROLES: Role[] = ["Programmierung", "Game Design", "Art", "Audio", "QA"];

/** Starts a save in a later year with matching technology, staff and office. */
export function applyScenario(s: GameState, scenario: Scenario) {
  const day = Math.round(
    (Date.UTC(scenario.year, 0, 1) - Date.UTC(1990, 0, 1)) / 86_400_000,
  );
  s.scenario = scenario.id;
  s.day = day;
  s.company.cash = scenario.cash;
  s.company.office = scenario.office;
  s.company.fans = scenario.fans;
  s.company.reputation = scenario.reputation;
  s.finances = [{ day, revenue: 0, expenses: 0, cash: scenario.cash }];
  Object.assign(
    s,
    featureDefaults(
      day,
      scenario.cash,
      scenario.fans,
      scenario.staff + 1,
      scenario.reputation,
    ),
  );
  // Technology everyone already uses: all research up to the year before.
  if (scenario.year > 1990) {
    s.technologies = TECHNOLOGIES.filter(
      (t) => t.category !== "programs" && t.year < scenario.year,
    ).map((t) => t.id);
    s.company.researchPoints += Math.round((scenario.year - 1990) * 8);
  }
  const skill = Math.min(80, 45 + (scenario.year - 1990) * 1.2);
  const staff: Employee[] = Array.from({ length: scenario.staff }, (_, i) => {
    const level = Math.round(skill + ((i * 7) % 13) - 6);
    const e: Employee = {
      id: `scenario-${i}`,
      name:
        NAMES[i % NAMES.length] +
        (i >= NAMES.length ? ` ${Math.floor(i / NAMES.length) + 1}` : ""),
      role: ROLES[i % ROLES.length],
      skills: {
        programming: level,
        design: level - 4,
        art: level - 8,
        audio: level - 10,
        writing: level - 6,
        marketing: level - 12,
        management: level - 8,
        research: level - 6,
      },
      salary: 0,
      age: 26 + (i % 12),
      experience: 3 + (i % 8),
      motivation: 85,
      stress: 5,
      energy: 100,
      loyalty: 75,
      potential: Math.min(98, level + 20),
      trait: (
        [
          "Kreativ",
          "Perfektionist",
          "Teamplayer",
          "Schneller Lerner",
          "Bug Hunter",
        ] as const
      )[i % 5],
    };
    e.salary = nice(fairSalary(e, s));
    return e;
  });
  s.employees = [...s.employees, ...staff];
}
