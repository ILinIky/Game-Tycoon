import { useEffect, useState } from "react";
import { useGame } from "../store/gameStore";
import { BALANCE } from "../game/config/balance";
import { loadSlot, saveSlot } from "../game/persistence/saves";

export function useGameSession(blocked: boolean) {
  const { game, hydrated, hydrate, advance } = useGame();
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    void loadSlot("autosave")
      .then((result) => {
        if (active) hydrate(result?.state);
      })
      .catch(() => {
        if (active) {
          hydrate();
          setSaveError(
            "Autosave konnte nicht geladen werden. Öffne einen anderen Spielstand im Spielmenü.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [hydrate]);
  useEffect(() => {
    if (
      !hydrated ||
      !game.company.founded ||
      !game.speed ||
      game.company.bankrupt ||
      blocked
    )
      return;
    const timer = window.setInterval(
      advance,
      BALANCE.dayMilliseconds / game.speed,
    );
    return () => clearInterval(timer);
  }, [
    hydrated,
    game.company.founded,
    game.company.bankrupt,
    game.speed,
    blocked,
    advance,
  ]);
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      void saveSlot("autosave", game)
        .then(() => setSaved(true))
        .catch(() => {
          setSaved(false);
          setSaveError(
            "Speicherung fehlgeschlagen. Exportiere deinen Spielstand im Spielmenü.",
          );
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [game, hydrated]);
  // At 8x/12x the daily tick is faster than the debounce. Keep autosaving
  // periodically as well, so uninterrupted fast-forward still reaches disk.
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setInterval(() => {
      void saveSlot("autosave", useGame.getState().game)
        .then(() => setSaved(true))
        .catch(() => {
          setSaved(false);
          setSaveError(
            "Speicherung fehlgeschlagen. Exportiere deinen Spielstand im Spielmenü.",
          );
        });
    }, 5000);
    return () => clearInterval(timer);
  }, [hydrated]);
  return { saved, saveError, clearSaveError: () => setSaveError("") };
}
