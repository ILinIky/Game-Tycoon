import { Hourglass, UserPlus, Users } from "lucide-react";
import { useGame } from "../../store/gameStore";
import { OFFICES } from "../../game/config/balance";
import { isWorking } from "../../game/employees/assignment";
import type { Employee } from "../../game/types";

const ROLE_COLOR: Record<Employee["role"], string> = {
  Gründer: "#5f7a66",
  Programmierung: "#4f7487",
  "Game Design": "#9a7a4c",
  Art: "#8f5f63",
  Audio: "#666694",
  QA: "#6f8460",
};
const VISIBLE = 7;
const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

/** Compact team bar in the bottom-left corner of the studio scene. */
export default function TeamDock({
  selected,
  onSelect,
  onOpenTeam,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  onOpenTeam: () => void;
}) {
  const s = useGame((store) => store.game);
  const capacity = OFFICES[s.company.office].capacity;
  const full = s.employees.length >= capacity;
  return (
    <div className="studio-team team-dock" aria-label="Mitarbeiter im Studio">
      <span className="team-dock-head">
        <small>TEAM</small>
        <b>
          <Users size={13} />
          {s.employees.length}/{capacity}
        </b>
        <span className="team-seats" aria-hidden>
          {Array.from({ length: Math.min(capacity, 10) }, (_, i) => (
            <i
              key={i}
              className={
                i < Math.round((s.employees.length / capacity) * Math.min(capacity, 10))
                  ? "on"
                  : ""
              }
            />
          ))}
        </span>
      </span>
      <div className="team-members">
        {s.employees.slice(0, VISIBLE).map((e) => {
          const engine = !!s.engineProject?.team.includes(e.id);
          const status =
            e.stress > 60 ? "stress" : engine ? "engine" : isWorking(s, e.id) ? "work" : "idle";
          const label =
            status === "stress"
              ? "gestresst"
              : status === "engine"
                ? "Engine-Schmiede"
                : status === "work"
                  ? "in Entwicklung"
                  : "verfügbar";
          return (
            <button
              key={e.id}
              className={`team-member ${selected === e.id ? "selected" : ""}`}
              style={{ ["--member" as string]: ROLE_COLOR[e.role] }}
              aria-label={`${e.name} auswählen`}
              title={`${e.name} · ${e.role} · ${label}`}
              onClick={() => onSelect(e.id)}
            >
              {initials(e.name)}
              <span className={`team-status ${status}`} />
              <span className="team-energy">
                <span style={{ width: `${e.energy}%` }} />
              </span>
            </button>
          );
        })}
        {s.employees.length > VISIBLE && (
          <button className="team-more" aria-label="Gesamtes Team" onClick={onOpenTeam}>
            +{s.employees.length - VISIBLE}
          </button>
        )}
      </div>
      <button
        className={`team-hire ${s.recruitment ? "pending" : ""}`}
        aria-label="Talente suchen"
        title={full ? "Büro voll – zieh um, um mehr Plätze zu bekommen" : "Talente suchen"}
        onClick={onOpenTeam}
      >
        {s.recruitment ? (
          <>
            <Hourglass size={13} />
            <span>{s.recruitment.remaining} T.</span>
          </>
        ) : (
          <>
            <UserPlus size={14} />
            <span>{full ? "Voll" : "Einstellen"}</span>
          </>
        )}
        {s.candidates.length > 0 && <span className="team-badge">{s.candidates.length}</span>}
      </button>
    </div>
  );
}
