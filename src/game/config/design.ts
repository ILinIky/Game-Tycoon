import type { GameProject } from "../types";

export const DESIGN_FOCUS = {
  systems: {
    name: "Spielsysteme",
    description:
      "Tiefe Mechaniken und gute Geschichten. Design und Writing zählen stärker.",
    weights: {
      design: 0.45,
      programming: 0.25,
      art: 0.1,
      audio: 0.05,
      writing: 0.15,
    },
  },
  technology: {
    name: "Technik",
    description:
      "Präzise Steuerung und starke Technik. Programmierung zählt stärker.",
    weights: {
      design: 0.2,
      programming: 0.5,
      art: 0.15,
      audio: 0.05,
      writing: 0.1,
    },
  },
  atmosphere: {
    name: "Atmosphäre",
    description:
      "Eine Welt, die im Kopf bleibt. Grafik, Audio und Writing zählen stärker.",
    weights: {
      design: 0.15,
      programming: 0.15,
      art: 0.35,
      audio: 0.2,
      writing: 0.15,
    },
  },
} as const;
export const DEFAULT_WEIGHTS = {
  design: 0.3,
  programming: 0.3,
  art: 0.2,
  audio: 0.1,
  writing: 0.1,
};
export const AMBITIONS = {
  focused: {
    name: "Kleine, klare Idee",
    description:
      "15 % weniger Budget und Arbeitszeit, weniger Bugs. Etwas weniger kreative Tiefe.",
    cost: 0.85,
    days: 0.85,
    bugs: 0.7,
  },
  balanced: {
    name: "Ausgewogen",
    description:
      "Ein durchdachter Umfang. Reguläres Budget, Tempo und Entwicklungsrisiko.",
    cost: 1,
    days: 1,
    bugs: 1,
  },
  experimental: {
    name: "Mutiges Experiment",
    description:
      "25 % mehr Budget, 20 % mehr Zeit und mehr Bugs. Erfahrene Teams können glänzen.",
    cost: 1.25,
    days: 1.2,
    bugs: 1.6,
  },
} as const;
export const ambitionFor = (project: Pick<GameProject, "ambition">) =>
  AMBITIONS[project.ambition ?? "balanced"];
