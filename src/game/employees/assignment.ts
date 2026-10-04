import type { GameState } from "../types";

/** Assigned to a game, the engine or a contract (cannot join another). */
export function isAssigned(s: GameState, id: string) {
  return (
    s.projects.some((p) => p.team.includes(id)) ||
    !!s.engineProject?.team.includes(id) ||
    !!s.contracts?.active.some((c) => c.team.includes(id))
  );
}

/** Actively working today (game in development, engine or contract). */
export function isWorking(s: GameState, id: string) {
  return (
    s.projects.some((p) => p.team.includes(id) && p.progress < 100) ||
    !!s.engineProject?.team.includes(id) ||
    !!s.contracts?.active.some((c) => c.team.includes(id))
  );
}

/** What an employee is currently doing, for status displays. */
export function assignmentLabel(s: GameState, id: string) {
  const project = s.projects.find((p) => p.team.includes(id));
  if (project) return project.progress < 100 ? `Entwickelt ${project.name}` : `${project.name} wartet auf Release`;
  if (s.engineProject?.team.includes(id)) return `Engine-Schmiede · ${s.engineProject.name}`;
  const contract = s.contracts?.active.find((c) => c.team.includes(id));
  if (contract) return `Auftrag · ${contract.client}`;
  return null;
}
