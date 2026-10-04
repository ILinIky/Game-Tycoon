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
  // Open decisions stay until answered, even beyond the journal limit.
  s.events = s.events.filter((e, i) => i < 70 || e.decision);
}
