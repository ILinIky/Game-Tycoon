export type Genre =
  | "Action"
  | "RPG"
  | "Strategie"
  | "Simulation"
  | "Adventure"
  | "Sport"
  | "Racing"
  | "Horror"
  | "Puzzle";
export type Skill =
  | "programming"
  | "design"
  | "art"
  | "audio"
  | "writing"
  | "marketing"
  | "management"
  | "research";
export type Role =
  "Gründer" | "Programmierung" | "Game Design" | "Art" | "Audio" | "QA";
export interface Company {
  name: string;
  founder: string;
  cash: number;
  fans: number;
  reputation: number;
  office: number;
  debt: number;
  researchPoints: number;
  founded: boolean;
  bankrupt: boolean;
}
export interface Employee {
  id: string;
  name: string;
  role: Role;
  skills: Record<Skill, number>;
  salary: number;
  age: number;
  experience: number;
  motivation: number;
  stress: number;
  energy: number;
  loyalty: number;
  potential: number;
  trait:
    | "Kreativ"
    | "Perfektionist"
    | "Teamplayer"
    | "Schneller Lerner"
    | "Bug Hunter";
  /** Specialisation unlocked at skill 80+. */
  perk?: string;
}
export interface GameProject {
  id: string;
  name: string;
  genre: Genre;
  theme: string;
  platforms: string[];
  audience: string;
  size:
    | "Indie"
    | "Small"
    | "Medium"
    | "AAA"
    | "Blockbuster"
    | "Mega"
    | "Legend";
  team: string[];
  duration: number;
  elapsed: number;
  budget: number;
  progress: number;
  quality: number;
  bugs: number;
  hype: number;
  engine: string;
  designFocus?: "systems" | "technology" | "atmosphere";
  ambition?: "focused" | "balanced" | "experimental";
  /** Released game this project continues. */
  sequelOf?: string;
  /** Root game id of the series and entry number (1 = original). */
  franchise?: string;
  entry?: number;
  publisher?: PublisherDeal;
  /** Launch price as factor of the scope's base price (see PRICE_STEPS). */
  priceFactor?: number;
  /** Automatic marketing during development. */
  marketing?: MarketingPlan;
  /** Optional production features (see GAME_FEATURES). */
  features?: string[];
  /** Automatic campaigns already handled for this project. */
  campaigns?: number;
  /** Snapshot of the production queue settings used to start this game. */
  production?: { presetName: string; queuedDay: number; autoRelease: boolean };
  points: {
    design: number;
    technology: number;
    art: number;
    content: number;
    audio: number;
    polish: number;
  };
  phase: string;
}
export type MarketingPlan = "none" | "basic" | "strong" | "max";
export interface Review {
  magazine: string;
  score: number;
  text: string;
}
export interface ReleasedGame extends GameProject {
  /** Automatic releases do not interrupt the running studio with a modal. */
  autoReleased?: boolean;
  releasedDay: number;
  score: number;
  reviews: Review[];
  units: number;
  revenue: number;
  price: number;
  patched: boolean;
  salesHistory?: { day: number; units: number; revenue: number }[];
  salesHistoryStartDay?: number;
  /** Running discount campaign. */
  sale?: { until: number; discount: number };
  lastSale?: number;
  /** Released expansions and the day the next one is ready. */
  dlcs?: number;
  dlcReady?: number;
  /** Day of the last expansion; sales are revived from here. */
  revivedDay?: number;
  chartPeak?: number;
}
export interface PublisherDeal {
  name: string;
  advance: number;
  share: number;
  hype: number;
}
export type EngineProfile = "graphics" | "systems" | "performance" | "allround";
export interface Engine {
  id: string;
  name: string;
  level: number;
  modules: string[];
  version?: number;
  profile?: EngineProfile;
  /** 0–100, reduces bugs in games built with this engine. */
  stability?: number;
  created?: number;
  /** Games released with this engine (routine bonus). */
  games?: number;
  licensed?: boolean;
  licenseRevenue?: number;
}
export interface EngineProject {
  name: string;
  version: number;
  baseId: string | null;
  profile: EngineProfile;
  modules: string[];
  team: string[];
  work: number;
  done: number;
  stability: number;
  budget: number;
  started: number;
}
export type EngineInput = Pick<
  EngineProject,
  "name" | "baseId" | "profile" | "modules" | "team"
>;
export interface TechEffects {
  /** Flat quality bonus for every new game. */
  quality?: number;
  /** Extra quality for specific genres. */
  genres?: Partial<Record<Genre, number>>;
  /** Development time reduction as fraction (0.1 = −10 %). */
  speed?: number;
  /** Project budget reduction as fraction. */
  cost?: number;
  /** Bug rate reduction as fraction. */
  bugs?: number;
  /** Sales bonus as fraction. */
  sales?: number;
  /** Slower sales decay as fraction. */
  longTail?: number;
  /** Starting hype for new projects. */
  hype?: number;
  /** Extra hype per marketing campaign. */
  campaign?: number;
  /** Fan gain bonus on release as fraction. */
  fans?: number;
  /** Research point income bonus as fraction. */
  research?: number;
  /** Research speed bonus as fraction. */
  labSpeed?: number;
  /** Engine level contributed when building a framework. */
  engine?: number;
  /** Extra net revenue per sale as fraction (store deals, live service). */
  revenue?: number;
  /** Extra profit of subsidiaries and holdings as fraction. */
  income?: number;
}
export type TechBranch =
  | "graphics"
  | "gameplay"
  | "audio"
  | "production"
  | "network"
  | "business"
  | "live"
  | "programs";
export interface Technology {
  id: string;
  name: string;
  category: TechBranch;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  points: number;
  cost: number;
  days: number;
  year: number;
  description: string;
  requires: string[];
  effects: TechEffects;
  /** Year from which the press expects this technology. */
  standard?: number;
  /** Repeatable research program with a maximum level. */
  maxLevel?: number;
}
export interface Platform {
  id: string;
  name: string;
  /** Peak market weight during the platform's prime. */
  share: number;
  license: number;
  year: number;
  /** Last year on the market; undefined = open-ended. */
  end?: number;
  power: number;
  audience: string;
  kind?: "pc" | "console" | "handheld" | "mobile" | "cloud";
  generation?: number;
}
export interface Competitor {
  name: string;
  releases: number;
  revenue: number;
  founded?: number;
  /** Acquired by the player. */
  owned?: boolean;
  /** 1–5: size and quality of the studio. */
  strength?: number;
}
export interface RivalGame {
  id: string;
  title: string;
  studio: string;
  genre: Genre;
  size: GameProject["size"];
  score: number;
  releasedDay: number;
}
export interface Market {
  popularity: Record<Genre, number>;
  competitors: Competitor[];
  rivalGames?: RivalGame[];
  /** Rivals copying a genre after one of the player's hits. */
  trend?: { genre: Genre; until: number; studios: string[] } | null;
  /** Rival studios that were merged into others. */
  defunct?: string[];
}
export type ContractFocus = "programming" | "design" | "art" | "audio";
export interface ContractOffer {
  id: string;
  client: string;
  title: string;
  focus: ContractFocus;
  level: number;
  work: number;
  days: number;
  payment: number;
  expires: number;
}
export interface ActiveContract extends ContractOffer {
  team: string[];
  done: number;
  deadline: number;
}
export interface ContractState {
  offers: ContractOffer[];
  active: ActiveContract[];
  completed: number;
  failed: number;
}
export interface ChartEntry {
  id: string;
  title: string;
  studio: string;
  own: boolean;
  units: number;
  rank: number;
  previous: number | null;
  weeks: number;
}
export interface Charts {
  week: number;
  day: number;
  entries: ChartEntry[];
}
export type BoothSize = "small" | "medium" | "large";
export interface ExpoResult {
  year: number;
  booth: BoothSize;
  projects: string[];
  hype: number;
  fans: number;
  award: string | null;
  reactions: string[];
}
export interface ExpoState {
  year: number;
  booth: BoothSize | null;
  projects: string[];
  result: ExpoResult | null;
}
export interface Award {
  year: number;
  title: string;
  game: string;
  kind: "indie" | "expo" | "chart" | "goty";
}
export interface Subsidiary {
  name: string;
  since: number;
  /** Monthly profit in 1990 euros. */
  income: number;
  strength: number;
}
/** Real company bought through the market, part of the player's group. */
export interface Holding {
  /** Ticker of the company in the market snapshot. */
  id: string;
  name: string;
  sector: string;
  /** Snapshot market value in euros; the current value follows the market. */
  value: number;
  /** Price actually paid (cash or shares). */
  paid?: number;
  /** Bought by share swap instead of cash. */
  merged?: boolean;
  since: number;
  /** Profit paid out to the studio so far. */
  earned: number;
  /** Last monthly payout. */
  lastIncome?: number;
}
export interface StockState {
  /** Shares outstanding. */
  shares: number;
  /** Shares held by the founder. */
  owned: number;
  /** Shares held by a hostile rival. */
  rivalStake: number;
  rival?: string;
  price: number;
  ipoDay: number;
  ipoPrice: number;
  /** Investor mood, multiplies the fundamental value (0.5–1.8). */
  sentiment: number;
  history: { day: number; price: number }[];
  quarterStart: number;
  /** Revenue the shareholders expect this quarter. */
  target: number;
  lastQuarter?: { day: number; revenue: number; target: number };
}
/** Merger of two real companies in the world ranking. */
export interface Merger {
  day: number;
  acquirer: string;
  target: string;
}
export interface ConsoleProject {
  name: string;
  generation: number;
  team: string[];
  work: number;
  done: number;
  budget: number;
  started: number;
}
export interface OwnConsole {
  id: string;
  name: string;
  generation: number;
  launched: number;
  /** Last day on the market. */
  end: number;
  power: number;
  /** Consoles sold so far. */
  installed: number;
  licenseRevenue: number;
}
export type Difficulty = "easy" | "normal" | "hard";
export interface RetiredGames {
  count: number;
  units: number;
  revenue: number;
  scoreSum: number;
  bestChart: number | null;
}
export interface YearStats {
  year: number;
  revenue: number;
  expenses: number;
  cashStart: number;
  fansStart: number;
  staffStart: number;
  repStart: number;
}
export interface YearReview {
  year: number;
  revenue: number;
  expenses: number;
  released: number;
  best: { name: string; score: number } | null;
  avgScore: number;
  fansGained: number;
  staffChange: number;
  staff: number;
  cash: number;
  reputation: number;
  awards: string[];
  valuation: number;
}
export interface GameEvent {
  id: string;
  day: number;
  title: string;
  body: string;
  kind: "info" | "success" | "warning";
  read: boolean;
  decision?: "raise" | "publisher" | "poach" | "salary" | "takeover";
  /** Employee or object the decision refers to. */
  target?: string;
}
export interface FinanceRecord {
  day: number;
  revenue: number;
  expenses: number;
  cash: number;
}
export interface ResearchProject {
  techId: string;
  elapsed: number;
  duration: number;
  points?: number;
}
export type ResearchFocus =
  "fundamental" | "balanced" | "applied" | "experimental";
export interface ResearchLab {
  level: number;
  focus: ResearchFocus;
}
export interface Recruitment {
  /** "Mix" searches all disciplines at once. */
  role: Role | "Mix";
  remaining: number;
  seniority: "Junior" | "Senior";
  budget: number;
}
export interface GameState {
  version: 1;
  day: number;
  speed: 0 | 1 | 4 | 8 | 12;
  seed: number;
  company: Company;
  employees: Employee[];
  projects: GameProject[];
  games: ReleasedGame[];
  engines: Engine[];
  engineProject: EngineProject | null;
  facilities: string[];
  technologies: string[];
  research: ResearchProject[];
  researchLevels: Record<string, number>;
  lab: ResearchLab;
  recruitment: Recruitment | null;
  candidates: Employee[];
  market: Market;
  events: GameEvent[];
  finances: FinanceRecord[];
  genreExperience: Partial<Record<Genre, number>>;
  licenses: string[];
  productionPresets?: ProductionPreset[];
  productionQueue?: ProductionQueueEntry[];
  productionQueuePaused?: boolean;
  contracts: ContractState;
  charts: Charts | null;
  expo: ExpoState;
  awards: Award[];
  subsidiaries: Subsidiary[];
  holdings?: Holding[];
  /** Totals of games removed from the archive (see MAX_ARCHIVED_GAMES). */
  retiredGames?: RetiredGames;
  stock?: StockState | null;
  mergers?: Merger[];
  consoleProject?: ConsoleProject | null;
  consoles?: OwnConsole[];
  /** Unlocked achievements by id with the day of unlocking. */
  achievements?: Record<string, number>;
  difficulty?: Difficulty;
  scenario?: string;
  /** Index of the next tutorial step; null once finished or skipped. */
  tutorial?: number | null;
  yearStats: YearStats;
  yearReviews: YearReview[];
}
export interface ProductionPreset {
  id: string;
  name: string;
  settings: Omit<ProjectInput, "name" | "genre">;
}
export interface ProductionQueueEntry {
  id: string;
  presetId: string;
  presetName: string;
  queuedDay: number;
  autoRelease: boolean;
  input: ProjectInput;
}
export type ProjectInput = Pick<
  GameProject,
  | "name"
  | "genre"
  | "theme"
  | "platforms"
  | "audience"
  | "size"
  | "team"
  | "engine"
  | "designFocus"
  | "ambition"
  | "sequelOf"
  | "publisher"
  | "priceFactor"
  | "marketing"
  | "features"
>;
