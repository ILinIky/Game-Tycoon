import { acceptContract, cancelContract } from "../game/contracts/contracts";
import { setPrice, startDlc, startSale } from "../game/projects/pricing";
import { bookExpo } from "../game/marketing/expo";
import { acquireStudio } from "../game/market/rivals";
import { runCampaign } from "../game/marketing/campaigns";
import {
  buyCompany,
  sellCompany,
  type CompanyOffer,
} from "../game/market/holdings";
import {
  adjustSalary,
  fireEmployee,
  resolvePoach,
  resolveSalary,
  resolveTeamRaise,
} from "../game/employees/perks";
import type { BoothSize } from "../game/types";
import { create } from "zustand";
import {
  loanAmount,
  loanLimit,
  patchCost,
} from "../game/economy/scale";
import {
  buildFacility,
  moveOffice,
  removeFacility,
  trainingCost,
} from "../game/office/office";
import {
  cancelEngine,
  isWorking,
  startEngine,
  toggleLicense,
} from "../game/engines/engines";
import type {
  EngineInput,
  GameState,
  Genre,
  ProjectInput,
  ResearchFocus,
  Role,
} from "../game/types";
import { initialState } from "../game/initial";
import { tick } from "../game/simulation/tick";
import { createProject, release } from "../game/projects/projects";
import { saveProductionPreset } from "../game/projects/presets";
import {
  enqueueFromPreset,
  processProductionQueue,
} from "../game/projects/queue";
import { hire, recruit } from "../game/employees/recruiting";
import {
  cancelResearch,
  setResearchFocus,
  startResearch,
  upgradeLab,
} from "../game/research/research";
import { clamp } from "../game/utils";
import { notify } from "../game/events/events";
type Store = {
  game: GameState;
  hydrated: boolean;
  error: string | null;
  setGame: (s: GameState) => void;
  clearError: () => void;
  hydrate: (s?: GameState) => void;
  speed: (n: GameState["speed"]) => void;
  advance: () => void;
  found: (name: string, founder: string) => void;
  project: (input: ProjectInput) => boolean;
  savePreset: (name: string, input: ProjectInput) => boolean;
  removePreset: (id: string) => void;
  queuePreset: (
    presetId: string,
    titles: string[],
    genre: Genre,
    autoRelease: boolean,
  ) => boolean;
  removeQueued: (id: string) => void;
  moveQueued: (id: string, direction: -1 | 1) => void;
  pauseQueue: (paused: boolean) => void;
  release: (id: string) => void;
  recruit: (
    role: Role | "Mix",
    seniority: "Junior" | "Senior",
    budget: number,
    instant?: boolean,
  ) => void;
  hire: (id: string) => void;
  adjustSalary: (id: string) => void;
  fire: (id: string) => void;
  research: (id: string) => void;
  cancelResearch: (id: string) => void;
  researchFocus: (focus: ResearchFocus) => void;
  upgradeLab: () => void;
  campaign: (id: string) => void;
  patch: (id: string) => void;
  train: (id: string) => void;
  upgrade: () => void;
  buildFacility: (id: string) => void;
  removeFacility: (id: string) => void;
  loan: () => void;
  repay: () => void;
  startEngine: (input: EngineInput) => boolean;
  cancelEngine: () => void;
  toggleLicense: (id: string) => void;
  rename: (name: string) => void;
  readEvents: () => void;
  decision: (id: string, accept: boolean) => void;
  acceptContract: (id: string, team: string[]) => boolean;
  cancelContract: (id: string) => void;
  setPrice: (id: string, factor: number) => void;
  startSale: (id: string, discount: number) => void;
  startDlc: (id: string) => void;
  bookExpo: (booth: BoothSize, projects: string[]) => boolean;
  acquireStudio: (name: string) => void;
  buyCompany: (offer: CompanyOffer) => void;
  sellCompany: (id: string) => void;
  reset: () => void;
};
export const useGame = create<Store>((set, get) => {
  const change = (fn: (s: GameState) => void) => {
    try {
      const s = structuredClone(get().game);
      if (s.company.bankrupt)
        throw new Error(
          "Das Studio ist zahlungsunfähig. Lade einen Spielstand oder starte neu.",
        );
      fn(s);
      s.finances.at(-1)!.cash = s.company.cash;
      set({ game: s, error: null });
      return true;
    } catch (e) {
      set({
        error:
          e instanceof Error
            ? e.message
            : "Die Aktion konnte nicht ausgeführt werden.",
      });
      return false;
    }
  };
  const spend = (s: GameState, cost: number) => {
    if (s.company.cash < cost)
      throw new Error("Dafür reicht dein Budget aktuell nicht.");
    s.company.cash -= cost;
    s.finances.at(-1)!.expenses += cost;
  };
  return {
    game: initialState(),
    hydrated: false,
    error: null,
    setGame: (game) => set({ game: { ...game, speed: 0 }, error: null }),
    hydrate: (game) => set({ game: game ?? get().game, hydrated: true }),
    clearError: () => set({ error: null }),
    speed: (speed) =>
      change((s) => {
        s.speed = speed;
      }),
    advance: () => set({ game: tick(get().game) }),
    found: (name, founder) =>
      change((s) => {
        s.company.name = name.trim() || "Untitled Studio";
        s.company.founder = founder.trim() || "Alex";
        s.employees[0].name = s.company.founder;
        s.company.founded = true;
        notify(
          s,
          "Dein erstes Kapitel",
          "Gründe ein Projekt, stelle dein Team zusammen und entwickle dein erstes Spiel.",
          "success",
        );
      }),
    project: (input) => change((s) => createProject(s, input)),
    savePreset: (name, input) =>
      change((s) => saveProductionPreset(s, name, input)),
    removePreset: (id) =>
      change((s) => {
        s.productionPresets = s.productionPresets?.filter(
          (preset) => preset.id !== id,
        );
      }),
    queuePreset: (presetId, titles, genre, autoRelease) =>
      change((s) => enqueueFromPreset(s, presetId, titles, genre, autoRelease)),
    removeQueued: (id) =>
      change((s) => {
        s.productionQueue = s.productionQueue?.filter((job) => job.id !== id);
      }),
    moveQueued: (id, direction) =>
      change((s) => {
        const queue = s.productionQueue ?? [];
        const index = queue.findIndex((job) => job.id === id);
        const next = index + direction;
        if (index >= 0 && next >= 0 && next < queue.length)
          [queue[index], queue[next]] = [queue[next], queue[index]];
      }),
    pauseQueue: (paused) =>
      change((s) => {
        s.productionQueuePaused = paused;
      }),
    release: (id) =>
      change((s) => {
        release(s, id);
        processProductionQueue(s);
      }),
    recruit: (role, seniority, budget, instant) =>
      change((s) => recruit(s, role, seniority, budget, instant)),
    hire: (id) => change((s) => hire(s, id)),
    adjustSalary: (id) => change((s) => adjustSalary(s, id)),
    fire: (id) => change((s) => fireEmployee(s, id)),
    research: (id) => change((s) => startResearch(s, id)),
    cancelResearch: (id) => change((s) => cancelResearch(s, id)),
    researchFocus: (focus) => change((s) => setResearchFocus(s, focus)),
    upgradeLab: () => change((s) => upgradeLab(s)),
    campaign: (id) =>
      change((s) => {
        const p = [...s.projects, ...s.games].find((p) => p.id === id);
        if (!p) throw new Error("Wähle ein Projekt.");
        runCampaign(s, p);
        notify(
          s,
          "Die Welt schaut zu",
          `Eine Magazinkampagne für ${p.name} erzeugt neue Aufmerksamkeit.`,
          "success",
        );
      }),
    patch: (id) =>
      change((s) => {
        const g = s.games.find((g) => g.id === id);
        if (!g || g.patched)
          throw new Error("Der Patch ist bereits veröffentlicht.");
        spend(s, patchCost(s));
        g.patched = true;
        g.bugs = 0;
        notify(
          s,
          "Update veröffentlicht",
          `${g.name} erhält einen Qualitätspatch.`,
          "success",
        );
      }),
    train: (id) =>
      change((s) => {
        const e = s.employees.find((e) => e.id === id);
        if (!e) return;
        if (isWorking(s, id))
          throw new Error(
            "Training ist möglich, sobald die Entwicklung abgeschlossen ist.",
          );
        spend(s, trainingCost(s));
        for (const k of Object.keys(e.skills) as (keyof typeof e.skills)[])
          e.skills[k] = Math.min(
            Math.max(e.potential, e.skills[k]),
            clamp(e.skills[k] + (e.trait === "Schneller Lerner" ? 7 : 5)),
          );
        e.motivation = clamp(e.motivation + 4);
      }),
    upgrade: () => change((s) => moveOffice(s)),
    buildFacility: (id) => change((s) => buildFacility(s, id)),
    removeFacility: (id) => change((s) => removeFacility(s, id)),
    loan: () =>
      change((s) => {
        if (s.company.debt + loanAmount(s) > loanLimit(s))
          throw new Error("Dein Kreditrahmen ist ausgeschöpft.");
        s.company.cash += loanAmount(s);
        s.company.debt += loanAmount(s);
      }),
    repay: () =>
      change((s) => {
        const amount = Math.min(s.company.debt, loanAmount(s));
        if (!amount) throw new Error("Du hast keine offenen Kredite.");
        if (s.company.cash < amount)
          throw new Error("Für die Rückzahlung fehlt Kapital.");
        s.company.cash -= amount;
        s.company.debt -= amount;
      }),
    startEngine: (input) => change((s) => startEngine(s, input)),
    cancelEngine: () => change((s) => cancelEngine(s)),
    toggleLicense: (id) => change((s) => toggleLicense(s, id)),
    rename: (name) =>
      change((s) => {
        if (!name.trim()) throw new Error("Dein Studio braucht einen Namen.");
        s.company.name = name.trim();
      }),
    readEvents: () =>
      change((s) => {
        s.events.forEach((e) => {
          e.read = true;
        });
      }),
    decision: (id, accept) =>
      change((s) => {
        const event = s.events.find((e) => e.id === id);
        if (!event?.decision) return;
        if (event.decision === "poach") return resolvePoach(s, id, accept);
        if (event.decision === "salary") return resolveSalary(s, id, accept);
        if (event.decision === "raise") return resolveTeamRaise(s, id, accept);
        delete event.decision;
        event.read = true;
      }),
    acceptContract: (id, team) => change((s) => acceptContract(s, id, team)),
    cancelContract: (id) => change((s) => cancelContract(s, id)),
    setPrice: (id, factor) => change((s) => setPrice(s, id, factor)),
    startSale: (id, discount) => change((s) => startSale(s, id, discount)),
    startDlc: (id) => change((s) => startDlc(s, id)),
    bookExpo: (booth, projects) => change((s) => bookExpo(s, booth, projects)),
    acquireStudio: (name) => change((s) => acquireStudio(s, name)),
    buyCompany: (offer) => change((s) => buyCompany(s, offer)),
    sellCompany: (id) => change((s) => sellCompany(s, id)),
    reset: () => set({ game: initialState(), error: null }),
  };
});
