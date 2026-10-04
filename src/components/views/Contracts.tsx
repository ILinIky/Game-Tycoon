import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, CalendarClock, Check, Handshake, X } from "lucide-react";
import { useGame } from "../../store/gameStore";
import {
  contractQuality,
  contractSpeed,
  FOCUS_LABEL,
  MAX_ACTIVE_CONTRACTS,
  payoutFactor,
  publisherOffers,
} from "../../game/contracts/contracts";
import { isAssigned } from "../../game/employees/assignment";
import { nice, scaled } from "../../game/economy/scale";
import { money } from "../../game/utils";
import { Button, Card, Progress } from "../ui";
import { useStudioMotion } from "../game/GameMotion";
import type { ContractOffer } from "../../game/types";

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

export default function ContractsView() {
  const store = useGame();
  const s = store.game;
  const animated = useStudioMotion();
  const free = s.employees.filter((e) => !isAssigned(s, e.id));
  const [selected, setSelected] = useState<string | null>(null);
  const [team, setTeam] = useState<string[]>([]);
  const chosen = team.filter((id) => free.some((e) => e.id === id));
  const full = s.contracts.active.length >= MAX_ACTIVE_CONTRACTS;

  const estimate = (offer: ContractOffer) => {
    const speed = contractSpeed(s, { team: chosen, focus: offer.focus });
    return {
      days: speed ? Math.ceil(offer.work / speed) : Infinity,
      factor: payoutFactor(contractQuality(s, { team: chosen, focus: offer.focus, level: offer.level })),
    };
  };

  return (
    <div className="contracts-view">
      <Card className="contracts-hero">
        <span className="contracts-icon">
          <Briefcase size={24} />
        </span>
        <div>
          <span className="eyebrow">AUFTRAGSARBEITEN</span>
          <h2>Sicheres Geld zwischen den großen Projekten.</h2>
          <p>
            Kunden bezahlen feste Summen für Portierungen, Grafiken oder
            Soundtracks. Je besser das Team den geforderten Skill erfüllt, desto
            höher die Zahlung (60–120 %). Wer die Frist verpasst, verliert Ruf.
          </p>
        </div>
        <div className="contracts-stats">
          <span>
            <b>{s.contracts.active.length}/{MAX_ACTIVE_CONTRACTS}</b> aktiv
          </span>
          <span>
            <b>{s.contracts.completed}</b> erledigt
          </span>
          <span>
            <b>{s.contracts.failed}</b> verpasst
          </span>
        </div>
      </Card>

      {s.contracts.active.length > 0 && (
        <section className="contracts-section">
          <h3>Laufende Aufträge</h3>
          <div className="contracts-active">
            <AnimatePresence initial={false}>
              {s.contracts.active.map((c) => {
                const left = c.deadline - s.day;
                const speed = contractSpeed(s, c);
                const need = speed ? Math.ceil((c.work - c.done) / speed) : Infinity;
                const factor = payoutFactor(contractQuality(s, c));
                return (
                  <motion.div
                    key={c.id}
                    layout={animated}
                    initial={animated ? { opacity: 0, y: 10 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className={`contract-active ${need > left ? "late" : ""}`}
                  >
                    <div className="contract-head">
                      <span className="contract-client">{initials(c.client)}</span>
                      <div>
                        <strong>{c.title}</strong>
                        <small>
                          {c.client} · {FOCUS_LABEL[c.focus]} {c.level}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="contract-cancel"
                        aria-label="Auftrag abbrechen"
                        title="Abbrechen (−2 Ruf)"
                        onClick={() => store.cancelContract(c.id)}
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div className="contract-progress">
                      <Progress value={(c.done / c.work) * 100} />
                      <span>{Math.round((c.done / c.work) * 100)} %</span>
                    </div>
                    <div className="contract-meta">
                      <span className={left < 5 ? "urgent" : ""}>
                        <CalendarClock size={12} /> noch {left} Tage Frist
                      </span>
                      <span>≈{Number.isFinite(need) ? need : "–"} Tage Arbeit</span>
                      <span>{money(nice(c.payment * factor))}</span>
                    </div>
                    <div className="contract-team">
                      {s.employees
                        .filter((e) => c.team.includes(e.id))
                        .map((e) => (
                          <span key={e.id}>
                            <b>{initials(e.name)}</b>
                            {e.name.split(" ")[0]}
                          </span>
                        ))}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>
      )}

      <section className="contracts-section">
        <h3>Angebote</h3>
        <div className="contracts-offers">
          {s.contracts.offers.map((o) => {
            const open = selected === o.id;
            const est = estimate(o);
            const fits = est.days <= o.days;
            return (
              <motion.div
                key={o.id}
                layout={animated}
                className={`contract-offer ${open ? "open" : ""}`}
              >
                <div className="contract-head">
                  <span className="contract-client">{initials(o.client)}</span>
                  <div>
                    <strong>{o.title}</strong>
                    <small>{o.client}</small>
                  </div>
                </div>
                <div className="contract-facts">
                  <span>
                    <b>{FOCUS_LABEL[o.focus]}</b> ab {o.level}
                  </span>
                  <span>
                    <b>{o.days}</b> Tage Frist
                  </span>
                  <span className="contract-pay">{money(o.payment)}</span>
                </div>
                <small className="contract-expiry">
                  Angebot gilt noch {Math.max(0, o.expires - s.day)} Tage
                </small>
                {open ? (
                  <div className="contract-assign">
                    <div className="contract-picker">
                      {free.length === 0 && <p className="hint">Alle Mitarbeiter sind beschäftigt.</p>}
                      {free.map((e) => {
                        const on = chosen.includes(e.id);
                        return (
                          <button
                            type="button"
                            key={e.id}
                            className={on ? "selected" : ""}
                            aria-pressed={on}
                            disabled={!on && chosen.length >= 3}
                            onClick={() =>
                              setTeam(on ? chosen.filter((id) => id !== e.id) : [...chosen, e.id])
                            }
                          >
                            <b>{initials(e.name)}</b>
                            <span>
                              {e.name.split(" ")[0]}
                              <small>
                                {FOCUS_LABEL[o.focus]} {Math.round(e.skills[o.focus])}
                              </small>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {chosen.length > 0 && (
                      <p className={`contract-estimate ${fits ? "ok" : "late"}`}>
                        ≈{est.days} Tage · {Math.round(est.factor * 100)} % Zahlung ·{" "}
                        {fits ? "schafft die Frist" : "Frist wird knapp"}
                      </p>
                    )}
                    <Button
                      disabled={!chosen.length || full}
                      onClick={() => {
                        if (store.acceptContract(o.id, chosen)) {
                          setSelected(null);
                          setTeam([]);
                        }
                      }}
                    >
                      <Check size={14} /> Auftrag annehmen
                    </Button>
                    {full && <small className="contract-full">Höchstens {MAX_ACTIVE_CONTRACTS} Aufträge gleichzeitig.</small>}
                  </div>
                ) : (
                  <Button secondary onClick={() => setSelected(o.id)}>
                    Team zuweisen
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      <Card className="publisher-info">
        <Handshake size={20} />
        <div>
          <strong>Publisher-Deals</strong>
          <p>
            Im Produktionsplan kannst du ein Spiel von einem Publisher
            finanzieren lassen: Vorschuss sofort, dafür ein Anteil am Umsatz.
            Bessere Publisher arbeiten erst mit Studios mit gutem Ruf.
          </p>
          <div className="publisher-chips">
            {publisherOffers(s, scaled(s, 30000)).map((p) => (
              <span key={p.name} className={p.locked ? "locked" : ""}>
                {p.name} · {Math.round(p.share * 100)} % Anteil
                {p.locked && ` · ab Ruf ${p.reputation}`}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
