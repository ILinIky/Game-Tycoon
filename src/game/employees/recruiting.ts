import type { Employee, GameState, Recruitment } from "../types";
import { BALANCE, OFFICES } from "../config/balance";
import { clamp, random, uid } from "../utils";
import { notify } from "../events/events";
import { marketScale } from "../economy/scale";
export function recruit(
  s: GameState,
  role: Recruitment["role"],
  seniority: Recruitment["seniority"],
  budget: number,
) {
  if (s.recruitment || s.company.cash < budget || s.company.bankrupt)
    throw new Error(
      "Recruiting ist bereits aktiv oder das Budget reicht nicht.",
    );
  s.company.cash -= budget;
  s.finances.at(-1)!.expenses += budget;
  s.recruitment = {
    role,
    seniority,
    budget,
    remaining: BALANCE.recruitmentDays,
  };
}
export function candidates(s: GameState) {
  const job = s.recruitment;
  if (!job) return;
  const names = [
    "Mika Weber",
    "Jules Hartmann",
    "Robin Nguyen",
    "Samira Beck",
    "Noah Winter",
    "Leonie Park",
    "Emil Santos",
    "Toni Fischer",
  ];
  s.candidates = Array.from({ length: 3 }, (_, i) => {
    const base = job.seniority === "Senior" ? 58 : 32;
    const boost = job.budget / (160 * marketScale(s));
    const skills = {
      programming: base + random(s) * 20,
      design: base + random(s) * 20,
      art: base + random(s) * 20,
      audio: base + random(s) * 20,
      writing: base + random(s) * 20,
      marketing: base + random(s) * 20,
      management: base + random(s) * 20,
      research: base + random(s) * 20,
    };
    const key =
      job.role === "Programmierung" || job.role === "QA"
        ? "programming"
        : job.role === "Game Design"
          ? "design"
          : job.role === "Art"
            ? "art"
            : "audio";
    skills[key] = clamp(skills[key] + boost);
    return {
      id: uid(s, "employee"),
      name: names[(Math.floor(random(s) * names.length) + i) % names.length],
      role: job.role,
      skills: Object.fromEntries(
        Object.entries(skills).map(([k, v]) => [k, Math.round(v)]),
      ) as Employee["skills"],
      salary: Math.round(
        ((job.seniority === "Senior" ? 2500 : 1250) + random(s) * 550) *
          marketScale(s),
      ),
      age: job.seniority === "Senior" ? 34 : 23,
      experience: job.seniority === "Senior" ? 8 : 1,
      motivation: 85,
      stress: 0,
      energy: 100,
      loyalty: 65,
      potential: Math.round(65 + random(s) * 30),
      trait: (
        [
          "Kreativ",
          "Perfektionist",
          "Teamplayer",
          "Schneller Lerner",
          "Bug Hunter",
        ] as const
      )[Math.floor(random(s) * 5)],
    };
  });
  s.recruitment = null;
  notify(
    s,
    "Neue Talente sind da",
    "Drei Kandidaten warten auf deine Entscheidung.",
    "success",
  );
}
export function hire(s: GameState, id: string) {
  if (s.employees.length >= OFFICES[s.company.office].capacity)
    throw new Error("Dein Büro ist voll. Erweitere zuerst dein Studio.");
  const e = s.candidates.find((e) => e.id === id);
  if (!e) throw new Error("Dieser Kandidat ist nicht mehr verfügbar.");
  s.employees.push(e);
  s.candidates = s.candidates.filter((e) => e.id !== id);
  notify(
    s,
    `Willkommen, ${e.name}`,
    `${e.role} · ${e.salary} € monatlich`,
    "success",
  );
}
