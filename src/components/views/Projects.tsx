import { ArrowUpRight, FolderOpen } from "lucide-react";
import { useGame } from "../../store/gameStore";
import { Badge, Button, Card, Empty } from "../ui";
import ProductionQueuePanel from "../ProductionQueuePanel";
import { ProjectCard } from "../ProjectCard";
export default function ProjectsView({
  newProject,
}: {
  newProject: () => void;
}) {
  const store = useGame();
  const s = store.game;
  return (
    <div className="stack">
      <ProductionQueuePanel newProject={newProject} />
      {s.projects.length ? (
        s.projects.map((p) => (
          <Card key={p.id}>
            <ProjectCard project={p} />
            {p.production && (
              <div className="production-project-note">
                <Badge>
                  {p.production.autoRelease
                    ? "Automatischer Release"
                    : "Release per Hand"}
                </Badge>
                <span>Vorlage: {p.production.presetName}</span>
              </div>
            )}
            <div className="points-grid">
              {Object.entries(p.points).map(([key, value]) => (
                <div key={key}>
                  <small>
                    {
                      (
                        {
                          design: "Design",
                          technology: "Technik",
                          art: "Grafik",
                          content: "Inhalt",
                          audio: "Audio",
                          polish: "Feinschliff",
                        } as Record<string, string>
                      )[key]
                    }
                  </small>
                  <strong>{Math.round(value)}</strong>
                </div>
              ))}
            </div>
          </Card>
        ))
      ) : !s.productionQueue?.length ? (
        <Card>
          <Empty
            icon={<FolderOpen size={30} />}
            title="Die nächste Geschichte wartet."
          >
            Starte ein Projekt und verwandle deine Idee in ein Spiel.
          </Empty>
          <div className="center-action">
            <Button onClick={newProject}>
              Erstes Spiel entwickeln
              <ArrowUpRight size={16} />
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
