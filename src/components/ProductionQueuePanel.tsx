import {
  ArrowDown,
  ArrowUp,
  ListPlus,
  ListOrdered,
  Pause,
  Play,
  Repeat2,
  Trash2,
} from "lucide-react";
import { useGame } from "../store/gameStore";
import {
  MAX_PRODUCTION_QUEUE,
  productionQueueStatus,
} from "../game/projects/queue";
import { money } from "../game/utils";
import { sizeLabel } from "../game/config/balance";
import { MARKETING_PLANS } from "../game/marketing/campaigns";
import { Button, Card } from "./ui";

export default function ProductionQueuePanel({
  newProject,
}: {
  newProject: () => void;
}) {
  const { game: s, pauseQueue, moveQueued, removeQueued } = useGame();
  const queue = s.productionQueue ?? [];
  if (!queue.length && !s.projects.some((p) => p.production?.autoRelease))
    return null;
  return (
    <Card className="production-planner">
      <div className="production-planner-heading">
        <div>
          <span className="eyebrow">
            <ListOrdered size={13} /> DEIN PRODUKTIONSPLAN
          </span>
          <h2>{queue.length} Spiele in der Warteschlange</h2>
          <p>
            Gleiches Team, klare Reihenfolge. Freie andere Teams können parallel
            starten.
          </p>
        </div>
        <div className="button-row">
          <Button
            secondary
            onClick={() => pauseQueue(!s.productionQueuePaused)}
          >
            {s.productionQueuePaused ? <Play size={14} /> : <Pause size={14} />}
            {s.productionQueuePaused ? "Fortsetzen" : "Pausieren"}
          </Button>
          <Button onClick={newProject}>
            <ListPlus size={14} /> Spiele einplanen
          </Button>
        </div>
      </div>
      <p className="production-planner-note">
        {s.productionQueuePaused
          ? "Warteschlange pausiert: Laufende Entwicklungen gehen weiter. Automatische Releases und neue Starts warten auf dein Fortsetzen."
          : "Das Budget wird erst beim Start bezahlt und neu berechnet. Vorlagenänderungen ändern bereits eingeplante Spiele nicht. Automatische Releases unterbrechen die Spielzeit nicht."}
      </p>
      {!!queue.length && (
        <ol
          className="production-planner-list"
          aria-label="Geplante Spiele in Produktionsreihenfolge"
        >
          {queue.map((entry, index) => {
            const status = productionQueueStatus(s, entry);
            return (
              <li key={entry.id}>
                <span className="production-order">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="production-job-name">
                  <strong>{entry.input.name}</strong>
                  <small>
                    {entry.presetName} · {entry.input.genre} ·{" "}
                    {sizeLabel(entry.input.size)}
                  </small>
                  <span>
                    <Repeat2 size={11} />{" "}
                    {entry.autoRelease
                      ? "Automatischer Release"
                      : "Release per Hand"}
                    {entry.input.marketing &&
                      entry.input.marketing !== "none" &&
                      ` · ${MARKETING_PLANS[entry.input.marketing].label}`}
                  </span>
                </div>
                <div className="production-job-status">
                  <strong className={`queue-state ${status.kind}`}>
                    {status.label}
                  </strong>
                  <small>{status.detail}</small>
                </div>
                <div className="production-job-budget">
                  <strong>{money(status.cost)}</strong>
                  <small>Startbudget</small>
                </div>
                <div className="production-job-actions">
                  <button
                    disabled={index === 0}
                    aria-label={`${entry.input.name} nach vorne verschieben`}
                    onClick={() => moveQueued(entry.id, -1)}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    disabled={index === queue.length - 1}
                    aria-label={`${entry.input.name} nach hinten verschieben`}
                    onClick={() => moveQueued(entry.id, 1)}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    aria-label={`${entry.input.name} aus Warteschlange entfernen`}
                    onClick={() => removeQueued(entry.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {!queue.length && (
        <p className="production-planner-note">
          Alle eingeplanten Spiele sind bereits in Entwicklung.
        </p>
      )}
      <div className="production-planner-capacity">
        {queue.length}/{MAX_PRODUCTION_QUEUE} Plätze belegt · Planung kostet
        kein Kapital
      </div>
    </Card>
  );
}
