import { Building2, Check, Lock, Users, X } from "lucide-react";
import { FACILITY_ICONS } from "../game/facilityIcons";
import { useGame } from "../../store/gameStore";
import { FACILITIES, OFFICES } from "../../game/config/offices";
import {
  facilityBlocker,
  facilityById,
  facilityCost,
  facilityUpkeep,
  office,
  officeCost,
  officeRent,
} from "../../game/office/office";
import { scaled } from "../../game/economy/scale";
import { money } from "../../game/utils";
import { Button, Card, Progress } from "../ui";
import Office from "../Office";


export default function StudioView() {
  const store = useGame();
  const s = store.game;
  const current = office(s);
  const nextIndex = s.company.office + 1;
  const next = OFFICES[nextIndex];
  const free = current.slots - s.facilities.length;
  return (
    <div className="office-view">
      <Card className="office-hero">
        <div className="office-hero-art">
          <Office staff={s.employees.length} level={s.company.office} />
        </div>
        <div className="office-hero-info">
          <span className="eyebrow">
            KAPITEL {s.company.office + 1} VON {OFFICES.length}
          </span>
          <h2>{current.name}</h2>
          <p>{current.subtitle}</p>
          <div className="office-stats">
            <div>
              <span>Arbeitsplätze</span>
              <strong>
                {s.employees.length} / {current.capacity}
              </strong>
              <Progress value={(s.employees.length / current.capacity) * 100} />
            </div>
            <div>
              <span>Räume</span>
              <strong>
                {s.facilities.length} / {current.slots}
              </strong>
              <Progress value={(s.facilities.length / current.slots) * 100} />
            </div>
            <div>
              <span>Miete / Monat</span>
              <strong>{money(officeRent(s))}</strong>
            </div>
            <div>
              <span>Räume / Monat</span>
              <strong>{money(facilityUpkeep(s))}</strong>
            </div>
          </div>
        </div>
      </Card>

      <section className="office-section">
        <div className="office-section-head">
          <h3>Einrichtungen</h3>
          <span>
            Jedes Gebäude hat begrenzte Räume. Wähle, was dein Team am meisten
            braucht.
          </span>
        </div>
        <div className="facility-slots">
          {s.facilities.map((id) => {
            const f = facilityById(id)!;
            const Icon = FACILITY_ICONS[id] ?? Building2;
            return (
              <div className="facility-slot filled" key={id}>
                <span className="facility-icon">
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{f.name}</strong>
                  <small>{money(scaled(s, f.upkeep))} / Monat</small>
                </div>
                <button
                  type="button"
                  aria-label={`${f.name} entfernen`}
                  title="Raum räumen (ohne Erstattung)"
                  onClick={() => store.removeFacility(id)}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, free) }, (_, i) => (
            <div className="facility-slot empty" key={`free-${i}`}>
              <span className="facility-icon">
                <Building2 size={16} />
              </span>
              <div>
                <strong>Freier Raum</strong>
                <small>Wähle unten eine Einrichtung.</small>
              </div>
            </div>
          ))}
        </div>
        <div className="facility-catalog">
          {FACILITIES.map((f) => {
            const Icon = FACILITY_ICONS[f.id] ?? Building2;
            const built = s.facilities.includes(f.id);
            const locked = s.company.office < f.office;
            const blocker = facilityBlocker(s, f.id);
            return (
              <Card
                className={`facility-card ${built ? "built" : ""} ${locked ? "locked" : ""}`}
                key={f.id}
              >
                <div className="facility-card-head">
                  <span className="facility-icon">
                    <Icon size={18} />
                  </span>
                  <strong>{f.name}</strong>
                  {built && <Check size={15} className="facility-check" />}
                </div>
                <p>{f.description}</p>
                <div className="facility-meta">
                  <span>{money(scaled(s, f.upkeep))} / Monat</span>
                  {locked && (
                    <span className="facility-lock">
                      <Lock size={11} /> {OFFICES[f.office].name}
                    </span>
                  )}
                </div>
                {!built && (
                  <Button
                    secondary
                    disabled={!!blocker}
                    onClick={() => store.buildFacility(f.id)}
                    detail={money(facilityCost(s, f.id))}
                  >
                    Einrichten
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <section className="office-section">
        <div className="office-section-head">
          <h3>Gebäude</h3>
          <span>Größere Gebäude bringen mehr Plätze und mehr Räume.</span>
        </div>
        <ol className="office-ladder">
          {OFFICES.map((o, i) => {
            const state =
              i < s.company.office
                ? "past"
                : i === s.company.office
                  ? "current"
                  : i === nextIndex
                    ? "next"
                    : "future";
            return (
              <li className={`office-step ${state}`} key={o.name}>
                <span className="office-step-index">{i + 1}</span>
                <div className="office-step-body">
                  <strong>{o.name}</strong>
                  <small>{o.subtitle}</small>
                  <div className="office-step-facts">
                    <span>
                      <Users size={11} /> {o.capacity} Plätze
                    </span>
                    <span>
                      <Building2 size={11} /> {o.slots} Räume
                    </span>
                    <span>{money(scaled(s, o.rent))} Miete</span>
                  </div>
                </div>
                {state === "current" && <span className="office-badge">Dein Studio</span>}
                {state === "next" && next && (
                  <Button
                    disabled={s.company.cash < officeCost(s, nextIndex)}
                    onClick={store.upgrade}
                    detail={money(officeCost(s, nextIndex))}
                  >
                    Umziehen
                  </Button>
                )}
                {state === "future" && (
                  <span className="office-price">{money(officeCost(s, i))}</span>
                )}
                {state === "past" && <Check size={15} className="office-done" />}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
