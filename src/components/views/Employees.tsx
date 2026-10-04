import { Sparkles } from "lucide-react";
import { fairSalary, perkById } from "../../game/employees/perks";
import { assignmentLabel } from "../../game/employees/assignment";
import { recruitBudgets } from "../../game/economy/scale";
import { trainingCost } from "../../game/office/office";
import { useState } from "react";
import { Users } from "lucide-react";
import { useGame } from "../../store/gameStore";
import { isWorking } from "../../game/engines/engines";
import { OFFICES } from "../../game/config/balance";
import { money } from "../../game/utils";
import { Badge, Button, Card, Progress } from "../ui";
import type { Employee, Role } from "../../game/types";
import GameSelect from "../game/GameSelect";
const skillNames = {
  programming: "Programmierung",
  design: "Game Design",
  art: "Grafik",
  audio: "Audio",
  writing: "Writing",
  marketing: "Marketing",
  management: "Management",
  research: "Forschung",
};
function EmployeeCard({
  employee: e,
  candidate = false,
}: {
  employee: Employee;
  candidate?: boolean;
}) {
  const { game: s, hire, train } = useGame();
  const busy = isWorking(s, e.id);
  return (
    <Card className="employee-card">
      <div className="employee-head">
        <span className="avatar large">
          {e.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)}
        </span>
        <div>
          <h3>{e.name}</h3>
          <p>
            {e.role} · {e.age} Jahre
          </p>
        </div>
        <Badge tone="neutral">{e.trait}</Badge>
      </div>
      {perkById(e.perk) && (
        <div className="perk-chip" title={perkById(e.perk)!.description}>
          <Sparkles size={12} />
          <strong>{perkById(e.perk)!.name}</strong>
          <small>{perkById(e.perk)!.description}</small>
        </div>
      )}
      <div className="skills-grid">
        {Object.entries(e.skills).map(([key, value]) => (
          <div key={key}>
            <span>{skillNames[key as keyof typeof skillNames]}</span>
            <b>{Math.round(value)}</b>
            <div className="skill-bar">
              <Progress value={value} />
              <i className="skill-cap" style={{ left: `${Math.min(100, e.potential)}%` }} title={`Potenzial ${e.potential}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="employee-vitals">
        <span>
          Motivation <b>{Math.round(e.motivation)}%</b>
        </span>
        <span>
          Energie <b>{Math.round(e.energy)}%</b>
        </span>
        <span>
          Stress <b>{Math.round(e.stress)}%</b>
        </span>
        <span className={!candidate && e.loyalty < 40 ? "vital-warn" : ""}>
          Loyalität <b>{Math.round(e.loyalty)}%</b>
        </span>
        <span>
          Potenzial <b>{e.potential}</b>
        </span>
      </div>
      <div className="employee-footer">
        <div>
          <strong>{money(e.salary)}</strong>
          <small>
            / Monat ·{" "}
            {candidate
              ? `${e.experience} Jahre Erfahrung`
              : (assignmentLabel(s, e.id) ?? "Verfügbar")}
            {!candidate && e.role !== "Gründer" && e.salary < fairSalary(e, s) * 0.85 && (
              <em className="underpaid"> · unter Marktwert ({money(fairSalary(e, s))})</em>
            )}
          </small>
        </div>
        <Button
          detail={candidate ? undefined : money(trainingCost(s))}
          secondary
          disabled={!candidate && busy}
          onClick={() => (candidate ? hire(e.id) : train(e.id))}
        >
          {candidate ? "Einstellen" : "Training"}
        </Button>
      </div>
    </Card>
  );
}
export default function EmployeesView() {
  const store = useGame();
  const s = store.game;
  const [role, setRole] = useState<Role>("Programmierung");
  const [seniority, setSeniority] = useState<"Junior" | "Senior">("Junior");
  const [budget, setBudget] = useState(650);
  return (
    <>
      <Card className="recruit-panel">
        <div>
          <span className="eyebrow">RECRUITING</span>
          <h2>Das nächste Talent finden.</h2>
          <p>
            {s.recruitment
              ? `Bewerbungen kommen in ${s.recruitment.remaining} Tagen.`
              : "Schalte eine Anzeige. In sieben Tagen lernst du drei Kandidaten kennen."}
          </p>
        </div>
        <div className="recruit-form">
          <label>
            Rolle
            <GameSelect
              label="Rolle"
              value={role}
              onChange={(value) => setRole(value as Role)}
              options={[
                "Programmierung",
                "Game Design",
                "Art",
                "Audio",
                "QA",
              ].map((value) => ({ value, label: value }))}
            />
          </label>
          <label>
            Erfahrung
            <GameSelect
              label="Erfahrung"
              value={seniority}
              onChange={(value) => setSeniority(value as typeof seniority)}
              options={["Junior", "Senior"].map((value) => ({
                value,
                label: value,
              }))}
            />
          </label>
          <label>
            Budget
            <GameSelect
              label="Recruiting-Budget"
              value={String(budget)}
              onChange={(value) => setBudget(Number(value))}
              options={recruitBudgets(s).map((value) => ({
                value: String(value),
                label: money(value),
              }))}
            />
          </label>
          <Button
            disabled={!!s.recruitment || s.company.cash < budget}
            onClick={() => store.recruit(role, seniority, budget)}
          >
            <Users size={16} />
            Anzeige starten
          </Button>
        </div>
      </Card>
      {s.candidates.length > 0 && (
        <>
          <div className="section-heading">
            <h2>Deine Bewerbungen</h2>
            <Badge>{s.candidates.length} Talente</Badge>
          </div>
          <div className="employee-grid">
            {s.candidates.map((e) => (
              <EmployeeCard key={e.id} employee={e} candidate />
            ))}
          </div>
        </>
      )}
      <div className="section-heading">
        <h2>Dein Team</h2>
        <Badge tone="neutral">
          {s.employees.length} / {OFFICES[s.company.office].capacity} Plätze
        </Badge>
      </div>
      <div className="employee-grid">
        {s.employees.map((e) => (
          <EmployeeCard key={e.id} employee={e} />
        ))}
      </div>
    </>
  );
}
