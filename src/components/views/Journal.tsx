import { useGame } from "../../store/gameStore";
import { dateLabel } from "../../game/utils";
import { Badge, Button, Card, PanelTitle } from "../ui";
export default function JournalView() {
  const store = useGame();
  const s = store.game;
  return (
    <Card className="journal-page">
      <PanelTitle
        title="Ereignisse & Entscheidungen"
        action="Als gelesen markieren"
        onAction={store.readEvents}
      />
      {s.events.map((e) => (
        <div className="event-entry" key={e.id}>
          <span className={`journal-dot ${e.kind}`} />
          <div>
            <h3>
              {e.title}
              {!e.read && <Badge>Neu</Badge>}
            </h3>
            <p>{e.body}</p>
            {e.decision && (
              <div className="button-row">
                <Button onClick={() => store.decision(e.id, true)}>
                  {e.decision === "poach"
                    ? "Gegenangebot machen"
                    : e.decision === "takeover"
                      ? "Übernahme abwehren"
                      : e.decision === "salary"
                        ? "Gehalt erhöhen"
                        : "Gehälter erhöhen"}
                </Button>
                <Button secondary onClick={() => store.decision(e.id, false)}>
                  {e.decision === "poach"
                    ? "Ziehen lassen"
                    : e.decision === "takeover"
                      ? "Gewähren lassen"
                      : "Ablehnen"}
                </Button>
              </div>
            )}
          </div>
          <small>{dateLabel(e.day)}</small>
        </div>
      ))}
    </Card>
  );
}
