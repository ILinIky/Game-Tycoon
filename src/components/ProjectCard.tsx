import { ArrowUpRight } from "lucide-react";
import { useGame } from "../store/gameStore";
import { money } from "../game/utils";
import type { GameProject } from "../game/types";
import { Badge, Progress, Button } from "./ui";
import GameArtwork from "./game/GameArtwork";
export function ProjectCard({
  project: p,
  compact = false,
}: {
  project: GameProject;
  compact?: boolean;
}) {
  const { game: s, release } = useGame();
  const ready = p.progress >= 100;
  return (
    <div className={`project-card ${compact ? "compact" : ""}`}>
      <div
        className={`game-cover cover-${p.genre === "RPG" ? "violet" : p.genre === "Simulation" ? "orange" : "green"}`}
      >
        <GameArtwork project={p} />
        <small>{p.name.slice(0, 18)}</small>
      </div>
      <div className="project-info">
        <div className="project-name">
          <h3>{p.name}</h3>
          <Badge tone={ready ? "green" : "neutral"}>
            {ready ? "Release bereit" : p.phase}
          </Badge>
        </div>
        <p>
          {p.genre} <span>·</span> {p.theme} <span>·</span> {p.size}
        </p>
        <div className="project-progress">
          <Progress value={p.progress} />
          <strong>{Math.floor(p.progress)}%</strong>
        </div>
        <div className="project-meta">
          <span>
            {ready
              ? "Zeit für den großen Moment"
              : `Noch ca. ${Math.ceil(p.duration - p.elapsed)} Tage`}
          </span>
          <span>{p.team.length} im Team</span>
        </div>
        {!compact && (
          <div className="project-detail">
            <span>
              Qualität <b>{Math.round(p.quality)}/100</b>
            </span>
            <span>
              Bugs <b>{Math.ceil(p.bugs)}</b>
            </span>
            <span>
              Hype <b>{Math.round(p.hype)}</b>
            </span>
            <span>
              Budget <b>{money(p.budget)}</b>
            </span>
            <span>
              Team{" "}
              <b>
                {s.employees
                  .filter((e) => p.team.includes(e.id))
                  .map((e) => e.name.split(" ")[0])
                  .join(", ")}
              </b>
            </span>
          </div>
        )}
      </div>
      {ready && (
        <Button onClick={() => release(p.id)}>
          Veröffentlichen
          <ArrowUpRight size={16} />
        </Button>
      )}
    </div>
  );
}
