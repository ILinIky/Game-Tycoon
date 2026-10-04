import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import {
  Gamepad2,
  Users,
  FlaskConical,
  Cpu,
  Megaphone,
  Wallet,
  Globe2,
  ChartNoAxesCombined,
  Settings2,
  Plus,
  Bell,
  Pause,
  Play,
  Heart,
  Star,
  X,
  ArrowRight,
  Check,
  BookOpen,
  Building2,
  FolderKanban,
  Save,
  Sparkles,
  ChevronRight,
  AudioLines,
  Trophy,
} from "lucide-react";
import { useGame } from "./store/gameStore";
import { BALANCE, OFFICES } from "./game/config/balance";
import { money, number, dateLabel } from "./game/utils";
import type { ReleasedGame } from "./game/types";
import type { SceneTarget } from "./scene/studioRenderer";
import Management from "./components/Management";
import ProjectWizard from "./components/ProjectWizard";
import StudioWorld from "./components/game/StudioWorld";
import Inspector from "./components/game/Inspector";
import ReleaseShow from "./components/game/ReleaseShow";
import { Modal } from "./components/ui";
import { useGameSession } from "./hooks/useGameSession";
import { useStudioAudio } from "./hooks/useStudioAudio";
import { studioAudio } from "./audio/StudioAudio";
import GameMotion from "./components/game/GameMotion";
import StudioRadio from "./components/game/StudioRadio";
import ClickFeedback from "./components/game/ClickFeedback";
import SalesMonitor from "./components/game/SalesMonitor";
import TeamDock from "./components/game/TeamDock";
import { realtimeLighting, setRealtimeLighting } from "./scene/officeLife";
import ProductionDock from "./components/game/ProductionDock";
import ExpoShow from "./components/game/ExpoShow";
import YearReviewShow from "./components/game/YearReviewShow";
import { EXPO_DAY } from "./game/marketing/expo";
import type { ExpoResult, YearReview } from "./game/types";

type Show =
  | { kind: "expo"; key: string; result: ExpoResult }
  | { kind: "year"; key: string; review: YearReview };
const yearStartDay = (year: number) =>
  Math.round((Date.UTC(year, 0, 1) - Date.UTC(1990, 0, 1)) / 86_400_000);

const sections = [
  { page: "Projekte", title: "Entwicklung", icon: FolderKanban },
  { page: "Mitarbeiter", title: "Team & Talente", icon: Users },
  { page: "Aufträge", title: "Aufträge", icon: Briefcase },
  { page: "Forschung", title: "Forschung", icon: FlaskConical },
  { page: "Technologie", title: "Engines", icon: Cpu },
  { page: "Spiele", title: "Spielearchiv", icon: Gamepad2 },
  { page: "Marketing", title: "Marketing", icon: Megaphone },
  { page: "Studio", title: "Büroausbau", icon: Building2 },
  { page: "Markt", title: "Branche", icon: Globe2 },
  { page: "Weltrangliste", title: "Weltrangliste", icon: Trophy },
  { page: "Finanzen", title: "Finanzen", icon: Wallet },
  { page: "Statistiken", title: "Statistiken", icon: ChartNoAxesCombined },
  { page: "Journal", title: "Journal", icon: BookOpen },
  { page: "Firma", title: "Spielmenü", icon: Settings2 },
];
function initialMotion() {
  const preferred = !window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  try {
    const stored = localStorage.getItem("studio-zero-motion");
    return stored === "off" ? false : stored === "on" ? true : preferred;
  } catch {
    return preferred;
  }
}

function Founding({ onClose }: { onClose: () => void }) {
  const found = useGame((s) => s.found);
  const [name, setName] = useState("Evergreen Studio");
  const [founder, setFounder] = useState("Alex Weber");
  return (
    <Modal
      title="Ein neues Studio"
      className="founding-modal"
      onClose={onClose}
      wide
    >
      <div className="founding">
        <div className="founding-visual">
          <span className="founding-big-year">1990</span>
          <span className="eyebrow">KAPITEL 01</span>
          <h1>
            Alles beginnt
            <br />
            mit einer Idee.
          </h1>
          <p>
            Ein kleines Büro. Ein alter Computer.
            <br />
            Und dein erstes eigenes Spiel.
          </p>
          <div className="founding-line" />
          <span className="founding-year">DEINE GESCHICHTE BEGINNT HIER</span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            found(name, founder);
          }}
        >
          <span className="eyebrow">DEIN SPIELESTUDIO</span>
          <h2>
            Wie wird man sich
            <br />
            an dich erinnern?
          </h2>
          <label>
            Studioname
            <input
              autoFocus
              required
              maxLength={36}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Dein Name
            <input
              required
              maxLength={36}
              value={founder}
              onChange={(e) => setFounder(e.target.value)}
            />
          </label>
          <div className="founding-budget">
            <Wallet size={21} />
            <span>
              Startkapital<strong>{money(BALANCE.initialCash)}</strong>
            </span>
            <Check size={18} />
          </div>
          <button
            type="submit"
            className="game-action"
            disabled={!name.trim() || !founder.trim()}
          >
            Studio gründen <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </Modal>
  );
}

export default function App() {
  const { game: s, hydrated, error, speed, clearError } = useGame();
  const [menu, setMenu] = useState<string | null>(null);
  const [wizard, setWizard] = useState(false);
  const [sequel, setSequel] = useState<string | null>(null);
  const [founding, setFounding] = useState(false);
  const [employee, setEmployee] = useState<string | null>(null);
  const [project, setProject] = useState<string | null>(null);
  const [release, setRelease] = useState<ReleasedGame | null>(null);
  const [animated, setAnimated] = useState(initialMotion);
  const [radio, setRadio] = useState(false);
  const [daylight, setDaylight] = useState(realtimeLighting);
  const previous = useRef({
    projects: new Set<string>(),
    games: new Set<string>(),
  });
  const [shows, setShows] = useState<Show[]>([]);
  const shownKeys = useRef(new Set<string>());
  const show = !release ? shows[0] : undefined;
  const blocked = !!menu || wizard || founding || !!release || radio || !!show;
  useStudioAudio(blocked);
  const { saved, saveError, clearSaveError } = useGameSession(blocked);
  const closeMenu = useCallback(() => {
    studioAudio.play("close");
    setMenu(null);
  }, []);
  const closeWizard = useCallback(() => {
    studioAudio.play("close");
    setWizard(false);
  }, []);
  const closeFounding = useCallback(() => {
    studioAudio.play("close");
    setFounding(false);
  }, []);
  const closeRelease = useCallback(() => {
    studioAudio.play("close");
    setRelease(null);
  }, []);
  const closeRadio = useCallback(() => {
    studioAudio.play("close");
    setRadio(false);
  }, []);
  const openMenu = (page: string) => {
    studioAudio.play("open");
    setRadio(false);
    setMenu(page);
    setEmployee(null);
    setProject(null);
  };
  const openWizard = (sequelOf?: unknown) => {
    setSequel(typeof sequelOf === "string" ? sequelOf : null);
    studioAudio.play("open");
    setMenu(null);
    setWizard(true);
    setEmployee(null);
    setProject(null);
  };
  useEffect(() => {
    if (s.company.founded) setFounding(false);
    else {
      setMenu(null);
      setEmployee(null);
      setProject(null);
    }
  }, [s.company.founded]);
  useEffect(() => {
    const newRelease = s.games.find(
      (g) =>
        !previous.current.games.has(g.id) &&
        previous.current.projects.has(g.id) &&
        g.releasedDay === s.day &&
        !g.autoReleased,
    );
    if (newRelease) {
      studioAudio.play("release");
      setRelease(newRelease);
      setMenu(null);
      setProject(null);
    }
    previous.current = {
      projects: new Set(s.projects.map((p) => p.id)),
      games: new Set(s.games.map((g) => g.id)),
    };
  }, [s]);
  useEffect(() => {
    if (project && !s.projects.some((p) => p.id === project)) setProject(null);
  }, [project, s.projects]);
  // Expo results and year reviews appear once, right when they happen.
  const observedDay = useRef<number | null>(null);
  useEffect(() => {
    // Only show what happens while playing, not when a save is loaded.
    const before = observedDay.current;
    observedDay.current = s.day;
    if (before === null || s.day < before || s.day - before > 3) return;
    const next: Show[] = [];
    const r = s.expo.result;
    const expoKey = r ? `expo-${r.year}` : "";
    if (
      r &&
      !shownKeys.current.has(expoKey) &&
      s.day - (yearStartDay(r.year) + EXPO_DAY) <= 2
    ) {
      shownKeys.current.add(expoKey);
      next.push({ kind: "expo", key: expoKey, result: r });
    }
    const review = s.yearReviews[0];
    const yearKey = review ? `year-${review.year}` : "";
    if (
      review &&
      !shownKeys.current.has(yearKey) &&
      s.day - yearStartDay(review.year + 1) <= 2
    ) {
      shownKeys.current.add(yearKey);
      next.push({ kind: "year", key: yearKey, review });
    }
    if (next.length) {
      studioAudio.play("release");
      setShows((list) => [...list, ...next]);
    }
  }, [s.expo.result, s.yearReviews, s.day]);
  const closeShow = useCallback(() => {
    studioAudio.play("close");
    setShows((list) => list.slice(1));
  }, []);
  useEffect(() => {
    if (error || saveError) studioAudio.play("error");
  }, [error, saveError]);
  const priorEvent = useRef<string | undefined>(undefined);
  useEffect(() => {
    const event = s.events[0];
    if (priorEvent.current && event?.id !== priorEvent.current && event)
      studioAudio.play(event.kind === "warning" ? "error" : "event");
    priorEvent.current = event?.id;
  }, [s.events]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.closest('input, select, textarea, [role="combobox"]') ||
          e.target.isContentEditable)
      )
        return;
      if (e.key === "Escape") {
        setEmployee(null);
        setProject(null);
      }
      if (e.key.toLowerCase() === "m" && !e.repeat) {
        studioAudio.toggleMute();
        return;
      }
      if (blocked || !s.company.founded || s.company.bankrupt) return;
      if (
        e.code === "Space" &&
        !e.repeat &&
        !(e.target instanceof HTMLElement && e.target.closest("button"))
      ) {
        e.preventDefault();
        speed(s.speed ? 0 : 1);
        studioAudio.play("pause");
      }
      if (e.key.toLowerCase() === "n") {
        setWizard(true);
        setEmployee(null);
        setProject(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [blocked, s.company.founded, s.company.bankrupt, s.speed, speed]);
  function select(target: SceneTarget) {
    studioAudio.play("select");
    if (target.kind === "employee") {
      setEmployee(target.id);
      setProject(null);
    } else if (target.kind === "projects" && s.projects.length) {
      setProject(s.projects[0].id);
      setEmployee(null);
    } else
      openMenu(
        (
          {
            recruit: "Mitarbeiter",
            projects: "Projekte",
            games: "Spiele",
            research: "Forschung",
            studio: "Studio",
          } as const
        )[target.kind],
      );
  }
  function toggleMotion() {
    const next = !animated;
    setAnimated(next);
    try {
      localStorage.setItem("studio-zero-motion", next ? "on" : "off");
    } catch {
      /* The setting still applies for this session. */
    }
  }
  const unread = s.events.filter((e) => !e.read).length;
  const latest = s.events.find((e) => !e.read);
  const titleScreen = !s.company.founded;
  const isRunning = s.speed > 0 && !blocked && !s.company.bankrupt;
  if (!hydrated)
    return (
      <div className="game-loading">
        <span>
          STUDIO<span>ZERO</span>
        </span>
        <p>Das Licht geht an …</p>
        <i />
      </div>
    );
  return (
    <GameMotion enabled={animated}>
      <div
        className={`game-root ${titleScreen ? "title-screen" : ""} ${animated ? "motion-on" : "motion-off"}`}
      >
        <StudioWorld
          onSelect={select}
          selected={employee}
          animated={animated}
          blocked={blocked}
          titleScreen={titleScreen}
        />
        <div className="studio-film" aria-hidden="true" />
        <AnimatePresence mode="wait" initial={false}>
          {titleScreen ? (
            <motion.div
              className="title-layer"
              key="title"
              initial={animated ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: animated ? 0.4 : 0 }}
            >
              <div className="title-shade" />
              <div className="title-brand">
                <Gamepad2 size={20} />
                AN INDEPENDENT STUDIO STORY
              </div>
              <main className="title-content">
                <span className="title-chapter">
                  1990 · ES IST ZEIT FÜR DEINE IDEE
                </span>
                <h1>
                  STUDIO
                  <br />
                  <span>ZERO</span>
                  <i>.</i>
                </h1>
                <p>
                  Vom ersten Schreibtisch
                  <br />
                  zum Spiel deines Lebens.
                </p>
                <div className="title-actions">
                  <button
                    className="game-action"
                    onClick={() => {
                      studioAudio.play("open");
                      setFounding(true);
                    }}
                  >
                    Neues Studio <ArrowRight size={19} />
                  </button>
                  <button
                    className="title-load"
                    onClick={() => openMenu("Firma")}
                  >
                    <Save size={16} />
                    Spielstand laden
                  </button>
                </div>
              </main>
              <div className="title-footer">
                <span>BAUEN. ENTWICKELN. VERÖFFENTLICHEN.</span>
                <span>DEIN EIGENES SPIELESTUDIO</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="gameplay-ui"
              key="gameplay"
              initial={animated ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: animated ? 0.28 : 0 }}
            >
              <header className="game-hud">
                <button
                  className="hud-identity"
                  onClick={() => openMenu("Firma")}
                  aria-label="Spielmenü öffnen"
                >
                  <span className="zero-mark">
                    Z<span>0</span>
                  </span>
                  <div>
                    <strong>{s.company.name}</strong>
                    <small>
                      STUDIO ZERO · {OFFICES[s.company.office].name}
                    </small>
                  </div>
                </button>
                <div className="hud-clock">
                  <span>{dateLabel(s.day)}</span>
                  <div className="game-time" aria-label="Spielgeschwindigkeit">
                    <button
                      aria-label={s.speed ? "Pausieren" : "Fortsetzen"}
                      className={!s.speed ? "active" : ""}
                      onClick={() => speed(s.speed ? 0 : 1)}
                      disabled={s.company.bankrupt}
                    >
                      {s.speed ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    {([1, 4, 8, 12] as const).map((n) => (
                      <button
                        key={n}
                        aria-label={`Geschwindigkeit ${n}×`}
                        aria-pressed={s.speed === n}
                        className={s.speed === n ? "active" : ""}
                        onClick={() => speed(n)}
                        disabled={s.company.bankrupt}
                      >
                        {n}×
                      </button>
                    ))}
                  </div>
                </div>
                <div className="hud-resources">
                  <button onClick={() => openMenu("Finanzen")} title="Finanzen">
                    <Wallet size={17} />
                    <strong className={s.company.cash < 0 ? "negative" : ""}>
                      {money(s.company.cash)}
                    </strong>
                  </button>
                  <button onClick={() => openMenu("Statistiken")} title="Fans">
                    <Heart size={15} />
                    <span>{number(s.company.fans)}</span>
                  </button>
                  <button onClick={() => openMenu("Statistiken")} title="Ruf">
                    <Star size={15} />
                    <span>{Math.round(s.company.reputation)}</span>
                  </button>
                  <button
                    className="hud-menu"
                    aria-label="Spielmenü öffnen"
                    onClick={() => openMenu("Firma")}
                  >
                    <Settings2 size={18} />
                  </button>
                </div>
              </header>
              <div className="world-caption">
                <span className="chapter-index">0{s.company.office + 1}</span>
                <div>
                  <span>KAPITEL {s.company.office + 1}</span>
                  <h1>{OFFICES[s.company.office].name}</h1>
                  <p>
                    {s.company.office === 0
                      ? "Große Spiele beginnen klein."
                      : OFFICES[s.company.office].subtitle}
                  </p>
                </div>
              </div>
              <nav className="world-tools" aria-label="Weitere Spielmenüs">
                {sections
                  .filter((item) =>
                    [
                      "Spiele",
                      "Technologie",
                      "Marketing",
                      "Finanzen",
                      "Statistiken",
                      "Weltrangliste",
                      "Journal",
                    ].includes(item.page),
                  )
                  .map(({ page, title, icon: Icon }) => (
                    <button
                      key={page}
                      aria-label={title}
                      onClick={() => openMenu(page)}
                    >
                      <Icon size={19} />
                      <span>{title}</span>
                      {page === "Journal" && unread > 0 && <b>{unread}</b>}
                    </button>
                  ))}
              </nav>
              {!s.projects.length &&
                !s.games.length &&
                !s.productionQueue?.length &&
                !employee && (
                  <div className="first-game-prompt">
                    <span>
                      <Sparkles size={14} />
                      DEINE ERSTE MISSION
                    </span>
                    <h2>
                      Ein Spiel, das deinen
                      <br />
                      Namen trägt.
                    </h2>
                    <p>
                      Wähle Genre, Thema und Team.
                      <br />
                      Dein erster Release wartet auf dich.
                    </p>
                    <button onClick={openWizard}>
                      Erste Idee entwickeln <ArrowRight size={17} />
                    </button>
                  </div>
                )}
              <TeamDock
                selected={employee}
                onSelect={(id) => {
                  setEmployee(id);
                  setProject(null);
                }}
                onOpenTeam={() => openMenu("Mitarbeiter")}
              />
              <ProductionDock
                selected={project}
                onSelect={(id) => {
                  setProject(id);
                  setEmployee(null);
                }}
                onOpen={() => openMenu("Projekte")}
              />
              <AnimatePresence>
                {(employee || project) && (
                  <Inspector
                    employeeId={employee}
                    projectId={project}
                    onClose={() => {
                      setEmployee(null);
                      setProject(null);
                    }}
                    onMenu={openMenu}
                    animated={animated}
                  />
                )}
              </AnimatePresence>
              {!blocked && !employee && !project && (
                <SalesMonitor onOpen={() => openMenu("Spiele")} />
              )}
              <nav className="game-dock" aria-label="Spielaktionen">
                <button
                  className="dock-create"
                  onClick={openWizard}
                  disabled={s.company.bankrupt}
                >
                  <Plus size={21} />
                  <span>
                    Neues Spiel<small>N</small>
                  </span>
                </button>
                {[
                  { page: "Mitarbeiter", label: "Team", icon: Users },
                  { page: "Forschung", label: "Forschung", icon: FlaskConical },
                  { page: "Markt", label: "Branche", icon: Globe2 },
                  { page: "Studio", label: "Büro", icon: Building2 },
                ].map(({ page, label, icon: Icon }) => (
                  <button key={page} onClick={() => openMenu(page)}>
                    <Icon size={21} />
                    <span>{label}</span>
                    {page === "Mitarbeiter" && s.candidates.length > 0 && (
                      <b className="dock-alert">{s.candidates.length}</b>
                    )}
                  </button>
                ))}
              </nav>
              <footer className="game-footer">
                <span>
                  <i className={isRunning ? "running" : ""} />
                  {s.company.bankrupt
                    ? "Zahlungsunfähig"
                    : blocked
                      ? "Planungsmodus · Zeit angehalten"
                      : isRunning
                        ? "Studio in Betrieb"
                        : "Pause · Leertaste zum Fortsetzen"}
                </span>
                <button onClick={() => openMenu("Firma")}>
                  <Save size={11} />
                  {saved ? "Gespeichert" : "Wird gespeichert …"}
                </button>
              </footer>
              <AnimatePresence mode="wait">
                {latest && !employee && !project && (
                  <motion.button
                    key={latest.id}
                    initial={animated ? { opacity: 0, x: 20 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: animated ? 0.25 : 0 }}
                    className={`studio-news ${latest.kind}`}
                    onClick={() => openMenu("Journal")}
                  >
                    <Bell size={15} />
                    <span>{latest.title}</span>
                    <ChevronRight size={14} />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {menu && (
            <motion.div
              className="game-overlay"
              initial={animated ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: animated ? 0.22 : 0 }}
              key="menu"
            >
              <Modal
                title={
                  sections.find((item) => item.page === menu)?.title ?? menu
                }
                wide
                className="game-panel"
                onClose={closeMenu}
              >
                <div className="panel-layout">
                  <nav className="panel-nav" aria-label="Studioverwaltung">
                    {sections.map(({ page, title, icon: Icon }) => (
                      <button
                        key={page}
                        className={menu === page ? "active" : ""}
                        aria-current={menu === page ? "page" : undefined}
                        onClick={() => setMenu(page)}
                      >
                        <Icon size={17} />
                        <span>{title}</span>
                      </button>
                    ))}
                  </nav>
                  <div className="panel-content">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        className="panel-page"
                        key={menu}
                        initial={animated ? { opacity: 0, y: 6 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{
                          duration: animated ? 0.2 : 0,
                          ease: "easeOut",
                        }}
                      >
                        {menu === "Firma" && (
                          <>
                            <div className="game-options">
                              <span>
                                <Sparkles size={16} />
                                Animationen im Studio
                              </span>
                              <button
                                aria-pressed={animated}
                                onClick={toggleMotion}
                              >
                                {animated ? "An" : "Aus"}
                              </button>
                            </div>
                            <div className="game-options">
                              <span>
                                <Sparkles size={16} />
                                Tageszeit folgt deiner Uhr
                              </span>
                              <button
                                aria-pressed={daylight}
                                onClick={() => {
                                  setRealtimeLighting(!daylight);
                                  setDaylight(!daylight);
                                }}
                              >
                                {daylight ? "An" : "Aus"}
                              </button>
                            </div>
                            <div className="game-options">
                              <span>
                                <AudioLines size={16} />
                                Musik & Spielsounds
                              </span>
                              <button
                                onClick={() => {
                                  setMenu(null);
                                  setRadio(true);
                                  studioAudio.play("open");
                                }}
                              >
                                Studio-Radio
                              </button>
                            </div>
                          </>
                        )}
                        <Management page={menu} newProject={openWizard} />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
                <div className="panel-footer">
                  <Pause size={12} />
                  Das Studio wartet auf deine Entscheidung.
                  <span>ESC · ZURÜCK INS SPIEL</span>
                </div>
              </Modal>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {founding && titleScreen && (
            <motion.div className="game-overlay" key="founding">
              <Founding onClose={closeFounding} />
            </motion.div>
          )}
          {wizard && s.company.founded && (
            <motion.div className="game-overlay" key="wizard">
              <ProjectWizard onClose={closeWizard} sequelOf={sequel} />
            </motion.div>
          )}
          {show && (
            <motion.div className="game-overlay" key={show.key}>
              {show.kind === "expo" ? (
                <ExpoShow
                  result={show.result}
                  onClose={closeShow}
                  animated={animated}
                />
              ) : (
                <YearReviewShow
                  review={show.review}
                  onClose={closeShow}
                  animated={animated}
                />
              )}
            </motion.div>
          )}
          {release && (
            <motion.div className="game-overlay" key="release">
              <ReleaseShow
                game={release}
                onClose={closeRelease}
                onArchive={() => {
                  setRelease(null);
                  openMenu("Spiele");
                }}
                animated={animated}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <StudioRadio
          open={radio}
          hidden={
            !!employee || !!project || !!menu || founding || wizard || !!release
          }
          onClose={closeRadio}
          onOpen={() => {
            studioAudio.play("open");
            setMenu(null);
            setEmployee(null);
            setProject(null);
            setRadio(true);
          }}
        />
        <ClickFeedback />
        <AnimatePresence>
          {(error || saveError) && (
            <motion.div
              className="game-toast"
              role="alert"
              key="toast"
              initial={animated ? { opacity: 0, y: 24, scale: 0.95 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15 }}
            >
              <span>{error || saveError}</span>
              <button
                aria-label="Meldung schließen"
                onClick={() => {
                  clearError();
                  clearSaveError();
                }}
              >
                <X size={17} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {s.company.bankrupt && !menu && (
          <div className="game-over">
            <span>KAPITEL ENDE</span>
            <h2>Deinem Studio fehlt das Kapital.</h2>
            <p>Lade einen Spielstand oder wage einen neuen Anfang.</p>
            <button className="game-action" onClick={() => openMenu("Firma")}>
              Spielstände öffnen <ArrowRight size={17} />
            </button>
          </div>
        )}
      </div>
    </GameMotion>
  );
}
