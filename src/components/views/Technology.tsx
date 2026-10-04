import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUp,
  Brain,
  Check,
  Coins,
  Cpu,
  Handshake,
  Lock,
  Palette,
  Shapes,
  ShieldCheck,
  Sparkles,
  Timer,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useGame } from "../../store/gameStore";
import {
  ENGINE,
  ENGINE_PHASES,
  ENGINE_PROFILES,
} from "../../game/config/engines";
import { DESIGN_FOCUS } from "../../game/config/design";
import {
  availableModules,
  dockedModules,
  ENGINE_MODULES,
  engineBonus,
  enginePhase,
  enginePlan,
  engineProgress,
  engineSpeed,
  isAssigned,
  licenseIncome,
  missingModules,
} from "../../game/engines/engines";
import { techById } from "../../game/research/research";
import type {
  Engine,
  EngineInput,
  EngineProfile,
  EngineProject,
  GameState,
} from "../../game/types";
import { date, money } from "../../game/utils";
import { Button, Card } from "../ui";
import { useStudioMotion } from "../game/GameMotion";
import GameSelect from "../game/GameSelect";

const PROFILE_ICONS: Record<EngineProfile, LucideIcon> = {
  graphics: Palette,
  systems: Brain,
  performance: Zap,
  allround: Shapes,
};
const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
const versionLabel = (v?: number) => ((v ?? 1) > 1 ? ` v${v}` : "");

/** Gear outline centered at 0,0. */
function gearPath(teeth: number, outer: number, inner: number) {
  const step = (Math.PI * 2) / teeth;
  let d = "";
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [
      [a, inner],
      [a + step * 0.12, outer],
      [a + step * 0.42, outer],
      [a + step * 0.54, inner],
    ];
    for (const [ang, r] of pts)
      d += `${d ? "L" : "M"}${(Math.cos(ang) * r).toFixed(2)} ${(Math.sin(ang) * r).toFixed(2)}`;
  }
  return `${d}Z`;
}
const BIG_GEAR = gearPath(12, 44, 36);
const SMALL_GEAR = gearPath(8, 17, 12);

function EngineCore({
  s,
  project,
  animated,
}: {
  s: GameState;
  project: EngineProject;
  animated: boolean;
}) {
  const progress = engineProgress(project);
  const docked = dockedModules(project);
  const speed = engineSpeed(s, project.team);
  const n = Math.max(project.modules.length, 1);
  const circumference = 2 * Math.PI * 84;
  return (
    <svg
      className={`forge-core ${animated ? "animated" : ""}`}
      viewBox="0 0 240 240"
      style={{
        ["--spin" as string]: `${Math.max(3, 14 / Math.max(speed, 0.2))}s`,
      }}
      role="img"
      aria-label={`Engine-Kern ${Math.round(progress)} Prozent`}
    >
      <defs>
        <radialGradient id="forge-glow">
          <stop offset="0%" stopColor="#d9b47b" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#d9b47b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle
        cx="120"
        cy="120"
        r="118"
        fill="url(#forge-glow)"
        className="forge-pulse"
      />
      <g className="forge-ring slow">
        <circle cx="120" cy="120" r="104" className="forge-dash" />
      </g>
      {project.modules.map((id, i) => {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const x = 120 + Math.cos(a) * 104;
        const y = 120 + Math.sin(a) * 104;
        const isDocked = i < docked;
        return (
          <g key={id} className={`forge-module ${isDocked ? "docked" : ""}`}>
            {isDocked && (
              <line x1={x} y1={y} x2="120" y2="120" className="forge-link" />
            )}
            <circle cx={x} cy={y} r="11" />
            <text x={x} y={y + 3.5}>
              {isDocked ? "✓" : i + 1}
            </text>
            <title>{techById(id)?.name}</title>
          </g>
        );
      })}
      <circle cx="120" cy="120" r="84" className="forge-track" />
      <circle
        cx="120"
        cy="120"
        r="84"
        className="forge-progress"
        strokeDasharray={`${(progress / 100) * circumference} ${circumference}`}
        transform="rotate(-90 120 120)"
      />
      <g className="forge-ring reverse">
        <circle cx="120" cy="120" r="68" className="forge-dash fine" />
      </g>
      <g transform="translate(120 120)">
        <g className="forge-gear">
          <path d={BIG_GEAR} />
        </g>
      </g>
      <g transform="translate(166 160)">
        <g className="forge-gear small">
          <path d={SMALL_GEAR} />
        </g>
      </g>
      <circle cx="120" cy="120" r="30" className="forge-center" />
      <text x="120" y="118" className="forge-value">
        {Math.round(progress)}%
      </text>
      <text x="120" y="134" className="forge-label">
        {ENGINE_PHASES[enginePhase(progress)].name.toUpperCase()}
      </text>
    </svg>
  );
}

function ForgePanel({ s, project }: { s: GameState; project: EngineProject }) {
  const store = useGame();
  const animated = useStudioMotion();
  const progress = engineProgress(project);
  const phase = enginePhase(progress);
  const speed = engineSpeed(s, project.team);
  const daysLeft = Math.max(
    1,
    Math.ceil((project.work - project.done) / speed),
  );
  const docked = dockedModules(project);
  const Icon = PROFILE_ICONS[project.profile];
  let cumulative = 0;
  return (
    <Card className="forge-panel">
      <div className="forge-visual">
        <EngineCore s={s} project={project} animated={animated} />
        <ul className="forge-legend">
          {project.modules.map((id, i) => (
            <li key={id} className={i < docked ? "docked" : ""}>
              <b>{i < docked ? "✓" : i + 1}</b>
              {techById(id)?.name}
            </li>
          ))}
        </ul>
      </div>
      <div className="forge-info">
        <span className="eyebrow">ENGINE-SCHMIEDE · IN ENTWICKLUNG</span>
        <h2>
          {project.name}
          {versionLabel(project.version)}
        </h2>
        <span className="engine-profile">
          <Icon size={12} /> {ENGINE_PROFILES[project.profile].name}
        </span>
        <ol className="forge-phases">
          {ENGINE_PHASES.map((p, i) => {
            const start = cumulative;
            cumulative += p.share * 100;
            const local = Math.min(
              100,
              Math.max(0, ((progress - start) / (p.share * 100)) * 100),
            );
            return (
              <li
                key={p.name}
                className={i < phase ? "done" : i === phase ? "active" : ""}
              >
                <span className="forge-step">
                  {i < phase ? <Check size={11} /> : i + 1}
                </span>
                <div>
                  <strong>{p.name}</strong>
                  <small>{p.text}</small>
                  {i === phase && (
                    <span className="forge-step-bar">
                      <span style={{ width: `${local}%` }} />
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <div className="forge-stats">
          <div>
            <Timer size={14} />
            <strong>≈{daysLeft}</strong>
            <span>Tage</span>
          </div>
          <div>
            <ShieldCheck size={14} />
            <strong>{Math.round(project.stability)}%</strong>
            <span>Stabilität</span>
          </div>
          <div>
            <Cpu size={14} />
            <strong>
              {docked}/{project.modules.length}
            </strong>
            <span>Module</span>
          </div>
        </div>
        <div className="forge-team">
          {s.employees
            .filter((e) => project.team.includes(e.id))
            .map((e) => (
              <span
                key={e.id}
                title={`${e.name} · Technik ${Math.round(e.skills.programming)}`}
              >
                <b>{initials(e.name)}</b>
                {e.name.split(" ")[0]}
              </span>
            ))}
          <button
            type="button"
            className="forge-cancel"
            onClick={store.cancelEngine}
          >
            <X size={13} /> Abbrechen
          </button>
        </div>
      </div>
    </Card>
  );
}

function EngineCard({
  s,
  engine,
  onUpgrade,
}: {
  s: GameState;
  engine: Engine;
  onUpgrade: (e: Engine) => void;
}) {
  const store = useGame();
  const animated = useStudioMotion();
  const fresh = engine.created !== undefined && s.day - engine.created < 20;
  const missing = missingModules(s, engine);
  const income = licenseIncome(s, { ...engine, licensed: true });
  const bonus = engineBonus(s, engine.id);
  const Icon = engine.profile ? PROFILE_ICONS[engine.profile] : Cpu;
  const canLicense = engine.level >= ENGINE.licenseMinLevel;
  return (
    <motion.div
      initial={animated && fresh ? { opacity: 0, scale: 0.9, y: 14 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`engine-card card ${fresh ? "fresh" : ""} ${engine.licensed ? "licensed" : ""}`}
    >
      {fresh && <span className="engine-new">NEU</span>}
      <div className="engine-card-head">
        <span className="engine-level">
          <small>LVL</small>
          {engine.level}
        </span>
        <div>
          <h3>
            {engine.name}
            {versionLabel(engine.version)}
          </h3>
          <span className="engine-profile">
            <Icon size={11} />
            {engine.profile ? ENGINE_PROFILES[engine.profile].short : "Basis"}
            {engine.created !== undefined &&
              ` · ${date(engine.created).getUTCFullYear()}`}
          </span>
        </div>
      </div>
      <ul className="engine-perks">
        <li>
          <Sparkles size={12} /> +{engine.level * 2} Qualität
          {engine.profile &&
            ENGINE_PROFILES[engine.profile].focus &&
            ` · +${ENGINE.profileBonus} bei ${DESIGN_FOCUS[ENGINE_PROFILES[engine.profile].focus!].name}`}
          {engine.profile === "allround" && ` · +${ENGINE.allroundBonus} immer`}
        </li>
        <li>
          <Timer size={12} /> Routine −{Math.round(bonus.routine * 100)} %
          Entwicklungszeit <em>({engine.games ?? 0} Spiele)</em>
        </li>
        {engine.stability !== undefined && (
          <li>
            <ShieldCheck size={12} /> Stabilität{" "}
            {Math.round(engine.stability ?? 0)} % · −
            {Math.round(bonus.bugs * 100)} % Bugs
          </li>
        )}
      </ul>
      <div className="engine-modules">
        {engine.modules.map((m) => (
          <span key={m}>{techById(m)?.name ?? m}</span>
        ))}
      </div>
      {missing.length > 0 && (
        <button
          type="button"
          className="engine-upgrade"
          onClick={() => onUpgrade(engine)}
          disabled={!!s.engineProject}
        >
          <ArrowUp size={13} />
          {missing.length} neue{missing.length === 1 ? "s" : ""} Modul
          {missing.length === 1 ? "" : "e"} · Upgrade auf v
          {(engine.version ?? 1) + 1}
        </button>
      )}
      <div className="engine-license">
        <button
          type="button"
          role="switch"
          aria-checked={!!engine.licensed}
          disabled={!canLicense}
          onClick={() => store.toggleLicense(engine.id)}
          className="engine-switch"
        >
          <span />
        </button>
        <div>
          <strong>
            <Handshake size={12} /> Lizenzieren
          </strong>
          <small>
            {canLicense
              ? `≈ ${money(income)} / Monat · −${ENGINE.exclusivityPenalty} Qualität für eigene Spiele`
              : `Ab Level ${ENGINE.licenseMinLevel} gefragt`}
          </small>
        </div>
        {(engine.licenseRevenue ?? 0) > 0 && (
          <span className="engine-earned">{money(engine.licenseRevenue!)}</span>
        )}
      </div>
    </motion.div>
  );
}

export default function TechnologyView() {
  const store = useGame();
  const s = store.game;
  const modules = availableModules(s);
  const free = s.employees.filter((e) => !isAssigned(s, e.id));
  const designerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<EngineInput>(() => ({
    name: "",
    baseId: null,
    profile: "allround",
    modules: modules.map((t) => t.id),
    team: [...free]
      .sort((a, b) => b.skills.programming - a.skills.programming)
      .slice(0, 1)
      .map((e) => e.id),
  }));
  const update = <K extends keyof EngineInput>(key: K, value: EngineInput[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  // Only free employees count; assigned ones drop out automatically.
  const team = draft.team.filter((id) => free.some((e) => e.id === id));
  const input = { ...draft, team };
  const plan = enginePlan(s, input);
  const base = s.engines.find((e) => e.id === draft.baseId);
  const monthly = s.engines.reduce((n, e) => n + licenseIncome(s, e), 0);
  const total = s.engines.reduce((n, e) => n + (e.licenseRevenue ?? 0), 0);
  const blocker = !draft.name.trim()
    ? "Gib deiner Engine einen Namen."
    : !team.length
      ? free.length
        ? "Wähle mindestens ein Teammitglied."
        : "Alle Mitarbeiter sind gerade in Projekten."
      : s.company.cash < plan.cost
        ? `Dir fehlen ${money(plan.cost - s.company.cash)}.`
        : null;
  const ready = !s.engineProject && !blocker;

  const upgrade = (e: Engine) => {
    setDraft({
      name: e.name,
      baseId: e.id,
      profile: e.profile ?? "allround",
      modules: modules.map((t) => t.id),
      team: draft.team.filter((id) => !isAssigned(s, id)),
    });
    designerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="engine-view">
      <Card className="engine-hud">
        <div>
          <span>Engines</span>
          <strong>{s.engines.length}</strong>
        </div>
        <div>
          <span>Bestes Level</span>
          <strong>{Math.max(...s.engines.map((e) => e.level))}</strong>
        </div>
        <div>
          <span>Lizenzen / Monat</span>
          <strong className={monthly ? "positive" : ""}>
            {money(monthly)}
          </strong>
        </div>
        <div>
          <span>Lizenzumsatz gesamt</span>
          <strong>{money(total)}</strong>
        </div>
      </Card>

      {s.engineProject ? (
        <ForgePanel s={s} project={s.engineProject} />
      ) : (
        <div ref={designerRef}>
          <Card className="engine-designer">
            <div className="engine-designer-head">
              <div>
                <span className="eyebrow">NEUE ENGINE ENTWERFEN</span>
                <h2>
                  {base
                    ? `Upgrade: ${base.name} v${plan.version}`
                    : "Deine eigene Technologie."}
                </h2>
                <p>
                  Programmierer bauen in fünf Phasen ein Framework aus deinen
                  erforschten Modulen. Jede Engine verbessert Qualität, Tempo
                  und Stabilität deiner Spiele – und lässt sich an andere
                  Studios lizenzieren.
                </p>
              </div>
            </div>

            <div className="engine-form">
              <label>
                Name
                <input
                  maxLength={36}
                  placeholder="Name deiner Engine"
                  value={draft.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </label>
              <label>
                Grundlage
                <GameSelect
                  label="Engine-Grundlage"
                  value={draft.baseId ?? ""}
                  onChange={(value) => {
                    const b = s.engines.find((x) => x.id === value);
                    setDraft((d) => {
                      const previous = s.engines.find((x) => x.id === d.baseId);
                      return {
                        ...d,
                        baseId: b?.id ?? null,
                        name: b
                          ? b.name
                          : previous && d.name === previous.name
                            ? ""
                            : d.name,
                        profile: b?.profile ?? d.profile,
                        modules: b ? modules.map((t) => t.id) : d.modules,
                      };
                    });
                  }}
                  options={[
                    { value: "", label: "Neuentwicklung" },
                    ...s.engines.map((engine) => ({
                      value: engine.id,
                      label: `Upgrade von ${engine.name}${versionLabel(engine.version)}`,
                      description: `Level ${engine.level} · −40 % Aufwand`,
                    })),
                  ]}
                />
              </label>
            </div>

            <span className="engine-label">Profil</span>
            <div className="engine-profiles">
              {(Object.keys(ENGINE_PROFILES) as EngineProfile[]).map((p) => {
                const Icon = PROFILE_ICONS[p];
                return (
                  <button
                    type="button"
                    key={p}
                    className={draft.profile === p ? "selected" : ""}
                    onClick={() => update("profile", p)}
                    aria-pressed={draft.profile === p}
                  >
                    <Icon size={18} />
                    <strong>{ENGINE_PROFILES[p].name}</strong>
                    <small>{ENGINE_PROFILES[p].description}</small>
                  </button>
                );
              })}
            </div>

            <span className="engine-label">
              Module <em>{draft.modules.length} gewählt</em>
            </span>
            <div className="engine-module-picker">
              {ENGINE_MODULES.map((t) => {
                const researched = modules.includes(t);
                const on = draft.modules.includes(t.id);
                const inBase = base?.modules.includes(t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    disabled={!researched}
                    className={`${on ? "selected" : ""} ${researched ? "" : "locked"}`}
                    aria-pressed={on}
                    onClick={() =>
                      update(
                        "modules",
                        on
                          ? draft.modules.filter((id) => id !== t.id)
                          : [...draft.modules, t.id],
                      )
                    }
                    title={
                      researched
                        ? t.description
                        : "Erst in der Forschung freischalten"
                    }
                  >
                    {researched ? (
                      on ? (
                        <Check size={12} />
                      ) : (
                        <Cpu size={12} />
                      )
                    ) : (
                      <Lock size={12} />
                    )}
                    <span>{t.name}</span>
                    <b>
                      {researched
                        ? inBase
                          ? "vorhanden"
                          : `+${t.effects.engine} Lvl`
                        : "Forschung"}
                    </b>
                  </button>
                );
              })}
            </div>

            <span className="engine-label">
              Team <em>max. {ENGINE.maxTeam} · Technik zählt</em>
            </span>
            <div className="engine-team-picker">
              {free.length === 0 && (
                <p className="hint">
                  Alle Teammitglieder sind gerade zugewiesen.
                </p>
              )}
              {free.map((e) => {
                const on = draft.team.includes(e.id);
                return (
                  <button
                    type="button"
                    key={e.id}
                    className={on ? "selected" : ""}
                    aria-pressed={on}
                    disabled={!on && team.length >= ENGINE.maxTeam}
                    onClick={() =>
                      update(
                        "team",
                        on
                          ? team.filter((id) => id !== e.id)
                          : [...team, e.id],
                      )
                    }
                  >
                    <b>{initials(e.name)}</b>
                    <span>
                      {e.name}
                      <small>
                        {e.role} · Technik {Math.round(e.skills.programming)}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="engine-summary">
              <div className="engine-summary-level">
                <span>Ziel-Level</span>
                <strong>{plan.level}</strong>
                <small>+{plan.level * 2} Qualität</small>
              </div>
              <div>
                <Timer size={14} />
                <strong>
                  {Number.isFinite(plan.days) ? `≈${plan.days}` : "–"}
                </strong>
                <span>Tage</span>
              </div>
              <div>
                <ShieldCheck size={14} />
                <strong>{plan.stability}%</strong>
                <span>Stabilität</span>
              </div>
              <div className={s.company.cash < plan.cost ? "short" : ""}>
                <Coins size={14} />
                <strong>{money(plan.cost)}</strong>
                <span>Kosten</span>
              </div>
              <Button
                disabled={!ready}
                onClick={() => {
                  if (store.startEngine(input))
                    setDraft((d) => ({ ...d, name: "", baseId: null }));
                }}
              >
                <Cpu size={15} /> Entwicklung starten
              </Button>
            </div>
            {blocker && <p className="engine-blocker">{blocker}</p>}
          </Card>
        </div>
      )}

      <div className="engine-library-title">
        <h3>Deine Engines</h3>
        <span>Wähle sie im Produktionsplan für neue Spiele.</span>
      </div>
      <div className="engine-library">
        {[...s.engines].reverse().map((e) => (
          <EngineCard key={e.id} s={s} engine={e} onUpgrade={upgrade} />
        ))}
      </div>
    </div>
  );
}
