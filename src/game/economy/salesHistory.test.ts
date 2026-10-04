import { describe, expect, it } from "vitest";
import { initialState } from "../initial";
import { createProject, release } from "../projects/projects";
import { validateSave } from "../persistence/saves";
import { sales } from "./economy";
import {
  recordSales,
  salesFade,
  salesLifetime,
  salesMonth,
  salesPhase,
  combinedSalesMonth,
} from "./salesHistory";

function released() {
  const state = initialState();
  state.company.founded = true;
  createProject(state, {
    name: "Orbit",
    genre: "Simulation",
    theme: "Weltraum",
    platforms: ["pc"],
    audience: "Alle",
    size: "Indie",
    team: ["founder"],
    engine: "basic",
  });
  state.projects[0].progress = 100;
  release(state, state.projects[0].id);
  state.games[0].score = 8;
  return state;
}

describe("täglicher Verkaufsverlauf", () => {
  it("summiert mehrere Releases und kennzeichnet lückenhafte Tage", () => {
    const first = released().games[0],
      second = released().games[0];
    recordSales(first, 1, 5, 84);
    recordSales(second, 1, 8, 134.4);
    const month = combinedSalesMonth([first, second], 1)!;
    expect(month.units).toBe(13);
    expect(month.revenue).toBeCloseTo(218.4);
    expect(month.points[1].units).toBe(13);
    recordSales(first, 2, 4, 67.2);
    const partial = combinedSalesMonth([first, second], 2)!;
    expect(partial.partial).toBe(true);
    expect(partial.units).toBe(17);
    expect(partial.points[2].units).toBeNull();
  });
  it("zeichnet tatsächliche Verkäufe auf und beendet das Verkaufsfenster", () => {
    const state = released();
    const game = state.games[0];
    state.day = 1;
    const revenue = sales(state);
    expect(game.units).toBeGreaterThan(0);
    expect(game.salesHistory).toEqual([{ day: 1, units: game.units, revenue }]);
    expect(salesMonth(game, 1).units).toBe(game.units);
    expect(salesMonth(game, 1).points[2].units).toBeNull();
    const total = game.units;
    state.day = salesLifetime(game);
    expect(sales(state)).toBe(0);
    expect(game.units).toBe(total);
    expect(game.salesHistory!.at(-1)!.units).toBe(0);
    expect(salesPhase(game, state.day).active).toBe(false);
    const history = structuredClone(game.salesHistory);
    state.day += 1000;
    expect(sales(state)).toBe(0);
    expect(game.salesHistory).toEqual(history);
    expect(salesMonth(game, state.day).partial).toBe(false);
  });
  it("blendet Verkäufe über 60 Tage sanft aus und gibt Hits mehr Zeit", () => {
    const game = released().games[0];
    expect(salesLifetime(game)).toBe(540);
    expect(salesFade(game, 480)).toBe(1);
    expect(salesFade(game, 510)).toBe(0.5);
    expect(salesFade(game, 540)).toBe(0);
    game.score = 7;
    expect(salesLifetime(game)).toBe(360);
    expect(salesPhase(game, 31).label).toBe("Wachstumsphase");
    expect(salesPhase(game, 91).label).toBe("Katalogverkäufe");
  });
  it("erfindet bei alten Spielständen keine historischen Tageszahlen", () => {
    const game = released().games[0];
    delete game.salesHistory;
    delete game.salesHistoryStartDay;
    game.units = 800;
    game.revenue = 15000;
    expect(salesMonth(game, 15).partial).toBe(true);
    expect(salesMonth(game, 15).points[5].units).toBeNull();
    recordSales(game, 16, 4, 67.2);
    expect(salesMonth(game, 16).units).toBe(4);
    expect(game.salesHistoryStartDay).toBe(16);
    expect(game.units).toBe(800);
  });
  it("berücksichtigt Schaltjahre und den Monatswechsel des Spielkalenders", () => {
    const game = released().games[0];
    const day = (Date.UTC(1992, 1, 29) - Date.UTC(1990, 0, 1)) / 86400000;
    recordSales(game, day, 12, 100);
    const month = salesMonth(game, day);
    expect(month.points).toHaveLength(29);
    expect(month.points.at(-1)!.units).toBe(12);
    expect(salesMonth(game, day + 1).label).toBe("März 1992");
    expect(salesMonth(game, day + 1).points).toHaveLength(31);
  });
  it("begrenzt den Verlauf, ohne Gesamtverkäufe zu verändern", () => {
    const game = released().games[0];
    game.units = 12345;
    for (let day = 1; day <= 450; day++) recordSales(game, day, 1, 1);
    expect(game.salesHistory).toHaveLength(400);
    expect(game.salesHistory![0].day).toBe(51);
    expect(game.units).toBe(12345);
  });
  it("lädt neue und bisherige Geschwindigkeiten sicher pausiert", () => {
    for (const speed of [2, 8, 12])
      expect(validateSave({ ...released(), speed }).speed).toBe(0);
    expect(() => validateSave({ ...released(), speed: 9 })).toThrow();
  });
  it("weist beschädigte, doppelte und zukünftige Verkaufstage zurück", () => {
    const state = released();
    state.day = 1;
    sales(state);
    expect(validateSave(state).games[0].salesHistory).toHaveLength(1);
    const duplicate = structuredClone(state);
    duplicate.games[0].salesHistory!.push({
      ...duplicate.games[0].salesHistory![0],
    });
    expect(() => validateSave(duplicate)).toThrow();
    const future = structuredClone(state);
    future.games[0].salesHistory![0].day = 2;
    expect(() => validateSave(future)).toThrow();
    state.games[0].salesHistory![0].units = NaN;
    expect(() => validateSave(state)).toThrow();
  });
});
