import { scaled } from "../../game/economy/scale";
import { useMemo, useRef, useState } from "react";
import {
  Brain,
  CalendarClock,
  Check,
  Clock,
  Coins,
  FlaskConical,
  Gauge,
  Globe,
  Infinity as InfinityIcon,
  Layers,
  Lightbulb,
  Lock,
  Megaphone,
  Music,
  Palette,
  Sparkles,
  TriangleAlert,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useGame } from "../../store/gameStore";
import { OFFICES } from "../../game/config/balance";
import {
  LABS,
  RESEARCH_FOCUS,
  TECH_BRANCHES,
  TECHNOLOGIES,
} from "../../game/config/technologies";
import {
  lab,
  marketExpectation,
  missingStandards,
  releaseResearch,
  researchBlocker,
  researchCost,
  researchIncome,
  researchProgress,
  researchSpeed,
  standardPenalty,
  techById,
  techEffects,
  techLevel,
  techStatus,
} from "../../game/research/research";
import type { TechStatus } from "../../game/research/research";
import type {
  GameState,
  ResearchFocus,
  TechBranch,
  TechEffects,
  Technology,
} from "../../game/types";
import { money, date } from "../../game/utils";
import { Button, Card, Progress } from "../ui";

const BRANCH_ICONS: Record<TechBranch, LucideIcon> = {
  graphics: Palette,
  gameplay: Brain,
  audio: Music,
  production: Wrench,
  network: Globe,
  business: Megaphone,
  programs: InfinityIcon,
};
const TREE_BRANCHES = (Object.keys(TECH_BRANCHES) as TechBranch[]).filter(
  (b) => b !== "programs",
);
const TIERS = [1, 2, 3, 4] as const;
const ROMAN = ["I", "II", "III", "IV"];
const STATUS_LABEL: Record<TechStatus, string> = {
  done: "Erforscht",
  maxed: "Maximal",
  active: "Läuft",
  available: "Verfügbar",
  locked: "Gesperrt",
  future: "Zukunft",
};
const pct = (n: number) => `${Math.round(n * 100)} %`;

/** Human readable effect lines for a technology or the studio total. */
function effectLines(e: TechEffects) {
  const lines: { text: string; good: boolean }[] = [];
  const add = (value: number | undefined, text: (v: number) => string) => {
    if (value) lines.push({ text: text(value), good: true });
  };
  add(e.quality, (v) => `+${v} Qualität für alle Spiele`);
  for (const [genre, v] of Object.entries(e.genres ?? {}))
    add(v, (n) => `+${n} Qualität · ${genre}`);
  add(e.speed, (v) => `−${pct(v)} Entwicklungszeit`);
  add(e.cost, (v) => `−${pct(v)} Projektbudget`);
  add(e.bugs, (v) => `−${pct(v)} Bug-Risiko`);
  add(e.sales, (v) => `+${pct(v)} Verkäufe`);
  add(e.longTail, (v) => `+${pct(v)} längere Verkaufsphase`);
  add(e.hype, (v) => `+${v} Start-Hype für neue Projekte`);
  add(e.campaign, (v) => `+${v} Hype pro Kampagne`);
  add(e.fans, (v) => `+${pct(v)} Fans bei Releases`);
  add(e.research, (v) => `+${pct(v)} Forschungspunkte`);
  add(e.labSpeed, (v) => `+${pct(v)} Forschungstempo`);
  add(e.engine, (v) => `+${v} Engine-Level für neue Frameworks`);
  return lines;
}

function daysLeft(s: GameState, p: GameState["research"][number]) {
  return Math.max(1, Math.ceil((p.duration - p.elapsed) / researchSpeed(s)));
}

export default function ResearchView() {
  const store = useGame();
  const s = store.game;
  const year = date(s.day).getUTCFullYear();
  const effects = useMemo(() => techEffects(s), [s]);
  const missing = missingStandards(s);
  const currentLab = lab(s);
  const nextLab = LABS[s.lab.level + 1];
  const income = researchIncome(s);
  const speed = researchSpeed(s);
  const expectation = marketExpectation(s);
  const [branch, setBranch] = useState<TechBranch | "all">("all");
  const [selectedId, setSelectedId] = useState(
    () =>
      TECHNOLOGIES.find((t) => techStatus(s, t) === "available")?.id ??
      TECHNOLOGIES[0].id,
  );
  const inspectorRef = useRef<HTMLDivElement>(null);
  const selected = techById(selectedId) ?? TECHNOLOGIES[0];
  const unlocks = TECHNOLOGIES.filter((t) => t.requires.includes(selected.id));

  const select = (id: string) => {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1100px)").matches)
      inspectorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
  };

  const node = (t: Technology) => {
    const status = techStatus(s, t);
    const level = techLevel(s, t.id);
    const price = researchCost(s, t);
    const active = s.research.find((r) => r.techId === t.id);
    const affordable = !researchBlocker(s, t);
    const outdated = missing.includes(t);
    const Icon =
      status === "done" || status === "maxed"
        ? Check
        : status === "locked"
          ? Lock
          : status === "future"
            ? CalendarClock
            : status === "active"
              ? FlaskConical
              : Sparkles;
    const related = selected.requires.includes(t.id)
      ? "is-requirement"
      : t.requires.includes(selected.id)
        ? "is-unlock"
        : "";
    return (
      <button
        type="button"
        key={t.id}
        className={`tech-node ${status} ${affordable ? "ready" : ""} ${
          outdated ? "outdated" : ""
        } ${t.id === selected.id ? "selected" : ""} ${related}`}
        onClick={() => select(t.id)}
        aria-pressed={t.id === selected.id}
        aria-label={`${t.name}: ${STATUS_LABEL[status]}`}
      >
        <span className="tech-node-icon">
          <Icon size={13} />
        </span>
        <span className="tech-node-body">
          <strong>{t.name}</strong>
          <small>
            {status === "future"
              ? `ab ${t.year}`
              : status === "active" && active
                ? `${daysLeft(s, active)} Tage`
                : t.maxLevel
                  ? `Stufe ${level}/${t.maxLevel}`
                  : status === "done"
                    ? "Erforscht"
                    : `${price.points} RP · ${money(price.cost)}`}
          </small>
        </span>
        {outdated && (
          <span className="tech-node-flag" title="Branchenstandard fehlt">
            <TriangleAlert size={11} />
          </span>
        )}
        {active && (
          <span className="tech-node-progress">
            <span style={{ width: `${researchProgress(active)}%` }} />
          </span>
        )}
      </button>
    );
  };

  const status = techStatus(s, selected);
  const price = researchCost(s, selected);
  const blocker = researchBlocker(s, selected);
  const activeSelected = s.research.find((r) => r.techId === selected.id);
  const SelectedIcon = BRANCH_ICONS[selected.category];
  const totals = effectLines(effects);

  return (
    <div className="research-view">
      <Card className="lab-hud">
        <div className="lab-points">
          <span className="lab-points-icon">
            <FlaskConical size={24} />
          </span>
          <div>
            <span className="eyebrow">FORSCHUNGSPUNKTE</span>
            <strong>{Math.floor(s.company.researchPoints)}</strong>
            <small>
              +{income.toFixed(2)} pro Tag · Release +
              {releaseResearch(s, "Indie")} bis +{releaseResearch(s, "AAA")}
            </small>
          </div>
        </div>
        <div className="lab-stats">
          <div>
            <span>Labor</span>
            <strong>{currentLab.name}</strong>
            <small>
              Stufe {s.lab.level + 1} von {LABS.length}
            </small>
          </div>
          <div>
            <span>Plätze</span>
            <strong>
              {s.research.length} / {currentLab.slots}
            </strong>
            <small>gleichzeitige Projekte</small>
          </div>
          <div>
            <span>Tempo</span>
            <strong>×{speed.toFixed(2)}</strong>
            <small>Forschungsfortschritt</small>
          </div>
          <div className={expectation + standardPenalty(s) > 0 ? "warn" : ""}>
            <span>Anspruch {year}</span>
            <strong>−{Math.round(expectation + standardPenalty(s))}</strong>
            <small>Qualität durch Marktdruck</small>
          </div>
        </div>
      </Card>

      <div className="lab-slots">
        {Array.from({ length: currentLab.slots }, (_, i) => {
          const r = s.research[i];
          const t = r && techById(r.techId);
          if (!r || !t)
            return (
              <div className="lab-slot free" key={`empty-${i}`}>
                <Lightbulb size={18} />
                <div>
                  <strong>Freier Forschungsplatz</strong>
                  <small>Wähle unten eine verfügbare Technologie.</small>
                </div>
              </div>
            );
          const Icon = BRANCH_ICONS[t.category];
          return (
            <div className="lab-slot" key={r.techId}>
              <span className="lab-slot-icon">
                <Icon size={17} />
              </span>
              <div className="lab-slot-body">
                <div className="lab-slot-head">
                  <button type="button" onClick={() => select(t.id)}>
                    {t.name}
                  </button>
                  <span>{Math.round(researchProgress(r))} %</span>
                </div>
                <Progress value={researchProgress(r)} />
                <small>
                  Noch etwa {daysLeft(s, r)} Tage ·{" "}
                  {TECH_BRANCHES[t.category].name}
                </small>
              </div>
              <button
                type="button"
                className="lab-slot-cancel"
                title="Abbrechen (50 % der Punkte zurück)"
                aria-label={`${t.name} abbrechen`}
                onClick={() => store.cancelResearch(t.id)}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="lab-controls">
        <Card className="lab-focus">
          <div className="lab-section-title">
            <Gauge size={15} />
            <h3>Forschungsausrichtung</h3>
          </div>
          <div className="lab-focus-options" role="radiogroup">
            {(Object.keys(RESEARCH_FOCUS) as ResearchFocus[]).map((f) => (
              <button
                type="button"
                role="radio"
                aria-checked={s.lab.focus === f}
                key={f}
                className={s.lab.focus === f ? "selected" : ""}
                onClick={() => store.researchFocus(f)}
              >
                <strong>{RESEARCH_FOCUS[f].name}</strong>
                <small>{RESEARCH_FOCUS[f].description}</small>
              </button>
            ))}
          </div>
        </Card>
        <Card className="lab-upgrade">
          <div className="lab-section-title">
            <Layers size={15} />
            <h3>Labor-Ausbau</h3>
          </div>
          {nextLab ? (
            <>
              <strong className="lab-upgrade-name">{nextLab.name}</strong>
              <p>{nextLab.subtitle}</p>
              <ul className="lab-upgrade-perks">
                <li>{nextLab.slots} Forschungsplätze</li>
                <li>×{nextLab.speed.toFixed(2)} Tempo</li>
                <li>+{pct(nextLab.research)} Punkte</li>
                <li>{money(scaled(s, nextLab.upkeep))} / Monat</li>
              </ul>
              {s.company.office < nextLab.office && (
                <small className="lab-requirement">
                  <Lock size={11} /> Benötigt Büro „
                  {OFFICES[nextLab.office].name}“
                </small>
              )}
              <Button
                detail={money(scaled(s, nextLab.cost))}
                disabled={
                  s.company.office < nextLab.office ||
                  s.company.cash < scaled(s, nextLab.cost)
                }
                onClick={store.upgradeLab}
              >
                Ausbauen
              </Button>
            </>
          ) : (
            <p>Dein Innovationszentrum ist voll ausgebaut.</p>
          )}
        </Card>
      </div>

      <Card className="tech-bonuses">
        <div className="lab-section-title">
          <Sparkles size={15} />
          <h3>Aktive Forschungsboni</h3>
          <span>
            {s.technologies.length} / {TECHNOLOGIES.length} Technologien
          </span>
        </div>
        <div className="tech-bonus-list">
          {totals.length ? (
            totals.map((l) => (
              <span className="tech-bonus" key={l.text}>
                {l.text}
              </span>
            ))
          ) : (
            <span className="tech-bonus muted">
              Noch keine Boni – starte deine erste Forschung.
            </span>
          )}
          {missing.map((t) => (
            <button
              type="button"
              className="tech-bonus bad"
              key={t.id}
              onClick={() => select(t.id)}
            >
              <TriangleAlert size={11} /> {t.name} fehlt · −3 Qualität
            </button>
          ))}
        </div>
      </Card>

      <div className="tech-layout">
        <div className="tech-tree-wrap">
          <div className="tech-filter" role="tablist">
            {(
              ["all", ...Object.keys(TECH_BRANCHES)] as (TechBranch | "all")[]
            ).map((b) => {
              const Icon = b === "all" ? Layers : BRANCH_ICONS[b];
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={branch === b}
                  key={b}
                  className={branch === b ? "selected" : ""}
                  onClick={() => setBranch(b)}
                >
                  <Icon size={13} />
                  {b === "all" ? "Alle" : TECH_BRANCHES[b].name}
                </button>
              );
            })}
          </div>
          <div className="tech-tree">
            {branch !== "programs" && (
              <div className="tech-cells tech-tiers" aria-hidden>
                {TIERS.map((tier) => (
                  <span key={tier}>Stufe {ROMAN[tier - 1]}</span>
                ))}
              </div>
            )}
            {TREE_BRANCHES.filter((b) => branch === "all" || branch === b).map(
              (b) => {
                const Icon = BRANCH_ICONS[b];
                const techs = TECHNOLOGIES.filter((t) => t.category === b);
                const done = techs.filter((t) => techLevel(s, t.id)).length;
                return (
                  <div className="tech-row" key={b}>
                    <div className="tech-branch">
                      <Icon size={14} />
                      <strong>{TECH_BRANCHES[b].name}</strong>
                      <span>{TECH_BRANCHES[b].description}</span>
                      <small>
                        {done}/{techs.length}
                      </small>
                    </div>
                    <div className="tech-cells">
                      {TIERS.map((tier) => (
                        <div className="tech-cell" key={tier}>
                          {techs.filter((t) => t.tier === tier).map(node)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              },
            )}
            {(branch === "all" || branch === "programs") && (
              <div className="tech-row programs">
                <div className="tech-branch">
                  <InfinityIcon size={14} />
                  <strong>{TECH_BRANCHES.programs.name}</strong>
                  <span>{TECH_BRANCHES.programs.description}</span>
                </div>
                <div className="tech-cell wide">
                  {TECHNOLOGIES.filter((t) => t.category === "programs").map(
                    node,
                  )}
                </div>
              </div>
            )}
          </div>
          <p className="hint tech-legend">
            <span className="dot ready" /> erforschbar
            <span className="dot done" /> erforscht
            <span className="dot locked" /> gesperrt
            <span className="dot outdated" /> Branchenstandard fehlt
          </p>
        </div>

        <div className="tech-inspector" ref={inspectorRef}>
          <Card className={`tech-detail ${status}`}>
            <div className="tech-detail-head">
              <span className="tech-detail-icon">
                <SelectedIcon size={20} />
              </span>
              <div>
                <span className="eyebrow">
                  {TECH_BRANCHES[selected.category].name.toLocaleUpperCase(
                    "de-DE",
                  )}
                  {selected.maxLevel
                    ? ` · STUFE ${techLevel(s, selected.id)}/${selected.maxLevel}`
                    : ` · STUFE ${ROMAN[selected.tier - 1]}`}
                </span>
                <h2>{selected.name}</h2>
              </div>
              <span className={`tech-status ${status}`}>
                {STATUS_LABEL[status]}
              </span>
            </div>
            <p>{selected.description}</p>

            <div className="tech-effects">
              <span className="tech-detail-label">
                {selected.maxLevel ? "Wirkung pro Stufe" : "Wirkung"}
              </span>
              <ul>
                {effectLines(selected.effects).map((l) => (
                  <li key={l.text}>{l.text}</li>
                ))}
              </ul>
            </div>

            {selected.standard && (
              <div
                className={`tech-standard ${
                  missing.includes(selected) ? "bad" : ""
                }`}
              >
                <TriangleAlert size={13} />
                <span>
                  Branchenstandard ab {selected.standard}. Ohne diese
                  Technologie bewertet die Presse jedes Spiel mit −3 Qualität.
                </span>
              </div>
            )}

            {(selected.requires.length > 0 || unlocks.length > 0) && (
              <div className="tech-links">
                {selected.requires.length > 0 && (
                  <div>
                    <span className="tech-detail-label">Voraussetzungen</span>
                    {selected.requires.map((id) => (
                      <button
                        type="button"
                        key={id}
                        className={techLevel(s, id) ? "met" : ""}
                        onClick={() => select(id)}
                      >
                        {techLevel(s, id) ? (
                          <Check size={11} />
                        ) : (
                          <Lock size={11} />
                        )}
                        {techById(id)?.name}
                      </button>
                    ))}
                  </div>
                )}
                {unlocks.length > 0 && (
                  <div>
                    <span className="tech-detail-label">Schaltet frei</span>
                    {unlocks.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => select(t.id)}
                      >
                        <Sparkles size={11} />
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSelected ? (
              <div className="tech-running">
                <div>
                  <span>Fortschritt</span>
                  <strong>
                    {Math.round(researchProgress(activeSelected))} %
                  </strong>
                </div>
                <Progress value={researchProgress(activeSelected)} />
                <small>Noch etwa {daysLeft(s, activeSelected)} Tage</small>
                <Button
                  secondary
                  onClick={() => store.cancelResearch(selected.id)}
                >
                  Abbrechen · {Math.floor((activeSelected.points ?? 0) / 2)} RP
                  zurück
                </Button>
              </div>
            ) : status === "done" || status === "maxed" ? (
              <div className="tech-complete">
                <Check size={16} />
                {status === "maxed"
                  ? "Programm vollständig abgeschlossen."
                  : "Erforscht und in allen neuen Projekten aktiv."}
              </div>
            ) : (
              <>
                <div className="tech-cost">
                  <div
                    className={
                      s.company.researchPoints < price.points ? "short" : ""
                    }
                  >
                    <FlaskConical size={15} />
                    <strong>{price.points}</strong>
                    <span>Punkte</span>
                  </div>
                  <div className={s.company.cash < price.cost ? "short" : ""}>
                    <Coins size={15} />
                    <strong>{money(price.cost)}</strong>
                    <span>Kosten</span>
                  </div>
                  <div>
                    <Clock size={15} />
                    <strong>≈{Math.ceil(price.days / speed)}</strong>
                    <span>Tage</span>
                  </div>
                </div>
                <Button
                  className="tech-start"
                  disabled={!!blocker}
                  onClick={() => store.research(selected.id)}
                >
                  <FlaskConical size={15} />
                  {selected.maxLevel && techLevel(s, selected.id)
                    ? `Stufe ${techLevel(s, selected.id) + 1} erforschen`
                    : "Forschung starten"}
                </Button>
                {blocker && <small className="tech-blocker">{blocker}</small>}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
