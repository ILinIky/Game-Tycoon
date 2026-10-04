import { sequelPlan, SEQUEL_MIN_SCORE } from "../game/projects/franchise";
import { publisherOffers } from "../game/contracts/contracts";
import { EXCLUSIVE_BONUS } from "../game/hardware/consoles";
import {
  allPlatforms,
  availablePlatforms,
  isOwnPlatform,
  platformShare,
  platformStatus,
} from "../game/market/platforms";
import { scaled } from "../game/economy/scale";
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStudioMotion } from "./game/GameMotion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Monitor,
  Sparkles,
  Lightbulb,
  Code2,
  Palette,
  Zap,
  Trash2,
  Save,
  ListPlus,
  Repeat2,
  Lock,
} from "lucide-react";
import { useGame } from "../store/gameStore";
import type { MarketingPlan, ProjectInput } from "../game/types";
import {
  BALANCE,
  GENRES,
  THEMES,
  OFFICES,
  SIZES,
  sizeLabel,
} from "../game/config/balance";
import { PRICE_LEVELS, priceLevel } from "../game/projects/pricing";
import {
  MARKETING_KEYS,
  MARKETING_PLANS,
  marketingBudget,
} from "../game/marketing/campaigns";
import { money } from "../game/utils";
import { projectCost, projectDuration } from "../game/projects/projects";
import { engineBonus, isAssigned } from "../game/engines/engines";
import { DESIGN_FOCUS, AMBITIONS } from "../game/config/design";
import { GAME_FEATURES } from "../game/config/features";
import { Modal, Button, Badge } from "./ui";
import GameSelect from "./game/GameSelect";
import { applyProductionPreset } from "../game/projects/presets";
import { MAX_PRODUCTION_QUEUE, validQueuedInput } from "../game/projects/queue";
export default function ProjectWizard({
  onClose,
  sequelOf = null,
}: {
  onClose: () => void;
  sequelOf?: string | null;
}) {
  const { game: s, project, savePreset, removePreset, queuePreset } = useGame();
  const [step, setStep] = useState(0);
  const [quick, setQuick] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetFeedback, setPresetFeedback] = useState("");
  const [presetIssues, setPresetIssues] = useState<string[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [queueMode, setQueueMode] = useState(false);
  const [queueNames, setQueueNames] = useState("");
  const [autoRelease, setAutoRelease] = useState(true);
  const [queueFeedback, setQueueFeedback] = useState("");
  const queueField = useRef<HTMLTextAreaElement>(null);
  const animated = useStudioMotion();
  const focusPage = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      requestAnimationFrame(() => {
        if (!node.isConnected) return;
        const dialog = node.closest<HTMLElement>(".modal");
        if (dialog) dialog.scrollTop = 0;
        if (step > 0) {
          const heading = node.querySelector<HTMLElement>("h3");
          if (heading) {
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
          }
        }
      });
    },
    [step],
  );
  const free = s.employees.filter((e) => !isAssigned(s, e.id));
  const initialSequel = sequelOf ? sequelPlan(s, sequelOf) : null;
  const [input, setInput] = useState<ProjectInput>({
    name: initialSequel?.eligible ? initialSequel.name : "",
    genre: initialSequel?.eligible ? initialSequel.base.genre : "Strategie",
    theme: initialSequel?.eligible ? initialSequel.base.theme : "Weltraum",
    platforms: ["pc"],
    audience: "Teen",
    size: initialSequel?.eligible ? initialSequel.base.size : "Indie",
    team: free.slice(0, 1).map((e) => e.id),
    engine: s.engines[0].id,
    designFocus: initialSequel?.base.designFocus ?? "systems",
    ambition: "balanced",
    sequelOf: initialSequel?.eligible ? initialSequel.base.id : undefined,
    priceFactor: 1,
    marketing: "basic",
    features: [],
  });
  const sequel = input.sequelOf ? sequelPlan(s, input.sequelOf) : null;
  // Only the newest entry of each series can be continued.
  const sequelBases = s.games.filter(
    (g) =>
      g.score >= SEQUEL_MIN_SCORE &&
      !s.games.some(
        (x) =>
          x.franchise === (g.franchise ?? g.id) &&
          (x.entry ?? 1) > (g.entry ?? 1),
      ),
  );
  const offers = publisherOffers(
    s,
    projectCost(s, { ...input, publisher: undefined }),
  );
  const chooseSequel = (id: string) => {
    const plan = id ? sequelPlan(s, id) : null;
    setInput((p) =>
      plan
        ? {
            ...p,
            sequelOf: plan.base.id,
            name: plan.name,
            genre: plan.base.genre,
            theme: plan.base.theme,
          }
        : {
            ...p,
            sequelOf: undefined,
            name: sequel && p.name === sequel.name ? "" : p.name,
          },
    );
  };
  const update = <K extends keyof ProjectInput>(
    key: K,
    value: ProjectInput[K],
  ) => setInput((p) => ({ ...p, [key]: value }));
  const selectedPreset = s.productionPresets?.find(
    (preset) => preset.id === selectedPresetId,
  );
  const plan =
    queueMode && selectedPreset
      ? {
          ...input,
          ...selectedPreset.settings,
          name: input.name,
          genre: input.genre,
        }
      : input;
  const titles = queueNames
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
  const queued = s.productionQueue?.length ?? 0;
  const queueReady =
    !!selectedPreset &&
    titles.length > 0 &&
    titles.length + queued <= MAX_PRODUCTION_QUEUE &&
    titles.every((name) => validQueuedInput({ ...plan, name })) &&
    plan.team.every((id) =>
      s.employees.some((employee) => employee.id === id),
    ) &&
    s.engines.some((engine) => engine.id === plan.engine);
  const cost = projectCost(s, plan);
  const marketing = marketingBudget(s, plan.marketing);
  const ready =
    s.company.office >= SIZES[input.size].office &&
    input.name.trim().length > 0 &&
    input.platforms.length > 0 &&
    input.team.length >= SIZES[input.size].team &&
    input.team.every((id) => free.some((employee) => employee.id === id)) &&
    s.projects.length < BALANCE.maxProjects &&
    s.company.cash >= cost;
  return (
    <Modal
      title="Neues Spiel · Produktionsplan"
      className={`project-wizard ${quick ? "project-quick" : ""} ${queueMode ? "project-queue" : ""}`}
      wide
      onClose={onClose}
    >
      <div className={`wizard-steps ${quick ? "quick-mode" : ""}`}>
        {["Idee", "Spieldesign", "Produktion", "Team"].map((t, i) => (
          <span
            key={t}
            className={step === i ? "current" : step > i ? "done" : ""}
          >
            <b>{step > i ? <Check size={14} /> : `0${i + 1}`}</b>
            {t}
          </span>
        ))}
      </div>
      {step === 0 && (
        <section
          className="production-shortcuts"
          aria-label="Gespeicherte Produktionsvorlagen"
        >
          <div className="shortcut-heading">
            <span>
              <Zap size={14} /> DEINE PRODUKTIONSVORLAGEN
            </span>
            <small>{(s.productionPresets ?? []).length}/8</small>
          </div>
          {s.productionPresets?.length ? (
            <div className="shortcut-grid">
              {s.productionPresets.map((preset) => (
                <div
                  className={`shortcut-item ${quick && presetName === preset.name ? "selected" : ""}`}
                  key={preset.id}
                >
                  <button
                    onClick={() => {
                      const applied = applyProductionPreset(s, preset, input);
                      setInput(applied.input);
                      setPresetIssues(applied.issues);
                      setPresetName(preset.name);
                      setSelectedPresetId(preset.id);
                      setQueueFeedback("");
                      setPresetFeedback("");
                      setQuick(true);
                    }}
                    aria-label={`Vorlage ${preset.name} anwenden`}
                  >
                    <strong>{preset.name}</strong>
                    <small>
                      {sizeLabel(preset.settings.size)} ·{" "}
                      {preset.settings.platforms.length} Plattform
                      {preset.settings.platforms.length !== 1
                        ? "en"
                        : ""} · {preset.settings.team.length} Team
                    </small>
                  </button>
                  <button
                    className="shortcut-delete"
                    aria-label={`Vorlage ${preset.name} entfernen`}
                    onClick={() => {
                      removePreset(preset.id);
                      if (presetName === preset.name) {
                        setQuick(false);
                        setPresetName("");
                        setSelectedPresetId(null);
                        setQueueMode(false);
                      }
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p>
              Speichere deinen Plan im Team-Schritt. Beim nächsten Spiel reichen
              Titel und Genre.
            </p>
          )}
          {quick && (
            <div className="quick-plan">
              <span>
                <Check size={13} /> {presetName}
                <small>
                  {plan.theme} · {sizeLabel(plan.size)} ·{" "}
                  {s.engines.find((engine) => engine.id === plan.engine)?.name}{" "}
                  · Preis {priceLevel(plan.priceFactor).label} ·{" "}
                  {MARKETING_PLANS[plan.marketing ?? "none"].label}
                  {plan.features?.length
                    ? ` · ${plan.features.length} Extras`
                    : ""}
                  <br />
                  {plan.platforms
                    .map(
                      (id) =>
                        allPlatforms(s).find((platform) => platform.id === id)
                          ?.name,
                    )
                    .join(", ")}{" "}
                  · Team:{" "}
                  {plan.team
                    .map(
                      (id) =>
                        s.employees.find((employee) => employee.id === id)
                          ?.name,
                    )
                    .join(", ") || "Kein verfügbares Team"}
                </small>
              </span>
              <button
                onClick={() => {
                  setQuick(false);
                  setQueueMode(false);
                  setStep(1);
                }}
              >
                Plan anpassen
              </button>
            </div>
          )}
          {quick && (
            <div
              className="production-mode"
              role="group"
              aria-label="Produktionsmodus"
            >
              <button
                aria-pressed={!queueMode}
                onClick={() => {
                  setQueueMode(false);
                  setQueueFeedback("");
                }}
              >
                <Zap size={13} /> Direktstart
              </button>
              <button
                aria-pressed={queueMode}
                onClick={() => {
                  if (!queueMode && input.name) setQueueNames(input.name);
                  setQueueMode(true);
                  setQueueFeedback("");
                }}
              >
                <ListPlus size={13} /> Warteschlange <b>{queued}</b>
              </button>
            </div>
          )}
          {quick && !queueMode && presetIssues.length > 0 && (
            <p className="preset-warning" role="status">
              {presetIssues.join(" ")}
            </p>
          )}
        </section>
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          ref={focusPage}
          initial={animated ? { opacity: 0, x: 24 } : false}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ duration: animated ? 0.17 : 0 }}
        >
          {step === 0 && (
            <div className="wizard-body">
              <div className="form-intro">
                <Sparkles size={24} />
                <h3>Jedes große Spiel beginnt mit einer Idee.</h3>
                <p>Finde die kreative Richtung für dein nächstes Projekt.</p>
              </div>
              {queueMode ? (
                <>
                  <label>
                    Spieletitel
                    <textarea
                      ref={queueField}
                      aria-label="Spieletitel für Warteschlange"
                      rows={3}
                      maxLength={2500}
                      placeholder={"Orbit One\nOrbit Two\nOrbit Three"}
                      value={queueNames}
                      onChange={(event) => {
                        setQueueNames(event.target.value);
                        setQueueFeedback("");
                      }}
                    />
                  </label>
                  <p className="queue-input-hint">
                    Ein Titel pro Zeile · maximal 48 Zeichen pro Titel ·{" "}
                    {titles.length} Spiele · {queued}/{MAX_PRODUCTION_QUEUE}{" "}
                    Plätze belegt
                  </p>
                </>
              ) : (
                <label>
                  Projekttitel
                  <input
                    autoFocus
                    maxLength={48}
                    placeholder="Wie heißt dein nächstes Spiel?"
                    value={input.name}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </label>
              )}
              {!queueMode && sequelBases.length > 0 && (
                <label>
                  Marke
                  <GameSelect
                    label="Marke"
                    value={input.sequelOf ?? ""}
                    onChange={chooseSequel}
                    options={[
                      {
                        value: "",
                        label: "Neue Marke",
                        description: "Eine frische Idee",
                      },
                      ...sequelBases.map((g) => ({
                        value: g.id,
                        label: `Fortsetzung von ${g.name}`,
                        description: `${g.genre} · ${g.score.toFixed(1)} / 10`,
                      })),
                    ]}
                  />
                </label>
              )}
              {sequel && (
                <div className="sequel-card">
                  <span className="sequel-entry">Teil {sequel.entry}</span>
                  <div>
                    <strong>{sequel.base.name} geht weiter</strong>
                    <small>
                      +{sequel.hype} Start-Hype ·{" "}
                      {sequel.quality >= 0
                        ? `+${sequel.quality}`
                        : sequel.quality}{" "}
                      Qualität
                      {sequel.fatigue > 0 && " (Serienmüdigkeit)"} · +
                      {Math.round((sequel.sales - 1) * 100)} % Verkäufe
                    </small>
                  </div>
                </div>
              )}
              {queueMode ? (
                <label className="queue-genre">
                  Genre für alle Titel
                  <GameSelect
                    label="Genre für alle Titel"
                    value={input.genre}
                    onChange={(genre) =>
                      update("genre", genre as ProjectInput["genre"])
                    }
                    options={GENRES.map((genre) => ({
                      value: genre,
                      label: genre,
                      disabled: !!sequel && genre !== input.genre,
                    }))}
                  />
                </label>
              ) : (
                <>
                  <label>Genre</label>
                  <div className="choice-grid">
                    {GENRES.map((g) => (
                      <button
                        key={g}
                        className={`choice ${input.genre === g ? "selected" : ""}`}
                        disabled={!!sequel && g !== input.genre}
                        onClick={() => update("genre", g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {queueMode && (
                <div className="queue-options">
                  <button
                    className="queue-auto-release"
                    role="switch"
                    aria-label="Automatisch veröffentlichen"
                    aria-checked={autoRelease}
                    onClick={() => setAutoRelease(!autoRelease)}
                  >
                    <Repeat2 size={18} />
                    <span>
                      <strong>Automatisch veröffentlichen</strong>
                      <small>
                        {autoRelease
                          ? "Fertige Spiele erscheinen automatisch. Das nächste Spiel rückt sofort nach."
                          : "Du veröffentlichst fertige Spiele selbst. Das Team wartet bis zum Release."}{" "}
                        Marketing der Vorlage:{" "}
                        {MARKETING_PLANS[plan.marketing ?? "none"].label} ·
                        Preis {priceLevel(plan.priceFactor).label}.
                      </small>
                    </span>
                    <i className={autoRelease ? "on" : ""}>
                      <b />
                    </i>
                  </button>
                  <p>
                    Alle Titel übernehmen diese Vorlage und das gewählte Genre.
                    Belegte Teams und fehlendes Budget warten automatisch;
                    bezahlt wird erst beim Start.
                  </p>
                  {s.productionQueuePaused && (
                    <p className="queue-input-warning">
                      Deine Warteschlange ist pausiert. Setze sie links im
                      Studio oder unter Entwicklung fort.
                    </p>
                  )}
                  {titles.some((name) => name.length > 48) && (
                    <p className="queue-input-warning">
                      Ein Titel ist länger als 48 Zeichen. Kürze ihn vor dem
                      Einplanen.
                    </p>
                  )}
                  {titles.length + queued > MAX_PRODUCTION_QUEUE && (
                    <p className="queue-input-warning">
                      Es passen noch {MAX_PRODUCTION_QUEUE - queued} Spiele in
                      die Warteschlange.
                    </p>
                  )}
                  {queueFeedback && (
                    <p role="status" className="queue-success">
                      {queueFeedback}
                    </p>
                  )}
                </div>
              )}
              {!quick && (
                <>
                  <label>
                    Thema
                    <GameSelect
                      label="Thema"
                      value={input.theme}
                      onChange={(value) => update("theme", value)}
                      options={THEMES.map((theme) => ({
                        value: theme,
                        label: theme,
                      }))}
                    />
                  </label>
                  <p className="hint">
                    Genre und Thema beeinflussen das Spielerlebnis. Welche
                    Kombinationen funktionieren, lernst du durch deine Releases.
                  </p>
                </>
              )}
            </div>
          )}
          {step === 1 && (
            <div className="wizard-body">
              <div className="form-intro">
                <h3>Was sollen deine Spieler fühlen?</h3>
                <p>
                  Wähle einen Schwerpunkt und ein Risiko, das dein Team tragen
                  kann.
                </p>
              </div>
              <label>Designschwerpunkt</label>
              <div className="design-options">
                {Object.entries(DESIGN_FOCUS).map(([key, focus], i) => {
                  const Icon = [Lightbulb, Code2, Palette][i];
                  return (
                    <button
                      key={key}
                      className={`choice ${input.designFocus === key ? "selected" : ""}`}
                      aria-pressed={input.designFocus === key}
                      onClick={() =>
                        update(
                          "designFocus",
                          key as ProjectInput["designFocus"],
                        )
                      }
                    >
                      <Icon size={22} />
                      <strong>{focus.name}</strong>
                      <small>{focus.description}</small>
                    </button>
                  );
                })}
              </div>
              <label>Ambition</label>
              <div className="design-options">
                {Object.entries(AMBITIONS).map(([key, ambition]) => (
                  <button
                    key={key}
                    className={`choice ${input.ambition === key ? "selected" : ""}`}
                    aria-pressed={input.ambition === key}
                    onClick={() =>
                      update("ambition", key as ProjectInput["ambition"])
                    }
                  >
                    <strong>{ambition.name}</strong>
                    <small>{ambition.description}</small>
                  </button>
                ))}
              </div>
              <p className="design-note">
                Ein Experiment braucht ein Team mit mindestens 65 gewichteten
                Fähigkeitspunkten für einen Qualitätsbonus. Schwächere Teams
                riskieren einen Abzug. Dein Designschwerpunkt bestimmt, welche
                Fähigkeiten besonders zählen.
              </p>
              <label>Produktionsextras</label>
              <div className="design-options feature-options">
                {GAME_FEATURES.map((feature) => {
                  const on = input.features?.includes(feature.id) ?? false;
                  const parts = [
                    `+${Math.round((feature.cost - 1) * 100)} % Budget`,
                    feature.days > 1
                      ? `+${Math.round((feature.days - 1) * 100)} % Zeit`
                      : "",
                    feature.sales > 1
                      ? `+${Math.round((feature.sales - 1) * 100)} % Verkäufe`
                      : "",
                    feature.quality ? `+${feature.quality} Qualität` : "",
                    feature.hype ? `+${feature.hype} Hype` : "",
                    feature.bugs < 1
                      ? `−${Math.round((1 - feature.bugs) * 100)} % Bugs`
                      : feature.bugs > 1
                        ? `+${Math.round((feature.bugs - 1) * 100)} % Bugs`
                        : "",
                  ].filter(Boolean);
                  return (
                    <button
                      key={feature.id}
                      className={`choice feature-choice ${on ? "selected" : ""}`}
                      aria-pressed={on}
                      onClick={() =>
                        update(
                          "features",
                          on
                            ? (input.features ?? []).filter(
                                (id) => id !== feature.id,
                              )
                            : [...(input.features ?? []), feature.id],
                        )
                      }
                    >
                      <strong>
                        {on && <Check size={13} />} {feature.name}
                      </strong>
                      <small>{feature.description}</small>
                      <em>{parts.join(" · ")}</em>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="wizard-body">
              <label>Zielplattformen</label>
              <div className="platform-options">
                {availablePlatforms(s).map((p) => (
                  <button
                    key={p.id}
                    className={`choice platform-choice ${input.platforms.includes(p.id) ? "selected" : ""}`}
                    onClick={() =>
                      update(
                        "platforms",
                        input.platforms.includes(p.id)
                          ? input.platforms.filter((id) => id !== p.id)
                          : [...input.platforms, p.id],
                      )
                    }
                  >
                    <Monitor size={23} />
                    <strong>{p.name}</strong>
                    <span>
                      {Math.round(platformShare(p, s.day))} Marktgewicht ·{" "}
                      {isOwnPlatform(p.id)
                        ? "Eigene Konsole"
                        : s.licenses.includes(p.id)
                          ? "Lizenziert"
                          : money(scaled(s, p.license))}
                    </span>
                    {isOwnPlatform(p.id) && (
                      <em className="platform-tag launch">
                        Exklusiv +{Math.round(EXCLUSIVE_BONUS * 100)} %
                      </em>
                    )}
                    {platformStatus(p, s.day) === "launch" && (
                      <em className="platform-tag launch">
                        Launch-Titel +30 %
                      </em>
                    )}
                    {platformStatus(p, s.day) === "fading" && (
                      <em className="platform-tag fading">Läuft aus</em>
                    )}
                  </button>
                ))}
              </div>
              <div className="form-row production-fields">
                <label>
                  Zielgruppe
                  <GameSelect
                    label="Zielgruppe"
                    value={input.audience}
                    onChange={(value) => update("audience", value)}
                    options={[
                      { value: "Everyone", label: "Alle Altersgruppen" },
                      { value: "Teen", label: "Jugendliche" },
                      { value: "Mature", label: "Erwachsene" },
                    ]}
                  />
                </label>
                <label>
                  Engine
                  <GameSelect
                    label="Engine"
                    value={input.engine}
                    onChange={(value) => update("engine", value)}
                    options={s.engines.map((engine) => ({
                      value: engine.id,
                      label: `${engine.name}${(engine.version ?? 1) > 1 ? ` v${engine.version}` : ""}`,
                      description: `Level ${engine.level} · +${Math.round(engineBonus(s, engine.id, input.designFocus).quality)} Qualität`,
                    }))}
                  />
                </label>
              </div>
              <label>Projektumfang</label>
              <div className="choice-grid sizes">
                {(Object.keys(SIZES) as ProjectInput["size"][]).map((name) => {
                  const spec = SIZES[name];
                  const locked = s.company.office < spec.office;
                  return (
                    <button
                      className={`choice size-choice ${input.size === name ? "selected" : ""}`}
                      key={name}
                      disabled={locked}
                      aria-pressed={input.size === name}
                      onClick={() => update("size", name)}
                    >
                      <strong>{spec.label}</strong>
                      <em>{spec.tagline}</em>
                      <small>
                        {money(
                          projectCost(s, {
                            ...input,
                            size: name,
                            platforms: [],
                          }),
                        )}{" "}
                        · {projectDuration(s, { ...input, size: name })}{" "}
                        Arbeitstage
                        <br />
                        ab {spec.team} Teammitgliedern
                        <br />
                        Verkäufe ×{spec.sales.toLocaleString("de-DE")}
                      </small>
                      {locked && (
                        <span className="size-lock">
                          <Lock size={11} /> ab {OFFICES[spec.office].name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="form-row production-fields pricing-fields">
                <label>
                  Verkaufspreis
                  <GameSelect
                    label="Verkaufspreis"
                    value={String(input.priceFactor ?? 1)}
                    onChange={(value) => update("priceFactor", Number(value))}
                    options={PRICE_LEVELS.map((level) => ({
                      value: String(level.factor),
                      label: `${level.label} · ${money(Math.round(SIZES[input.size].price * level.factor))}`,
                      description: level.description,
                    }))}
                  />
                </label>
                <label>
                  Marketing
                  <GameSelect
                    label="Marketing"
                    value={input.marketing ?? "none"}
                    onChange={(value) =>
                      update("marketing", value as MarketingPlan)
                    }
                    options={MARKETING_KEYS.map((key) => ({
                      value: key,
                      label: MARKETING_PLANS[key].label,
                      description: `${MARKETING_PLANS[key].description}${
                        key === "none"
                          ? ""
                          : ` · ${key === "max" ? "bis " : ""}${money(marketingBudget(s, key))}`
                      }`,
                    }))}
                  />
                </label>
              </div>
              <p className="hint">
                Der Preis gilt ab Release und lässt sich im Spielearchiv ändern.
                Geplante Kampagnen laufen automatisch während der Entwicklung –
                auch für Spiele aus der Warteschlange.
              </p>
            </div>
          )}
          {step === 3 && (
            <div className="wizard-body">
              <div className="form-intro">
                <h3>Die richtigen Menschen machen den Unterschied.</h3>
                <p>
                  Das Team bleibt bis zum Release diesem Projekt zugewiesen.
                </p>
              </div>
              {free.length === 0 && (
                <p>
                  Alle Teammitglieder sind bereits zugewiesen. Veröffentliche
                  ein Projekt oder stelle neue Talente ein.
                </p>
              )}
              <div className="team-options">
                {free.map((e) => (
                  <button
                    className={`choice team-choice ${input.team.includes(e.id) ? "selected" : ""}`}
                    key={e.id}
                    onClick={() =>
                      update(
                        "team",
                        input.team.includes(e.id)
                          ? input.team.filter((id) => id !== e.id)
                          : [...input.team, e.id],
                      )
                    }
                  >
                    <span className="avatar">
                      {e.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                    <div>
                      <strong>{e.name}</strong>
                      <small>
                        {e.role} · Design {Math.round(e.skills.design)} ·
                        Technik {Math.round(e.skills.programming)} · Grafik{" "}
                        {Math.round(e.skills.art)} · Audio{" "}
                        {Math.round(e.skills.audio)}
                      </small>
                    </div>
                    {input.team.includes(e.id) && <Check size={18} />}
                  </button>
                ))}
              </div>
              <label>Veröffentlichung</label>
              <div className="publisher-options">
                <button
                  type="button"
                  className={`choice ${!input.publisher ? "selected" : ""}`}
                  onClick={() => update("publisher", undefined)}
                >
                  <strong>Selbst veröffentlichen</strong>
                  <small>Volles Risiko, 100 % des Umsatzes.</small>
                </button>
                {offers.map((o) => (
                  <button
                    type="button"
                    key={o.name}
                    disabled={o.locked}
                    className={`choice ${input.publisher?.name === o.name ? "selected" : ""}`}
                    onClick={() =>
                      update("publisher", {
                        name: o.name,
                        advance: o.advance,
                        share: o.share,
                        hype: o.hype,
                      })
                    }
                  >
                    <strong>{o.name}</strong>
                    <small>
                      {o.locked
                        ? `Ab Ruf ${o.reputation}`
                        : `${money(o.advance)} Vorschuss · ${Math.round(o.share * 100)} % Anteil · +${o.hype} Hype`}
                    </small>
                  </button>
                ))}
              </div>
              <div className="preset-save">
                <label>
                  Vorlagenname
                  <input
                    aria-label="Vorlagenname"
                    maxLength={28}
                    value={presetName}
                    placeholder="z. B. Mein Indie-Team"
                    onChange={(event) => {
                      setPresetName(event.target.value);
                      setPresetFeedback("");
                    }}
                  />
                </label>
                <Button
                  secondary
                  disabled={
                    !presetName.trim() ||
                    !input.platforms.length ||
                    input.team.length < SIZES[input.size].team
                  }
                  onClick={() => {
                    if (savePreset(presetName, input))
                      setPresetFeedback(
                        `„${presetName.trim()}“ gespeichert. Beim nächsten Spiel reichen Titel und Genre.`,
                      );
                  }}
                >
                  <Save size={14} /> Vorlage speichern
                </Button>
                {presetFeedback && <p role="status">{presetFeedback}</p>}
              </div>
              <div className="project-summary">
                <span>
                  {input.name || "Dein Spiel"}
                  <small>
                    {input.genre} / {input.theme} · {sizeLabel(input.size)}
                  </small>
                </span>
                <Badge>
                  {input.team.length} / {SIZES[input.size].team} Team
                </Badge>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="wizard-footer">
        <div>
          <small>
            {queueMode ? "Startbudget pro Spiel" : "Projektbudget"} ·{" "}
            {projectDuration(s, plan)} Arbeitstage
          </small>
          <strong className={s.company.cash < cost ? "negative" : ""}>
            {money(cost)}
          </strong>
          {marketing > 0 && (
            <small className="wizard-advance">
              + {plan.marketing === "max" ? "bis " : ""}
              {money(marketing)} Marketing
            </small>
          )}
          {input.publisher && (
            <small className="wizard-advance">
              +
              {money(
                offers.find((o) => o.name === input.publisher?.name)?.advance ??
                  0,
              )}{" "}
              Vorschuss
            </small>
          )}
        </div>
        <div className="button-row">
          {step > 0 && (
            <Button secondary onClick={() => setStep(step - 1)}>
              <ArrowLeft size={16} />
              Zurück
            </Button>
          )}
          {queueMode && quick && step === 0 ? (
            <>
              <Button secondary onClick={onClose}>
                Fertig
              </Button>
              <Button
                detail={`${titles.length} ${titles.length === 1 ? "Spiel" : "Spiele"}`}
                disabled={!queueReady}
                onClick={() => {
                  if (
                    selectedPreset &&
                    queuePreset(
                      selectedPreset.id,
                      titles,
                      input.genre,
                      autoRelease,
                    )
                  ) {
                    setQueueFeedback(
                      `${titles.length} ${titles.length === 1 ? "Spiel ist" : "Spiele sind"} eingeplant. Du kannst gleich weitere Titel eintragen.`,
                    );
                    setQueueNames("");
                    update("name", "");
                    queueField.current?.focus({ preventScroll: true });
                  }
                }}
              >
                <ListPlus size={14} /> Einplanen
              </Button>
            </>
          ) : quick && step === 0 ? (
            <Button
              disabled={!ready}
              onClick={() => {
                if (project(input)) onClose();
              }}
            >
              Direkt starten <Zap size={15} />
            </Button>
          ) : step < 3 ? (
            <Button
              disabled={
                step === 0
                  ? !input.name.trim()
                  : step === 2
                    ? !input.platforms.length
                    : false
              }
              onClick={() => setStep(step + 1)}
            >
              Weiter
              <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              disabled={!ready}
              onClick={() => {
                if (project(input)) onClose();
              }}
            >
              Entwicklung starten
              <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
