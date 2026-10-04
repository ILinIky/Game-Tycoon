import type { GameState, Genre, ProjectInput } from "../types";
import { initialState } from "../initial";
import { tick } from "./tick";
import { GENRES, OFFICES, SIZES, THEMES } from "../config/balance";
import { createProject, projectCost, release, synergy } from "../projects/projects";
import { hire, recruit } from "../employees/recruiting";
import { researchBlocker, researchCost, startResearch } from "../research/research";
import { TECHNOLOGIES } from "../config/technologies";
import { isAssigned } from "../employees/assignment";
import { date } from "../utils";
import { marketScale, scaled } from "../economy/scale";
import { FACILITIES } from "../config/offices";
import { studioValue } from "../economy/valuation";
import { buildFacility, facilityBlocker, facilityCost, moveOffice, officeCost } from "../office/office";

/**
 * Simple scripted player used to check long-term balance: develops games with
 * all free staff, researches, hires and moves offices when affordable.
 */
export function botStep(s: GameState, actions: Record<string, (s: GameState) => void>) {
  const tryDo = (fn: () => void) => {
    try {
      fn();
      return true;
    } catch {
      return false;
    }
  };
  for (const p of [...s.projects]) if (p.progress >= 100) tryDo(() => release(s, p.id));
  const free = s.employees.filter((e) => !isAssigned(s, e.id)).map((e) => e.id);
  if (free.length && s.projects.length < 2) {
    const genre = [...GENRES].sort(
      (a, b) => s.market.popularity[b] - s.market.popularity[a],
    )[0] as Genre;
    const theme = THEMES.find((t) => synergy(genre, t) > 1) ?? THEMES[0];
    const sizes = (Object.keys(SIZES) as ProjectInput["size"][]).reverse();
    const engine = [...s.engines].sort((a, b) => b.level - a.level)[0].id;
    for (const size of sizes) {
      const input: ProjectInput = {
        name: `Game ${s.games.length + s.projects.length + 1}`,
        genre,
        theme,
        platforms: ["pc"],
        audience: "Teen",
        size,
        team: free,
        engine,
        designFocus: "systems",
        ambition: "balanced",
      };
      if (
        free.length >= SIZES[size].team &&
        projectCost(s, input) < s.company.cash * 0.6 &&
        tryDo(() => createProject(s, input))
      )
        break;
    }
  }
  for (const t of TECHNOLOGIES)
    if (
      !researchBlocker(s, t) &&
      researchCost(s, t).cost < s.company.cash * 0.15
    )
      tryDo(() => startResearch(s, t.id));
  const office = OFFICES[s.company.office];
  if (s.candidates.length && s.employees.length < office.capacity) {
    const best = [...s.candidates].sort(
      (a, b) => b.skills.programming + b.skills.design - a.skills.programming - a.skills.design,
    )[0];
    tryDo(() => hire(s, best.id));
    s.candidates = [];
  }
  if (
    !s.recruitment &&
    s.employees.length < office.capacity &&
    s.company.cash > (40000 + s.employees.length * 15000) * marketScale(s)
  )
    tryDo(() => recruit(s, "Programmierung", "Senior", scaled(s, 1400)));
  for (const f of FACILITIES)
    if (!facilityBlocker(s, f.id) && facilityCost(s, f.id) * 4 < s.company.cash)
      tryDo(() => buildFacility(s, f.id));
  const next = OFFICES[s.company.office + 1];
  if (
    next &&
    s.employees.length >= office.capacity &&
    s.company.cash > officeCost(s, s.company.office + 1) * 2.5
  )
    tryDo(() => moveOffice(s));
  actions.extra?.(s);
}

export function simulate(years: number, actions: Record<string, (s: GameState) => void> = {}) {
  let s = initialState();
  s.company.founded = true;
  const rows: string[] = [];
  let lastYear = 1990;
  let yearRevenue = 0;
  for (let d = 0; d < years * 365; d++) {
    botStep(s, actions);
    const before = s.finances.at(-1)!.revenue;
    const len = s.finances.length;
    s = tick(s);
    yearRevenue += s.finances.length > len ? s.finances.at(-1)!.revenue : s.finances.at(-1)!.revenue - before;
    const y = date(s.day).getUTCFullYear();
    if (y !== lastYear) {
      const best = s.games.filter((g) => date(g.releasedDay).getUTCFullYear() === lastYear);
      rows.push(
        `${lastYear} scale=${marketScale(s).toFixed(2)} fac=${s.facilities.length} cash=${Math.round(s.company.cash).toLocaleString("de-DE")} rev=${Math.round(yearRevenue).toLocaleString("de-DE")} fans=${s.company.fans} rep=${Math.round(s.company.reputation)} staff=${s.employees.length} office=${s.company.office} techs=${s.technologies.length} games=${best.length} value=${Math.round(studioValue(s).total).toLocaleString("de-DE")} profit=${Math.round(studioValue(s).profit).toLocaleString("de-DE")} sizes=${best.map((g) => g.size[0]).join("")} scores=${best.map((g) => g.score.toFixed(1)).join(",")}`,
      );
      lastYear = y;
      yearRevenue = 0;
    }
    if (s.company.bankrupt) {
      rows.push(`BANKRUPT day ${s.day}`);
      break;
    }
  }
  return { s, rows };
}
