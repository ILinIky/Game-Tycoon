import type { Genre } from "../types";
export const BALANCE = {
  initialCash: 50000,
  dayMilliseconds: 1600,
  monthDays: 30,
  salaryDivisor: 30,
  bankruptcyLimit: -15000,
  recruitmentDays: 3,
  /** Candidates per recruiting round. */
  candidates: 4,
  /** Headhunters deliver at once for this multiple of the budget. */
  headhuntFactor: 2,
  campaignCost: 1800,
  campaignHype: 18,
  loan: 25000,
  loanInterest: 0.008,
  patchCost: 1200,
  trainingCost: 900,
  founderSalary: 0,
  softwarePerEmployee: 55,
  researchPerDay: 0.16,
  projectResearch: 14,
  idleResearch: 1.75,
  standardPenalty: 3,
  standardPenaltyMax: 18,
  expectationStart: 1992,
  expectationPerYear: 1.2,
  price: 24,
  maxProjects: 4,
  salesBase: 10,
  /** Quality saturation; higher = easier top scores. */
  qualityCurve: 65,
  /** Competitor releases that still dampen sales. */
  competitionCap: 25,
  /** Genre interest lost per own release (× size fame). */
  genreSaturation: 5,
  salesActiveDays: 360,
  hitSalesActiveDays: 540,
  salesFadeDays: 60,
  salesHistoryDays: 400,
  minimumCash: 1500,
  /** Yearly growth of the games market and of all prices. */
  marketGrowth: 1.09,
  marketGrowthYears: 35,
  recruitBudgets: [650, 1400, 2800],
  /** Genre experience counts up to this many releases. */
  genreExperienceCap: 5,
  genreExperienceQuality: 1.5,
  /** Monthly skill growth of busy employees. */
  skillGrowth: 0.4,
  raiseInterval: 365,
  raiseFactor: 1.08,
};
export const GENRES: Genre[] = [
  "Action",
  "RPG",
  "Strategie",
  "Simulation",
  "Adventure",
  "Sport",
  "Racing",
  "Horror",
  "Puzzle",
];
export const THEMES = [
  "Fantasy",
  "Sci-Fi",
  "Militär",
  "Cyberpunk",
  "Mittelalter",
  "Weltraum",
  "Crime",
  "Zombies",
  "Business",
  "Piraten",
];
/** Budgets in 1990 euros; `sales` multiplies units, `price` is the shop price. */
export const SIZES = {
  Indie: { cost: 5000, days: 48, team: 1, sales: 1, price: 15, fame: 0.6 },
  Small: { cost: 30000, days: 85, team: 2, sales: 2, price: 25, fame: 0.8 },
  Medium: { cost: 180000, days: 150, team: 4, sales: 3.5, price: 39, fame: 1 },
  AAA: { cost: 900000, days: 280, team: 8, sales: 6, price: 55, fame: 1.3 },
};
export { OFFICES } from "./offices";
export { PLATFORMS } from "./platforms";
export { TECHNOLOGIES } from "./technologies";
export const PHASES = [
  "Konzept",
  "Vorproduktion",
  "Produktion",
  "Polish",
  "Qualitätssicherung",
  "Release-Vorbereitung",
];
