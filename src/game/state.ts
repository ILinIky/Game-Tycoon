import type { GameState } from "./types";

/**
 * Copies the game state for the next simulation step or player action.
 *
 * Sales histories make up most of a late-game save (up to 400 entries per
 * game). They are treated as immutable – `recordSales` replaces the array
 * instead of changing it – so the copy can share them instead of cloning
 * tens of thousands of entries every day.
 */
export function cloneState(source: GameState): GameState {
  const histories = source.games.map((g) => g.salesHistory);
  const copy: GameState = structuredClone({
    ...source,
    games: source.games.map((g) => ({ ...g, salesHistory: undefined })),
  });
  copy.games.forEach((g, i) => {
    if (histories[i]) g.salesHistory = histories[i];
    else delete g.salesHistory;
  });
  return copy;
}
