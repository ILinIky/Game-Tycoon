import { AlertTriangle, Sparkles, UserMinus, Zap } from "lucide-react";
import {
  fairSalary,
  perkById,
  severancePay,
  unrestReasons,
} from "../../game/employees/perks";
import { headhuntCost } from "../../game/employees/recruiting";
import { BALANCE } from "../../game/config/balance";
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
  const { game: s, hire, train, adjustSalary, fire } = useGame();
  const [confirmFire, setConfirmFire] = useState(false);
  const busy = isWorking(s, e.id);
  const full = s.employees.length >= OFFICES[s.company.office].capacity;
  const fair = fairSalary(e, s);
  const underpaid = !candidate && e.role !== "Gründer" && e.salary < fair * 0.9;
  const reasons = candidate || e.role === "Gründer" ? [] : unrestReasons(e, s);
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
            {underpaid && (
              <em className="underpaid"> · unter Marktwert ({money(fair)})</em>
            )}
          </small>
        </div>
        <Button
          detail={candidate ? undefined : money(trainingCost(s))}
          secondary
          disabled={candidate ? full : busy}
          onClick={() => (candidate ? hire(e.id) : train(e.id))}
        >
          {candidate ? (full ? "Büro voll" : "Einstellen") : "Training"}
        </Button>
      </div>
      {!candidate && e.role !== "Gründer" && (
        <div className="employee-fire">
          {confirmFire ? (
            <>
              <span>
                {e.name} wirklich entlassen? Abfindung: ein Monatsgehalt.
              </span>
              <Button secondary onClick={() => setConfirmFire(false)}>
                Behalten
              </Button>
              <Button
                className="danger"
                detail={money(severancePay(e))}
                onClick={() => fire(e.id)}
              >
                Entlassen
              </Button>
            </>
          ) : (
            <button
              className="text-button employee-fire-open"
              onClick={() => setConfirmFire(true)}
            >
              <UserMinus size={13} /> Entlassen
            </button>
          )}
        </div>
      )}
      {(underpaid || (reasons.length > 0 && e.loyalty < 50)) && (
        <div className="employee-unrest" role="status">
          <span>
            <AlertTriangle size={13} />
            {e.loyalty < 35 ? "Kündigung droht" : "Unzufrieden"}:{" "}
            {reasons.join(", ") || "geringe Loyalität"}
          </span>
          {underpaid && (
            <Button
              detail={`+${money(fair - e.salary)} / Monat`}
              onClick={() => adjustSalary(e.id)}
            >
              Gehalt anpassen
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
export default function EmployeesView() {
  const store = useGame();
  const s = store.game;
  const [role, setRole] = useState<Role | "Mix">("Programmierung");
  const [seniority, setSeniority] = useState<"Junior" | "Senior">("Junior");
  const budgets = recruitBudgets(s);
  const [chosenBudget, setBudget] = useState(0);
  // Budgets grow with the market; keep the choice on a valid step.
  const budget = budgets.includes(chosenBudget) ? chosenBudget : budgets[0];
  return (
    <>
      <Card className="recruit-panel">
        <div>
          <span className="eyebrow">RECRUITING</span>
          <h2>Das nächste Talent finden.</h2>
          <p>
            {s.recruitment
              ? `Bewerbungen kommen in ${s.recruitment.remaining} Tagen.`
              : `Schalte eine Anzeige: In ${BALANCE.recruitmentDays} Tagen lernst du ${BALANCE.candidates} Kandidaten kennen. Ein Headhunter stellt sie sofort vor.`}
          </p>
        </div>
        <div className="recruit-form">
          <label>
            Rolle
            <GameSelect
              label="Rolle"
              value={role}
              onChange={(value) => setRole(value as Role | "Mix")}
              options={[
                {
                  value: "Mix",
                  label: "Gemischt (Zufall)",
                  description: "Je ein Talent aus verschiedenen Bereichen",
                },
                ...[
                  "Programmierung",
                  "Game Design",
                  "Art",
                  "Audio",
                  "QA",
                ].map((value) => ({ value, label: value })),
              ]}
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
              options={budgets.map((value) => ({
                value: String(value),
                label: money(value),
              }))}
            />
          </label>
          <div className="recruit-actions">
            <Button
              secondary
              detail={money(budget)}
              disabled={!!s.recruitment || s.company.cash < budget}
              onClick={() => store.recruit(role, seniority, budget)}
            >
              <Users size={14} /> Anzeige · {BALANCE.recruitmentDays} Tage
            </Button>
            <Button
              detail={money(headhuntCost(budget))}
              disabled={!!s.recruitment || s.company.cash < headhuntCost(budget)}
              onClick={() => store.recruit(role, seniority, budget, true)}
            >
              <Zap size={14} /> Sofort finden
            </Button>
          </div>
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
