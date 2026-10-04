import { isAvailable } from "../market/platforms";
import type { GameState, ProductionPreset, ProjectInput } from "../types";
import { uid } from "../utils";
import { isAssigned } from "../engines/engines";

export function saveProductionPreset(
  state: GameState,
  name: string,
  input: ProjectInput,
) {
  const title = name.trim().slice(0, 28);
  if (!title) throw new Error("Gib deiner Vorlage einen Namen.");
  const { name: _name, genre: _genre, ...settings } = input;
  const presets = (state.productionPresets ??= []);
  const existing = presets.find(
    (preset) =>
      preset.name.toLocaleLowerCase("de") === title.toLocaleLowerCase("de"),
  );
  if (existing) {
    existing.name = title;
    existing.settings = structuredClone(settings);
  } else {
    if (presets.length >= 8)
      throw new Error(
        "Du kannst acht Vorlagen speichern. Entferne eine oder überschreibe sie mit demselben Namen.",
      );
    presets.push({
      id: uid(state, "preset"),
      name: title,
      settings: structuredClone(settings),
    });
  }
}
export function applyProductionPreset(
  state: GameState,
  preset: ProductionPreset,
  current: ProjectInput,
) {
  const free = state.employees.filter(
    (employee) => !isAssigned(state, employee.id),
  );
  const team = preset.settings.team.filter((id) =>
    free.some((employee) => employee.id === id),
  );
  const platforms = preset.settings.platforms.filter((id) =>
    isAvailable(state, id),
  );
  const engineExists = state.engines.some(
    (engine) => engine.id === preset.settings.engine,
  );
  const issues: string[] = [];
  if (team.length !== preset.settings.team.length)
    issues.push(
      "Gespeicherte Teammitglieder sind belegt oder nicht mehr im Studio. Passe dein Team an.",
    );
  if (platforms.length !== preset.settings.platforms.length)
    issues.push("Eine gespeicherte Plattform ist noch nicht verfügbar.");
  if (!engineExists)
    issues.push(
      "Die gespeicherte Engine fehlt. Die Basis-Engine wurde eingesetzt.",
    );
  return {
    input: {
      ...current,
      ...structuredClone(preset.settings),
      name: current.name,
      genre: current.genre,
      team,
      platforms,
      engine: engineExists ? preset.settings.engine : state.engines[0].id,
    },
    issues,
  };
}
