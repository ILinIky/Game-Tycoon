import { describe, expect, it } from "vitest";
import { initialState } from "../initial";
import { tick } from "../simulation/tick";
import { createProject, release } from "../projects/projects";
import {
  consoleBlocker,
  exclusiveFactor,
  ownPlatformId,
  payConsoles,
  startConsole,
} from "./consoles";
import { availablePlatforms } from "../market/platforms";
import { validQueuedInput } from "../projects/queue";
import type { ProjectInput } from "../types";

function tower() {
  const s = initialState();
  s.company.founded = true;
  s.company.office = 5;
  s.company.cash = 1e10;
  s.day = 365 * 15;
  for (let i = 1; i < 10; i++)
    s.employees.push({
      ...s.employees[0],
      id: `e${i}`,
      name: `Dev ${i}`,
      salary: 0,
      skills: {
        ...s.employees[0].skills,
        programming: 90,
        art: 80,
        design: 80,
      },
    });
  return s;
}

describe("Eigene Spielkonsole", () => {
  it("braucht Studio-Tower und Team", () => {
    const s = initialState();
    s.company.founded = true;
    expect(consoleBlocker(s, [])).toBeTruthy();
    const t = tower();
    expect(consoleBlocker(t, ["e1"])).toMatch(/mindestens/);
    expect(
      consoleBlocker(
        t,
        t.employees.slice(1).map((e) => e.id),
      ),
    ).toBeNull();
  });
  it("wird über Jahre entwickelt, erscheint als Plattform und zahlt Lizenzen", () => {
    let s = tower();
    startConsole(
      s,
      "Zero Box",
      s.employees.slice(1).map((e) => e.id),
    );
    let days = 0;
    while (s.consoleProject && days < 2000) {
      s = tick(s);
      days++;
    }
    expect(days).toBeGreaterThan(300);
    expect(s.consoles).toHaveLength(1);
    const id = ownPlatformId(s.consoles![0]);
    expect(availablePlatforms(s).some((p) => p.id === id)).toBe(true);
    const input: ProjectInput = {
      name: "Zero Quest",
      genre: "RPG",
      theme: "Fantasy",
      platforms: [id],
      audience: "Teen",
      size: "Indie",
      team: ["founder"],
      engine: "basic",
    };
    expect(validQueuedInput(input)).toBe(true);
    createProject(s, input);
    const p = s.projects[0];
    p.progress = 100;
    p.elapsed = p.duration;
    release(s, p.id);
    expect(exclusiveFactor(s.games[0])).toBeGreaterThan(1.2);
    const cash = s.company.cash;
    s.day += 30;
    expect(payConsoles(s)).toBeGreaterThan(0);
    expect(s.company.cash).toBeGreaterThan(cash);
  });
});
