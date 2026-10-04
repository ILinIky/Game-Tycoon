import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Gamepad2,
  ListOrdered,
  Pause,
  Play,
  Repeat2,
  Rocket,
  Trash2,
} from "lucide-react";
import { useGame } from "../../store/gameStore";
import { productionQueueStatus } from "../../game/projects/queue";
import { useStudioMotion } from "./GameMotion";

export default function ProductionDock({
  selected,
  onSelect,
  onOpen,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  onOpen: () => void;
}) {
  const { game: s, pauseQueue, removeQueued } = useGame();
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const animated = useStudioMotion();
  const queue = s.productionQueue ?? [];
  const hasAutomation =
    queue.length > 0 || s.projects.some((p) => p.production?.autoRelease);
  if (!s.projects.length && !queue.length) return null;
  const first = queue[0];
  const firstStatus = first && productionQueueStatus(s, first);
  return (
    <aside className="production-dock" aria-label="Studioproduktion">
      <div className="production-dock-heading">
        <span>
          <Gamepad2 size={12} /> PRODUKTION
        </span>
        <small>
          {s.projects.length} aktiv · {queue.length} geplant
        </small>
        {hasAutomation && (
          <button
            aria-label={
              s.productionQueuePaused
                ? "Warteschlange fortsetzen"
                : "Warteschlange pausieren"
            }
            title={
              s.productionQueuePaused
                ? "Auto-Release und Autostart fortsetzen"
                : "Auto-Release und Autostart pausieren"
            }
            aria-pressed={!!s.productionQueuePaused}
            onClick={() => pauseQueue(!s.productionQueuePaused)}
            disabled={s.company.bankrupt}
          >
            {s.productionQueuePaused ? <Play size={12} /> : <Pause size={12} />}
          </button>
        )}
      </div>
      {!!s.projects.length && (
        <div
          className="production-active-list"
          aria-label="Laufende Spieleentwicklung"
        >
          <AnimatePresence initial={false}>
            {s.projects.map((p) => (
              <motion.button
                key={p.id}
                layout={animated ? "position" : false}
                initial={animated ? { opacity: 0, x: -12 } : false}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: animated ? 0.18 : 0 }}
                className={`project-tab ${selected === p.id ? "selected" : ""} ${p.progress >= 100 ? "ready" : ""}`}
                title={p.name}
                onClick={() => onSelect(p.id)}
              >
                <span className="project-tab-icon">
                  {p.progress >= 100 ? (
                    <Rocket size={17} />
                  ) : (
                    <Gamepad2 size={17} />
                  )}
                </span>
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {p.production?.autoRelease && <Repeat2 size={10} />}
                    {p.progress >= 100
                      ? p.production?.autoRelease
                        ? s.productionQueuePaused
                          ? "Auto-Release pausiert"
                          : "Auto-Release"
                        : "Bereit für deinen Release"
                      : p.phase}
                  </small>
                  <i>
                    <b style={{ width: `${p.progress}%` }} />
                  </i>
                </span>
                <em>{Math.floor(p.progress)}%</em>
              </motion.button>
            ))}
          </AnimatePresence>
          {s.projects.length > 1 && (
            <button className="production-mobile-more" onClick={onOpen}>
              +{s.projects.length - 1} weitere Entwicklung ansehen
            </button>
          )}
        </div>
      )}
      {first && (
        <section
          className={`production-queue-preview ${s.productionQueuePaused ? "is-paused" : ""}`}
          aria-label="Produktionswarteschlange"
        >
          <button
            className="production-queue-toggle"
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded(!expanded)}
          >
            <ListOrdered size={14} />
            <span>Warteschlange</span>
            <b>{queue.length}</b>
            <ChevronDown size={13} className={expanded ? "turned" : ""} />
          </button>
          <AnimatePresence initial={false}>
            {expanded ? (
              <motion.div
                key="list"
                id={id}
                className="production-queue-expanded"
                initial={animated ? { height: 0, opacity: 0 } : false}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: animated ? 0.2 : 0 }}
              >
                <ol>
                  {queue.map((entry, index) => {
                    const status = productionQueueStatus(s, entry);
                    return (
                      <li key={entry.id}>
                        <span className="production-order">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <button
                          onClick={onOpen}
                          title={`${entry.input.name} · ${entry.presetName} · ${status.detail}`}
                        >
                          <strong>{entry.input.name}</strong>
                          <small className={`queue-state ${status.kind}`}>
                            {status.label}
                          </small>
                        </button>
                        <button
                          className="production-remove"
                          onClick={() => removeQueued(entry.id)}
                          aria-label={`${entry.input.name} aus Warteschlange entfernen`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </li>
                    );
                  })}
                </ol>
                <button className="production-manage" onClick={onOpen}>
                  Reihenfolge & Details verwalten
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="preview"
                className="production-next"
                onClick={onOpen}
                initial={false}
                animate={{ opacity: 1 }}
                title={firstStatus.detail}
              >
                <span>
                  NÄCHSTES SPIEL
                  {queue.length > 1 && <b>+{queue.length - 1} weitere</b>}
                </span>
                <strong>{first.input.name}</strong>
                <small className={`queue-state ${firstStatus.kind}`}>
                  {firstStatus.label} · {first.presetName}
                </small>
              </motion.button>
            )}
          </AnimatePresence>
        </section>
      )}
    </aside>
  );
}
