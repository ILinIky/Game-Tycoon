import type {
  GameState,
  Genre,
  ProductionQueueEntry,
  ProjectInput,
} from "../types";
import { BALANCE, GENRES, PLATFORMS, SIZES, THEMES } from "../config/balance";
import { isAssigned } from "../employees/assignment";
import { isAvailable } from "../market/platforms";
import { resolvePublisher } from "../contracts/contracts";
import { sequelPlan } from "./franchise";
import { createProject, projectCost, release } from "./projects";
import { uid } from "../utils";
import { notify } from "../events/events";

export const MAX_PRODUCTION_QUEUE = 50;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const ids = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= 100 &&
  v.every((id) => typeof id === "string" && !!id.trim()) &&
  new Set(v).size === v.length;

/** Validate snapshots on enqueue and on save import, without requiring resources to be free. */
export function validQueuedInput(v: unknown): v is ProjectInput {
  if (!object(v)) return false;
  const size = Object.keys(SIZES).includes(String(v.size))
    ? SIZES[v.size as keyof typeof SIZES]
    : null;
  if (
    !size ||
    typeof v.name !== "string" ||
    !v.name.trim() ||
    v.name.length > 48 ||
    !GENRES.includes(v.genre as Genre) ||
    !THEMES.includes(v.theme as string) ||
    !["Everyone", "Teen", "Mature"].includes(v.audience as string) ||
    typeof v.engine !== "string" ||
    !v.engine.trim() ||
    !ids(v.team) ||
    v.team.length < size.team ||
    !ids(v.platforms) ||
    !v.platforms.every((id) => PLATFORMS.some((p) => p.id === id)) ||
    (v.designFocus !== undefined &&
      !["systems", "technology", "atmosphere"].includes(
        v.designFocus as string,
      )) ||
    (v.ambition !== undefined &&
      !["focused", "balanced", "experimental"].includes(
        v.ambition as string,
      )) ||
    (v.sequelOf !== undefined && typeof v.sequelOf !== "string")
  )
    return false;
  if (v.publisher !== undefined) {
    const p = v.publisher;
    if (
      !object(p) ||
      typeof p.name !== "string" ||
      ![p.advance, p.share, p.hype].every(
        (n) => typeof n === "number" && Number.isFinite(n),
      ) ||
      (p.advance as number) < 0 ||
      (p.share as number) < 0 ||
      (p.share as number) > 1
    )
      return false;
  }
  return true;
}

export function enqueueFromPreset(
  s: GameState,
  presetId: string,
  titles: string[],
  genre: Genre,
  autoRelease: boolean,
) {
  const preset = s.productionPresets?.find((p) => p.id === presetId);
  if (!preset) throw new Error("Wähle eine gespeicherte Produktionsvorlage.");
  const names = titles.map((title) => title.trim()).filter(Boolean);
  if (!names.length) throw new Error("Trage mindestens einen Spieletitel ein.");
  if ((s.productionQueue?.length ?? 0) + names.length > MAX_PRODUCTION_QUEUE)
    throw new Error(
      `In der Warteschlange ist Platz für ${MAX_PRODUCTION_QUEUE} Spiele.`,
    );
  const inputs = names.map((name) => ({
    ...structuredClone(preset.settings),
    name,
    genre,
  }));
  if (
    typeof autoRelease !== "boolean" ||
    inputs.some((input) => !validQueuedInput(input))
  )
    throw new Error(
      "Prüfe Titel (max. 48 Zeichen), Genre und die Einstellungen der Vorlage.",
    );
  if (
    !s.engines.some((engine) => engine.id === preset.settings.engine) ||
    preset.settings.team.some((id) => !s.employees.some((e) => e.id === id))
  )
    throw new Error(
      "Die Vorlage enthält eine fehlende Engine oder fehlende Teammitglieder. Speichere sie neu.",
    );
  const queue = (s.productionQueue ??= []);
  for (const input of inputs)
    queue.push({
      id: uid(s, "queued"),
      presetId,
      presetName: preset.name,
      queuedDay: s.day,
      autoRelease,
      input,
    });
  notify(
    s,
    "Dein Produktionsplan wächst",
    `${names.length === 1 ? names[0] : `${names.length} Spiele`} eingeplant · ${preset.name}. Das Budget wird erst beim Start bezahlt.`,
    "info",
  );
}

export type ProductionQueueStatus = {
  kind: "ready" | "waiting" | "blocked" | "paused";
  label: string;
  detail: string;
  cost: number;
};
export function productionQueueStatus(
  s: GameState,
  entry: ProductionQueueEntry,
): ProductionQueueStatus {
  const input = entry.input;
  const cost = validQueuedInput(input) ? projectCost(s, input) : 0;
  const status = (
    kind: ProductionQueueStatus["kind"],
    label: string,
    detail = label,
  ) => ({ kind, label, detail, cost });
  if (s.productionQueuePaused)
    return status(
      "paused",
      "Pausiert",
      "Laufende Entwicklung geht weiter; Auto-Release und Nachrücken sind pausiert.",
    );
  if (!s.company.founded || s.company.bankrupt)
    return status("blocked", "Studio nicht verfügbar");
  if (!validQueuedInput(input))
    return status(
      "blocked",
      "Plan prüfen",
      "Die gespeicherten Produktionseinstellungen sind ungültig.",
    );
  if (input.team.some((id) => !s.employees.some((e) => e.id === id)))
    return status(
      "blocked",
      "Team fehlt",
      "Ein geplantes Teammitglied ist nicht mehr im Studio. Plane das Spiel mit einer aktualisierten Vorlage neu ein.",
    );
  if (!s.engines.some((engine) => engine.id === input.engine))
    return status("blocked", "Engine fehlt");
  if (!input.platforms.every((id) => isAvailable(s, id)))
    return status(
      "blocked",
      "Plattform nicht verfügbar",
      "Eine geplante Plattform ist noch nicht erschienen oder wurde eingestellt.",
    );
  if (input.sequelOf) {
    const sequel = sequelPlan(s, input.sequelOf);
    if (!sequel?.eligible || sequel.base.genre !== input.genre)
      return status(
        "blocked",
        "Fortsetzung prüfen",
        "Das Original muss mindestens 6,0 erreichen und zum gewählten Genre passen.",
      );
  }
  try {
    resolvePublisher(s, input, cost);
  } catch (error) {
    return status(
      "blocked",
      "Publisher nicht verfügbar",
      error instanceof Error ? error.message : "Prüfe den Publisher.",
    );
  }
  const index = (s.productionQueue ?? []).findIndex(
    (job) => job.id === entry.id,
  );
  const earlier = (s.productionQueue ?? [])
    .slice(0, Math.max(0, index))
    .find((job) => job.input.team.some((id) => input.team.includes(id)));
  if (earlier)
    return status(
      "waiting",
      "In Reihenfolge",
      `Nach „${earlier.input.name}“ · gemeinsames Team.`,
    );
  if (input.team.some((id) => isAssigned(s, id))) {
    const awaitingRelease = s.projects.find(
      (p) => p.progress >= 100 && p.team.some((id) => input.team.includes(id)),
    );
    return awaitingRelease
      ? status(
          "waiting",
          "Wartet auf Release",
          `Veröffentliche „${awaitingRelease.name}“, um das Team freizugeben.`,
        )
      : status(
          "waiting",
          "Wartet auf Team",
          "Startet automatisch, sobald das gesamte gespeicherte Team frei ist.",
        );
  }
  if (s.projects.length >= BALANCE.maxProjects)
    return status(
      "waiting",
      "Wartet auf Platz",
      "Alle parallelen Produktionsplätze sind belegt.",
    );
  if (s.company.cash < cost)
    return status(
      "waiting",
      "Wartet auf Budget",
      "Das Startbudget ist noch nicht verfügbar. Die Warteschlange nimmt keinen Kredit auf.",
    );
  return status(
    "ready",
    "Bereit zum Start",
    s.speed
      ? "Startet am nächsten Spieltag."
      : "Setze die Spielzeit fort, damit die Produktion startet.",
  );
}

/** Auto-release opt-in games, then dispatch in order per team, allowing independent teams to work in parallel. */
export function processProductionQueue(s: GameState) {
  if (!s.company.founded || s.company.bankrupt || s.productionQueuePaused)
    return;
  for (const p of [...s.projects])
    if (p.production?.autoRelease && p.progress >= 100) {
      release(s, p.id);
      s.games.find((game) => game.id === p.id)!.autoReleased = true;
    }
  for (const entry of [...(s.productionQueue ?? [])]) {
    if (productionQueueStatus(s, entry).kind !== "ready") continue;
    createProject(s, structuredClone(entry.input));
    s.projects.at(-1)!.production = {
      presetName: entry.presetName,
      queuedDay: entry.queuedDay,
      autoRelease: entry.autoRelease,
    };
    s.productionQueue = s.productionQueue!.filter((job) => job.id !== entry.id);
  }
  s.finances.at(-1)!.cash = s.company.cash;
}
