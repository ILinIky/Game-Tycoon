import { campaignCost } from "../../game/economy/scale";
import { trainingCost } from "../../game/office/office";
import {
  X,
  Coffee,
  Lightbulb,
  Code2,
  Palette,
  Music2,
  Bug,
  Rocket,
  Megaphone,
  ChevronRight,
} from "lucide-react";
import { useGame } from "../../store/gameStore";
import { money } from "../../game/utils";
import { Button, Progress } from "../ui";
import GameArtwork from "./GameArtwork";
import { DESIGN_FOCUS, AMBITIONS } from "../../game/config/design";
import { motion } from "framer-motion";

export default function Inspector({
  employeeId,
  projectId,
  onClose,
  onMenu,
  animated,
}: {
  employeeId: string | null;
  projectId: string | null;
  onClose: () => void;
  onMenu: (page: string) => void;
  animated: boolean;
}) {
  const store = useGame();
  const s = store.game;
  const employee = s.employees.find((e) => e.id === employeeId);
  const project = s.projects.find((p) => p.id === projectId);
  if (!employee && !project) return null;
  const assignment =
    employee && s.projects.find((p) => p.team.includes(employee.id));
  const engineWork = !!(
    employee && s.engineProject?.team.includes(employee.id)
  );
  const contract =
    employee && s.contracts.active.find((c) => c.team.includes(employee.id));
  return (
    <motion.aside
      initial={animated ? { opacity: 0, x: 45, scale: 0.97 } : false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 30, scale: 0.97 }}
      transition={
        animated
          ? { type: "spring", stiffness: 300, damping: 28 }
          : { duration: 0 }
      }
      className={`world-inspector ${project ? "project-inspector" : ""}`}
      aria-label={employee ? "Mitarbeiterdetails" : "Projektdetails"}
    >
      <div className="inspector-heading">
        <span>{employee ? "TEAMMITGLIED" : "IN ENTWICKLUNG"}</span>
        <button aria-label="Details schließen" onClick={onClose}>
          <X size={17} />
        </button>
      </div>
      {employee ? (
        <>
          <div className="employee-portrait">
            <div
              className={`pixel-portrait role-${employee.role.replace(" ", "-")}`}
            >
              <i />
              <b />
              <span />
            </div>
            <div>
              <h2>{employee.name}</h2>
              <span>{employee.role}</span>
            </div>
          </div>
          <div className="inspector-assignment">
            <span className="status-light" />
            <div>
              <strong>
                {assignment
                  ? assignment.name
                  : engineWork
                    ? s.engineProject!.name
                    : contract
                      ? contract.title
                      : "Zeit für eine neue Idee"}
              </strong>
              <small>
                {assignment
                  ? assignment.phase
                  : engineWork
                    ? "Engine-Schmiede · baut am Framework"
                    : contract
                      ? `Auftrag für ${contract.client}`
                      : "Erholt sich · verfügbar für Projekte"}
              </small>
            </div>
            <Coffee size={17} />
          </div>
          <div className="inspector-skills">
            {[
              { key: "design" as const, name: "Spieldesign", icon: Lightbulb },
              { key: "programming" as const, name: "Technik", icon: Code2 },
              { key: "art" as const, name: "Grafik", icon: Palette },
              { key: "audio" as const, name: "Audio", icon: Music2 },
            ].map(({ key, name, icon: Icon }) => (
              <div key={key}>
                <Icon size={15} />
                <span>{name}</span>
                <b>{Math.round(employee.skills[key])}</b>
                <Progress value={employee.skills[key]} />
              </div>
            ))}
          </div>
          <div className="inspector-vitals">
            {[
              { name: "Motivation", value: employee.motivation },
              { name: "Energie", value: employee.energy },
              { name: "Stress", value: employee.stress },
            ].map((v) => (
              <div key={v.name}>
                <span>
                  {v.name}
                  <b>{Math.round(v.value)}%</b>
                </span>
                <Progress value={v.value} />
              </div>
            ))}
          </div>
          <div className="trait-chip">✦ {employee.trait}</div>
          <div className="inspector-controls">
            <Button
              secondary
              detail={money(trainingCost(s))}
              disabled={
                s.company.cash < trainingCost(s) ||
                s.company.bankrupt ||
                !!(assignment && assignment.progress < 100) ||
                engineWork ||
                !!contract
              }
              onClick={() => store.train(employee.id)}
            >
              Weiterbilden
            </Button>
            <button
              className="inspector-link"
              onClick={() => onMenu("Mitarbeiter")}
            >
              Personal & Talente <ChevronRight size={15} />
            </button>
          </div>
        </>
      ) : (
        project && (
          <>
            <div
              className={`build-monitor ${animated && s.speed ? "playing" : ""}`}
            >
              <GameArtwork project={project} preview />
              <span>
                BUILD {String(Math.floor(project.progress)).padStart(3, "0")} /
                100
              </span>
            </div>
            <h2>{project.name}</h2>
            <p className="project-genre">
              {project.genre} · {project.theme}
            </p>
            {project.designFocus && (
              <p className="build-design">
                {DESIGN_FOCUS[project.designFocus].name} ·{" "}
                {AMBITIONS[project.ambition ?? "balanced"].name}
              </p>
            )}
            <div className="build-progress">
              <span>
                {project.phase}
                <b>{Math.floor(project.progress)}%</b>
              </span>
              <Progress value={project.progress} />
            </div>
            <div className="build-stats">
              <div>
                <Lightbulb size={17} />
                <strong>{Math.round(project.quality)}</strong>
                <span>Qualität</span>
              </div>
              <div>
                <Bug size={17} />
                <strong>{Math.ceil(project.bugs)}</strong>
                <span>Bugs</span>
              </div>
              <div>
                <Megaphone size={17} />
                <strong>{Math.round(project.hype)}</strong>
                <span>Hype</span>
              </div>
            </div>
            <div className="inspector-controls">
              {project.progress >= 100 ? (
                <button
                  className="game-action"
                  disabled={s.company.bankrupt}
                  onClick={() => store.release(project.id)}
                >
                  <Rocket size={17} />
                  Spiel veröffentlichen
                </button>
              ) : (
                <button
                  className="game-action secondary"
                  disabled={
                    s.company.cash < campaignCost(s) ||
                    project.hype >= 100 ||
                    s.company.bankrupt
                  }
                  onClick={() => store.campaign(project.id)}
                >
                  Magazinkampagne <span>{money(campaignCost(s))}</span>
                </button>
              )}
              <button
                className="inspector-link"
                onClick={() => onMenu("Projekte")}
              >
                Alle Entwicklungsdetails <ChevronRight size={15} />
              </button>
            </div>
          </>
        )
      )}
    </motion.aside>
  );
}
