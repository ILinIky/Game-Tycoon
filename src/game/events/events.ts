import type { GameState, GameEvent } from "../types";
import { uid } from "../utils";
export function notify(
  s: GameState,
  title: string,
  body: string,
  kind: GameEvent["kind"] = "info",
  decision?: GameEvent["decision"],
) {
  s.events.unshift({
    id: uid(s, "event"),
    day: s.day,
    title,
    body,
    kind,
    read: false,
    decision,
  });
  s.events = s.events.slice(0, 70);
}
