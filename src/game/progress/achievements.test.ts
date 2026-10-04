import { describe, expect, it } from "vitest";
import { initialState } from "../initial";
import { ACHIEVEMENTS, checkAchievements } from "./achievements";

describe("Erfolge", () => {
  it("haben eindeutige Ids", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(
      ACHIEVEMENTS.length,
    );
  });
  it("schalten Meilensteine einmalig frei", () => {
    const s = initialState();
    s.company.founded = true;
    expect(checkAchievements(s)).toEqual([]);
    s.company.cash = 2_000_000;
    s.company.office = 3;
    const fresh = checkAchievements(s);
    expect(fresh).toContain("million");
    expect(fresh).toContain("campus");
    expect(s.events[0].title).toMatch(/Erfolg freigeschaltet/);
    expect(checkAchievements(s)).toEqual([]);
  });
});
