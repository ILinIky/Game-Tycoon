import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GraduationCap, X } from "lucide-react";
import { useGame } from "../../store/gameStore";
import type { GameState } from "../../game/types";

interface Step {
  title: string;
  text: string;
  done: (s: GameState) => boolean;
}

/** Five steps from the first idea to a running studio. */
export const TUTORIAL: Step[] = [
  {
    title: "Dein erstes Spiel",
    text: "Klicke unten auf „Neues Spiel“ (Taste N), wähle Titel, Genre und Thema und starte die Entwicklung.",
    done: (s) => s.projects.length > 0 || s.games.length > 0,
  },
  {
    title: "Die Zeit läuft",
    text: "Starte die Spielzeit oben in der Mitte mit 1× oder schneller. Die Leertaste pausiert jederzeit.",
    done: (s) => s.speed > 0 || s.games.length > 0,
  },
  {
    title: "Veröffentlichen",
    text: "Ist dein Spiel fertig, erscheint es links in der Produktionsliste. Klicke es an und veröffentliche es.",
    done: (s) => s.games.length > 0,
  },
  {
    title: "Ein Team aufbauen",
    text: "Öffne Team und schalte eine Anzeige – oder nutze „Sofort finden“ für sofortige Kandidaten.",
    done: (s) =>
      s.employees.length > 1 || !!s.recruitment || s.candidates.length > 0,
  },
  {
    title: "Forschung starten",
    text: "Unter Forschung schaltest du Technologien frei, die deine Spiele besser machen. Starte die erste.",
    done: (s) => s.research.length > 0 || s.technologies.length > 0,
  },
];

export default function TutorialCard({ animated }: { animated: boolean }) {
  const { game: s, advanceTutorial } = useGame();
  const step = s.tutorial;
  const current = step === null || step === undefined ? null : TUTORIAL[step];
  const complete = !!current && current.done(s);
  useEffect(() => {
    if (step === null || step === undefined) return;
    if (step >= TUTORIAL.length) return;
    if (complete) advanceTutorial(step + 1);
  }, [complete, step, advanceTutorial]);
  if (step === null || step === undefined || !s.company.founded) return null;
  const finished = step >= TUTORIAL.length;
  return (
    <AnimatePresence>
      <motion.aside
        key={step}
        className="tutorial-card"
        aria-live="polite"
        initial={animated ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: animated ? 0.25 : 0 }}
      >
        <span className="tutorial-icon">
          <GraduationCap size={18} />
        </span>
        <div>
          <span className="tutorial-step">
            {finished
              ? "TUTORIAL ABGESCHLOSSEN"
              : `SCHRITT ${step + 1} VON ${TUTORIAL.length}`}
          </span>
          <strong>{finished ? "Dein Studio läuft!" : current!.title}</strong>
          <p>
            {finished
              ? "Alles Weitere entdeckst du selbst: Marketing, Engines, Börse und die eigene Konsole warten."
              : current!.text}
          </p>
          <div className="tutorial-dots" aria-hidden>
            {TUTORIAL.map((_, i) => (
              <i
                key={i}
                className={i < step ? "done" : i === step ? "current" : ""}
              />
            ))}
          </div>
        </div>
        <button
          className="tutorial-close"
          aria-label={finished ? "Tutorial schließen" : "Tutorial überspringen"}
          title={finished ? "Schließen" : "Überspringen"}
          onClick={() => advanceTutorial(null)}
        >
          <X size={14} />
        </button>
      </motion.aside>
    </AnimatePresence>
  );
}
