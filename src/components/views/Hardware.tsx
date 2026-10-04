import { useState } from "react";
import { Check, Cpu, Gamepad2, Lock } from "lucide-react";
import { useGame } from "../../store/gameStore";
import {
  CONSOLE_MIN_TEAM,
  CONSOLE_OFFICE,
  consoleBlocker,
  consoleCost,
  consoleMonthlySales,
  consoleProgress,
  consoleSpeed,
  consoleWork,
  consolePlatform,
  EXCLUSIVE_BONUS,
  nextGeneration,
  ownConsoles,
  ownPlatformId,
} from "../../game/hardware/consoles";
import {
  platformShare,
  platformStatus,
  STATUS_LABEL,
} from "../../game/market/platforms";
import { isAssigned } from "../../game/employees/assignment";
import { OFFICES } from "../../game/config/balance";
import { date, money, number } from "../../game/utils";
import { Badge, Button, Card, Empty, PanelTitle, Progress } from "../ui";

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

export default function HardwareView() {
  const store = useGame();
  const s = store.game;
  const project = s.consoleProject;
  const generation = nextGeneration(s);
  const [name, setName] = useState(
    `Studio Zero ${generation === 1 ? "One" : generation}`,
  );
  const [team, setTeam] = useState<string[]>([]);
  const free = s.employees.filter((e) => !isAssigned(s, e.id));
  const blocker = consoleBlocker(s, team);
  const consoles = ownConsoles(s);
  if (s.company.office < CONSOLE_OFFICE && !consoles.length && !project)
    return (
      <Card>
        <Empty icon={<Lock size={28} />} title="Eigene Hardware">
          Ab dem {OFFICES[CONSOLE_OFFICE].name} entwickelt dein Studio eine
          eigene Spielkonsole. Andere Studios zahlen Lizenzgebühren, und deine
          Spiele dafür werden Exklusivtitel (+
          {Math.round(EXCLUSIVE_BONUS * 100)} % Verkäufe).
        </Empty>
      </Card>
    );
  const speed = project ? consoleSpeed(s, project.team) : 0;
  const daysLeft =
    project && speed > 0
      ? Math.ceil((project.work - project.done) / speed)
      : null;
  return (
    <div className="hardware-view">
      {project ? (
        <Card className="hardware-project">
          <PanelTitle
            title={project.name}
            eyebrow={`HARDWARE-LABOR · GENERATION ${project.generation}`}
            action="Abbrechen"
            onAction={store.cancelConsole}
          />
          <div className="hardware-progress">
            <Cpu size={34} />
            <div>
              <strong>{Math.floor(consoleProgress(s))} %</strong>
              <Progress value={consoleProgress(s)} />
              <small>
                {daysLeft === null
                  ? "Kein Team zugewiesen"
                  : `Marktstart in etwa ${Math.round(daysLeft / 30)} Monaten`}{" "}
                · {project.team.length} Entwickler · seit{" "}
                {date(project.started).getUTCFullYear()}
              </small>
            </div>
          </div>
          <div className="hardware-team">
            {s.employees
              .filter((e) => project.team.includes(e.id))
              .map((e) => (
                <span key={e.id} title={e.name}>
                  {initials(e.name)}
                </span>
              ))}
          </div>
        </Card>
      ) : (
        <Card className="hardware-new">
          <PanelTitle
            title={
              generation === 1
                ? "Deine erste Konsole"
                : `Generation ${generation}`
            }
            eyebrow="NEUE HARDWARE ENTWICKELN"
          />
          <p className="hint">
            Die Entwicklung dauert mehrere Jahre. Programmierung zählt am
            meisten, Grafik und Design helfen. Mindestens {CONSOLE_MIN_TEAM}{" "}
            Teammitglieder, die während der Entwicklung keine Spiele machen.
          </p>
          <label className="hardware-name">
            Name der Konsole
            <input
              maxLength={32}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="hardware-candidates">
            {free.map((e) => {
              const on = team.includes(e.id);
              return (
                <button
                  key={e.id}
                  className={`choice team-choice ${on ? "selected" : ""}`}
                  aria-pressed={on}
                  onClick={() =>
                    setTeam(
                      on ? team.filter((id) => id !== e.id) : [...team, e.id],
                    )
                  }
                >
                  <span className="avatar">{initials(e.name)}</span>
                  <div>
                    <strong>{e.name}</strong>
                    <small>
                      Technik {Math.round(e.skills.programming)} · Grafik{" "}
                      {Math.round(e.skills.art)} · Design{" "}
                      {Math.round(e.skills.design)}
                    </small>
                  </div>
                  {on && <Check size={16} />}
                </button>
              );
            })}
            {!free.length && (
              <p className="hint">Alle Teammitglieder sind verplant.</p>
            )}
          </div>
          <div className="hardware-start">
            <span>
              {team.length} / {CONSOLE_MIN_TEAM} Entwickler · etwa{" "}
              {team.length
                ? Math.round(
                    consoleWork(generation) /
                      Math.max(0.1, consoleSpeed(s, team)) /
                      30,
                  )
                : "–"}{" "}
              Monate
            </span>
            <Button
              disabled={!!blocker}
              detail={money(consoleCost(s, generation))}
              onClick={() => {
                store.startConsole(name, team);
                setTeam([]);
              }}
            >
              <Cpu size={14} /> Entwicklung starten
            </Button>
          </div>
          {blocker && team.length > 0 && (
            <p className="hardware-blocker">{blocker}</p>
          )}
        </Card>
      )}
      {consoles.length > 0 && (
        <div className="hardware-consoles">
          {[...consoles].reverse().map((c) => {
            const platform = consolePlatform(c);
            const status = platformStatus(platform, s.day);
            const exclusives = s.games.filter((g) =>
              g.platforms.includes(ownPlatformId(c)),
            );
            return (
              <Card className="hardware-console" key={c.id}>
                <div className="hardware-console-head">
                  <Gamepad2 size={22} />
                  <div>
                    <h3>{c.name}</h3>
                    <small>
                      Generation {c.generation} · seit{" "}
                      {date(c.launched).getUTCFullYear()} · Leistung {c.power}
                    </small>
                  </div>
                  <Badge tone={status === "retired" ? "neutral" : "green"}>
                    {STATUS_LABEL[status]}
                  </Badge>
                </div>
                <div className="hardware-stats">
                  <span>
                    <small>Verkaufte Konsolen</small>
                    <b>{number(c.installed)}</b>
                  </span>
                  <span>
                    <small>Pro Monat</small>
                    <b>{number(consoleMonthlySales(s, c))}</b>
                  </span>
                  <span>
                    <small>Marktgewicht</small>
                    <b>{Math.round(platformShare(platform, s.day))}</b>
                  </span>
                  <span>
                    <small>Lizenzeinnahmen</small>
                    <b>{money(c.licenseRevenue)}</b>
                  </span>
                  <span>
                    <small>Eigene Spiele</small>
                    <b>{exclusives.length}</b>
                  </span>
                </div>
                <p className="hint">
                  Gute eigene Spiele (ab 7,0) im ersten Jahr verkaufen mehr
                  Konsolen. Spiele nur für {c.name} sind Exklusivtitel mit +
                  {Math.round(EXCLUSIVE_BONUS * 100)} % Verkäufen.
                </p>
              </Card>
            );
          })}
        </div>
      )}
      {!project &&
        consoles.length > 0 &&
        s.company.office >= CONSOLE_OFFICE && (
          <p className="hint">
            Eine neue Generation kannst du entwickeln, während die aktuelle
            Konsole noch verkauft wird.
          </p>
        )}
    </div>
  );
}
