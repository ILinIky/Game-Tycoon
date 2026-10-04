import type { GameState, MarketingPlan } from "../types";
import { PRICE_STEPS } from "../projects/pricing";
import { MARKETING_KEYS } from "../marketing/campaigns";
import { validFeatures } from "../config/features";
import {
  BALANCE,
  GENRES,
  OFFICES,
  PLATFORMS,
  TECHNOLOGIES,
  THEMES,
  SIZES,
} from "../config/balance";
import { LABS, RESEARCH_FOCUS } from "../config/technologies";
import { ENGINE_PROFILES } from "../config/engines";
import { FACILITIES } from "../config/offices";
import { featureDefaults } from "../initial";
import { MAX_PRODUCTION_QUEUE, validQueuedInput } from "../projects/queue";
type Obj = Record<string, unknown>;
const object = (v: unknown): v is Obj =>
  !!v && typeof v === "object" && !Array.isArray(v);
const numeric = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");
const list = (v: unknown, check: (x: unknown) => boolean) =>
  Array.isArray(v) && v.length < 10000 && v.every(check);
const fields = (v: unknown, nums: string[], texts: string[] = []): v is Obj =>
  object(v) &&
  nums.every((k) => numeric(v[k])) &&
  texts.every((k) => typeof v[k] === "string");
const skills = [
  "programming",
  "design",
  "art",
  "audio",
  "writing",
  "marketing",
  "management",
  "research",
];
const points = ["design", "technology", "art", "content", "audio", "polish"];
const validProductionOrigin = (v: unknown) =>
  fields(v, ["queuedDay"], ["presetName"]) &&
  Number.isInteger(v.queuedDay) &&
  (v.queuedDay as number) >= 0 &&
  !!(v.presetName as string).trim() &&
  (v.presetName as string).length <= 28 &&
  typeof v.autoRelease === "boolean";
function validSalesHistory(game: Obj, currentDay: number) {
  const start = game.salesHistoryStartDay;
  if (
    start !== undefined &&
    (!numeric(start) ||
      !Number.isInteger(start) ||
      start <= (game.releasedDay as number) ||
      start > currentDay + 1)
  )
    return false;
  if (game.salesHistory === undefined) return true;
  if (
    !Array.isArray(game.salesHistory) ||
    game.salesHistory.length > BALANCE.salesHistoryDays
  )
    return false;
  let lastDay = game.releasedDay as number;
  let units = 0;
  let revenue = 0;
  for (const record of game.salesHistory) {
    if (
      !fields(record, ["day", "units", "revenue"]) ||
      !Number.isInteger(record.day) ||
      !Number.isInteger(record.units)
    )
      return false;
    const day = record.day as number;
    if (
      day <= lastDay ||
      day > currentDay ||
      (start !== undefined && day < start) ||
      (record.units as number) < 0 ||
      (record.revenue as number) < 0
    )
      return false;
    units += record.units as number;
    revenue += record.revenue as number;
    lastDay = day;
  }
  return (
    units <= (game.units as number) &&
    revenue <= (game.revenue as number) + 0.01
  );
}
const project = (v: unknown) =>
  fields(
    v,
    ["duration", "elapsed", "budget", "progress", "quality", "bugs", "hype"],
    ["id", "name", "genre", "theme", "audience", "size", "engine", "phase"],
  ) &&
  strings(v.platforms) &&
  strings(v.team) &&
  (v.production === undefined || validProductionOrigin(v.production)) &&
  (v.autoReleased === undefined || typeof v.autoReleased === "boolean") &&
  fields(v.points, points) &&
  GENRES.includes(v.genre as (typeof GENRES)[number]) &&
  Object.keys(SIZES).includes(v.size as string) &&
  (v.designFocus === undefined ||
    ["systems", "technology", "atmosphere"].includes(
      v.designFocus as string,
    )) &&
  (v.ambition === undefined ||
    ["focused", "balanced", "experimental"].includes(v.ambition as string)) &&
  (v.duration as number) > 0 &&
  (v.progress as number) >= 0 &&
  (v.progress as number) <= 100;
export function validateSave(v: unknown): GameState {
  if (
    !fields(v, ["day", "speed", "seed"]) ||
    v.version !== 1 ||
    !Number.isInteger(v.day) ||
    (v.day as number) < 0 ||
    ![0, 1, 2, 4, 8, 12].includes(v.speed as number)
  )
    throw new Error("Ungültige Spielstandversion oder Zeitdaten.");
  const c = v.company;
  if (
    !fields(
      c,
      ["cash", "fans", "reputation", "office", "debt", "researchPoints"],
      ["name", "founder"],
    ) ||
    typeof c.founded !== "boolean" ||
    typeof c.bankrupt !== "boolean" ||
    !Number.isInteger(c.office) ||
    !OFFICES[c.office as number]
  )
    throw new Error("Ungültige Firmendaten.");
  if (
    !list(
      v.employees,
      (e) =>
        fields(
          e,
          [
            "salary",
            "age",
            "experience",
            "motivation",
            "stress",
            "energy",
            "loyalty",
            "potential",
          ],
          ["id", "name", "role", "trait"],
        ) && fields(e.skills, skills),
    ) ||
    !Array.isArray(v.employees) ||
    !v.employees.length ||
    !list(v.projects, project) ||
    !list(
      v.games,
      (g) =>
        project(g) &&
        fields(g, ["releasedDay", "score", "units", "revenue", "price"]) &&
        (g.price as number) > 0 &&
        typeof g.patched === "boolean" &&
        validSalesHistory(g, v.day as number) &&
        list(g.reviews, (r) => fields(r, ["score"], ["magazine", "text"])),
    )
  )
    throw new Error("Ungültige Team- oder Projektdaten.");
  if (
    !list(
      v.engines,
      (e) => fields(e, ["level"], ["id", "name"]) && strings(e.modules),
    ) ||
    !strings(v.technologies) ||
    !v.technologies.every((id) => TECHNOLOGIES.some((t) => t.id === id)) ||
    !strings(v.licenses) ||
    !v.licenses.every((id) => PLATFORMS.some((p) => p.id === id)) ||
    !list(
      v.candidates,
      (e) =>
        fields(
          e,
          [
            "salary",
            "age",
            "experience",
            "motivation",
            "stress",
            "energy",
            "loyalty",
            "potential",
          ],
          ["id", "name", "role", "trait"],
        ) && fields(e.skills, skills),
    )
  )
    throw new Error("Ungültige Technologie- oder Kandidatendaten.");
  if (
    !object(v.market) ||
    !fields(v.market.popularity, GENRES) ||
    !list(v.market.competitors, (c) =>
      fields(c, ["releases", "revenue"], ["name"]),
    ) ||
    !fields(v.genreExperience, []) ||
    !Object.values(v.genreExperience).every(numeric)
  )
    throw new Error("Ungültige Marktdaten.");
  if (
    !list(
      v.events,
      (e) =>
        fields(e, ["day"], ["id", "title", "body", "kind"]) &&
        typeof e.read === "boolean",
    ) ||
    !list(v.finances, (f) =>
      fields(f, ["day", "revenue", "expenses", "cash"]),
    ) ||
    !Array.isArray(v.finances) ||
    !v.finances.length
  )
    throw new Error("Ungültige Ereignis- oder Finanzdaten.");
  const researchList =
    v.research === null || v.research === undefined
      ? []
      : Array.isArray(v.research)
        ? v.research
        : [v.research];
  if (
    !list(
      researchList,
      (r) =>
        fields(r, ["elapsed", "duration"], ["techId"]) &&
        (r.duration as number) > 0 &&
        TECHNOLOGIES.some((t) => t.id === r.techId),
    ) ||
    (v.researchLevels !== undefined &&
      (!object(v.researchLevels) ||
        !Object.entries(v.researchLevels).every(
          ([id, level]) =>
            numeric(level) && TECHNOLOGIES.some((t) => t.id === id),
        ))) ||
    (v.lab !== undefined &&
      (!fields(v.lab, ["level"], ["focus"]) ||
        !LABS[v.lab.level as number] ||
        !((v.lab.focus as string) in RESEARCH_FOCUS)))
  )
    throw new Error("Ungültige Forschungsdaten.");
  const ep = v.engineProject;
  if (
    ep !== undefined &&
    ep !== null &&
    (!fields(
      ep,
      ["version", "work", "done", "stability", "budget", "started"],
      ["name", "profile"],
    ) ||
      !strings(ep.modules) ||
      !strings(ep.team) ||
      !((ep.work as number) > 0) ||
      !((ep.profile as string) in ENGINE_PROFILES) ||
      !(ep.team as string[]).every((id) =>
        (v.employees as Obj[]).some((e) => e.id === id),
      ))
  )
    throw new Error("Ungültige Engine-Entwicklung.");
  if (
    v.recruitment !== null &&
    !fields(v.recruitment, ["remaining", "budget"], ["role", "seniority"])
  )
    throw new Error("Ungültige Recruitingdaten.");
  const result = structuredClone(v) as unknown as GameState;
  if (
    v.productionPresets !== undefined &&
    (!Array.isArray(v.productionPresets) ||
      v.productionPresets.length > 8 ||
      !v.productionPresets.every((preset) => {
        if (
          !fields(preset, [], ["id", "name"]) ||
          !(preset.name as string).trim() ||
          (preset.name as string).length > 28
        )
          return false;
        const settings = preset.settings;
        return (
          fields(settings, [], ["theme", "audience", "size", "engine"]) &&
          THEMES.includes(settings.theme as string) &&
          Object.keys(SIZES).includes(settings.size as string) &&
          ["Everyone", "Teen", "Mature"].includes(
            settings.audience as string,
          ) &&
          strings(settings.team) &&
          settings.team.length <= 100 &&
          new Set(settings.team).size === settings.team.length &&
          strings(settings.platforms) &&
          settings.platforms.length > 0 &&
          settings.platforms.every((id) =>
            PLATFORMS.some((platform) => platform.id === id),
          ) &&
          (settings.designFocus === undefined ||
            ["systems", "technology", "atmosphere"].includes(
              settings.designFocus as string,
            )) &&
          (settings.ambition === undefined ||
            ["focused", "balanced", "experimental"].includes(
              settings.ambition as string,
            )) &&
          (settings.priceFactor === undefined ||
            PRICE_STEPS.includes(settings.priceFactor as number)) &&
          (settings.marketing === undefined ||
            MARKETING_KEYS.includes(settings.marketing as MarketingPlan)) &&
          validFeatures(settings.features)
        );
      }) ||
      new Set(v.productionPresets.map((preset) => preset.id)).size !==
        v.productionPresets.length)
  )
    throw new Error("Ungültige Produktionsvorlagen.");
  result.productionPresets ??= [];
  if (
    (v.productionQueuePaused !== undefined &&
      typeof v.productionQueuePaused !== "boolean") ||
    (v.productionQueue !== undefined &&
      (!Array.isArray(v.productionQueue) ||
        v.productionQueue.length > MAX_PRODUCTION_QUEUE ||
        !v.productionQueue.every(
          (entry) =>
            fields(entry, ["queuedDay"], ["id", "presetId", "presetName"]) &&
            !!(entry.id as string).trim() &&
            !!(entry.presetId as string).trim() &&
            !!(entry.presetName as string).trim() &&
            (entry.presetName as string).length <= 28 &&
            Number.isInteger(entry.queuedDay) &&
            (entry.queuedDay as number) >= 0 &&
            (entry.queuedDay as number) <= (v.day as number) &&
            typeof entry.autoRelease === "boolean" &&
            validQueuedInput(entry.input),
        ) ||
        new Set(v.productionQueue.map((entry) => entry.id)).size !==
          v.productionQueue.length)) ||
    [...result.projects, ...result.games].some(
      (p) => p.production && p.production.queuedDay > result.day,
    )
  )
    throw new Error("Ungültige Produktionswarteschlange.");
  result.productionQueue ??= [];
  result.productionQueuePaused ??= false;
  result.research = structuredClone(researchList) as GameState["research"];
  result.researchLevels ??= {};
  result.lab ??= { level: 0, focus: "balanced" };
  result.engineProject ??= null;
  result.facilities = Array.isArray(result.facilities)
    ? result.facilities.filter((id) => FACILITIES.some((f) => f.id === id))
    : [];
  normalizeFeatures(result);
  const ids = new Set(result.employees.map((e) => e.id));
  if (
    ids.size !== result.employees.length ||
    result.projects.some(
      (p) =>
        p.team.some((id) => !ids.has(id)) ||
        p.platforms.some((id) => !PLATFORMS.some((p) => p.id === id)),
    )
  )
    throw new Error("Ungültige Referenzen im Spielstand.");
  result.speed = 0;
  return result;
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("studio-zero", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("saves");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function saveSlot(slot: string, state: GameState) {
  const payload = { savedAt: new Date().toISOString(), state };
  try {
    const db = await database();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("saves", "readwrite");
      tx.objectStore("saves").put(payload, slot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    localStorage.setItem(`studio-zero-${slot}`, JSON.stringify(payload));
  }
}
export async function loadSlot(
  slot: string,
): Promise<{ state: GameState; savedAt: string } | null> {
  let payload: unknown;
  try {
    const db = await database();
    payload = await new Promise((resolve, reject) => {
      const r = db.transaction("saves").objectStore("saves").get(slot);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
  } catch {
    /* local fallback below */
  }
  if (!payload) {
    const raw = localStorage.getItem(`studio-zero-${slot}`);
    if (raw) payload = JSON.parse(raw) as unknown;
  }
  if (!payload) return null;
  if (!object(payload) || typeof payload.savedAt !== "string")
    throw new Error("Der Spielstand ist beschädigt.");
  return { state: validateSave(payload.state), savedAt: payload.savedAt };
}

/**
 * Newer feature systems are optional in old saves. Missing or malformed data
 * falls back to safe defaults instead of rejecting the whole save.
 */
function normalizeFeatures(s: GameState) {
  const defaults = featureDefaults(
    s.day,
    s.company.cash,
    s.company.fans,
    s.employees.length,
    s.company.reputation,
  );
  const ids = new Set(s.employees.map((e) => e.id));
  const c = s.contracts as unknown;
  s.contracts =
    object(c) && Array.isArray(c.offers) && Array.isArray(c.active)
      ? {
          offers: (c.offers as Obj[]).filter((o) =>
            fields(
              o,
              ["level", "work", "days", "payment", "expires"],
              ["id", "client", "title", "focus"],
            ),
          ) as unknown as GameState["contracts"]["offers"],
          active: (c.active as Obj[]).filter(
            (o) =>
              fields(
                o,
                ["level", "work", "days", "payment", "done", "deadline"],
                ["id", "client", "title", "focus"],
              ) &&
              strings(o.team) &&
              (o.team as string[]).every((id) => ids.has(id)),
          ) as unknown as GameState["contracts"]["active"],
          completed: numeric(c.completed) ? c.completed : 0,
          failed: numeric(c.failed) ? c.failed : 0,
        }
      : defaults.contracts;
  const charts = s.charts as unknown;
  s.charts =
    object(charts) && Array.isArray(charts.entries) && numeric(charts.week)
      ? (charts as unknown as GameState["charts"])
      : null;
  const expo = s.expo as unknown;
  s.expo =
    object(expo) && numeric(expo.year) && strings(expo.projects)
      ? (expo as unknown as GameState["expo"])
      : defaults.expo;
  s.awards = Array.isArray(s.awards)
    ? s.awards.filter((a) => fields(a, ["year"], ["title", "game", "kind"]))
    : [];
  s.subsidiaries = Array.isArray(s.subsidiaries)
    ? s.subsidiaries.filter((x) =>
        fields(x, ["since", "income", "strength"], ["name"]),
      )
    : [];
  s.retiredGames = fields(s.retiredGames, [
    "count",
    "units",
    "revenue",
    "scoreSum",
  ])
    ? {
        ...s.retiredGames,
        bestChart: numeric(s.retiredGames.bestChart)
          ? s.retiredGames.bestChart
          : null,
      }
    : undefined;
  s.holdings = Array.isArray(s.holdings)
    ? s.holdings
        .filter((x) =>
          fields(x, ["value", "since", "earned"], ["id", "name", "sector"]),
        )
        .filter((x, i, all) => all.findIndex((y) => y.id === x.id) === i)
    : [];
  s.yearStats = fields(s.yearStats, [
    "year",
    "revenue",
    "expenses",
    "cashStart",
    "fansStart",
    "staffStart",
    "repStart",
  ])
    ? s.yearStats
    : defaults.yearStats;
  s.yearReviews = Array.isArray(s.yearReviews)
    ? s.yearReviews.filter((r) => fields(r, ["year", "revenue", "expenses"]))
    : [];
  s.market.rivalGames = Array.isArray(s.market.rivalGames)
    ? s.market.rivalGames.filter((g) =>
        fields(
          g,
          ["score", "releasedDay"],
          ["id", "title", "studio", "genre", "size"],
        ),
      )
    : [];
}
