import { useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUpRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Globe2,
  Search,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { useGame } from "../../store/gameStore";
import { useStudioMotion } from "../game/GameMotion";
import GameSelect from "../game/GameSelect";
import {
  buildRanking,
  countryLabel,
  formatRankingValue,
  marketSnapshot,
  realCompanies,
  snapshotDate,
  estimatedWorldRank,
  formatWorldRank,
  WORLD_COMPANY_COUNT,
  WORLD_MILESTONES,
  worldMilestone,
  worldNeighborhood,
  type RankedCompany,
  type RankingCurrency,
  type RankingGroup,
  type RankingMarket,
  marketMergers,
} from "../../game/leaderboard";
import { worldSeed } from "../../game/market/marketCycle";
import { dateLabel as snapshotDay } from "../../game/utils";
import { groupStats, holdingsOf } from "../../game/market/holdings";

const PAGE_SIZE = 30;
const sectorNames = [
  ...new Set(realCompanies.map((company) => company.sector)),
].sort((a, b) => a.localeCompare(b, "de"));
const countryCodes = [
  ...new Set(realCompanies.map((company) => company.country)),
].sort((a, b) => countryLabel(a).localeCompare(countryLabel(b), "de"));
const sectorColors: Record<string, string> = {
  Technologie: "#a9cfb4",
  Finanzen: "#d6bd84",
  Gesundheit: "#a6c4d7",
  "Konsum & Handel": "#d9ac93",
  "Energie & Rohstoffe": "#becb8d",
  Industrie: "#a9bcd1",
  Mobilität: "#d3b4c9",
  Telekommunikation: "#a1cecb",
  "Medien & Spiele": "#d4b8de",
  Immobilien: "#cfb99c",
  "Weitere Branchen": "#b9c4bc",
};
function Monogram({
  company,
  large = false,
}: {
  company: RankedCompany;
  large?: boolean;
}) {
  const letters = company.player
    ? "★"
    : company.group
      ? "G"
      : company.name
          .replace(/[^\p{L}\p{N} ]/gu, "")
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => word[0])
          .join("")
          .toUpperCase();
  return (
    <span
      className={`ranking-monogram ${large ? "large" : ""}`}
      style={
        {
          "--company-color":
            company.player || company.group
              ? "#ebc88b"
              : sectorColors[company.sector],
        } as CSSProperties
      }
      aria-hidden="true"
    >
      {letters}
    </span>
  );
}

export default function Leaderboard() {
  const game = useGame((store) => store.game);
  const company = game.company;
  const animated = useStudioMotion();
  const stats = useMemo(() => groupStats(game), [game]);
  const group = useMemo<RankingGroup | null>(
    () =>
      stats.active
        ? {
            name: stats.name,
            value: stats.value,
            members: holdingsOf(game).map((h) => h.id),
          }
        : null,
    [stats, game],
  );
  const owned = holdingsOf(game)
    .map((h) => h.id)
    .join(",");
  const market = useMemo<RankingMarket>(
    () => ({
      day: game.day,
      seed: worldSeed(game),
      owned: owned ? owned.split(",") : [],
    }),
    [game.day, company.founder, owned],
  );
  const ranking = useMemo(
    () => buildRanking(company, group, market),
    [company, group, market],
  );
  const mergers = useMemo(() => {
    const names = new Map(realCompanies.map((c) => [c.id, c.name]));
    return marketMergers(market)
      .slice(0, 6)
      .map((m) => ({
        ...m,
        acquirer: names.get(m.acquirer) ?? m.acquirer,
        target: names.get(m.target) ?? m.target,
      }));
  }, [market]);
  const groupEntry = ranking.find((entry) => entry.group);
  const ownIndex = ranking.findIndex((entry) => entry.player);
  const own = ranking[ownIndex];
  const nextMilestone = WORLD_MILESTONES.find(
    ([eur]) => eur * marketSnapshot.usdPerEur > own.valueUsd,
  );
  const next = nextMilestone ? worldMilestone(nextMilestone) : undefined;
  const globalRank = estimatedWorldRank(own.valueUsd);
  const topShare = (globalRank / WORLD_COMPANY_COUNT) * 100;
  const beaten = realCompanies.filter(
    (entry) => entry.valueUsd < own.valueUsd,
  ).length;
  const top = ranking.slice(0, 3);
  const [currency, setCurrency] = useState<RankingCurrency>("EUR");
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const [country, setCountry] = useState("");
  const [mode, setMode] = useState<
    "companies" | "real-near" | "world" | "group"
  >("companies");
  const nearby = mode !== "companies";
  const setNearby = (enabled: boolean) =>
    setMode(enabled ? "real-near" : "companies");
  const [page, setPage] = useState(0);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const playerRow = useRef<HTMLTableRowElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");
  const filtered = ranking.filter(
    (entry) =>
      (!sector || entry.sector === sector) &&
      (!country || entry.country === country) &&
      (!normalizedQuery ||
        `${entry.name} ${entry.ticker} ${countryLabel(entry.country)}`
          .toLocaleLowerCase("de-DE")
          .includes(normalizedQuery)),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const startNearby = Math.max(0, ownIndex - 3);
  const displayed =
    mode === "world"
      ? worldNeighborhood(company, group, market)
      : mode === "group"
        ? ranking.filter(
            (entry) => entry.group || entry.player || entry.memberOf,
          )
        : nearby
          ? ranking.slice(startNearby, ownIndex + 4)
          : filtered.slice(
              currentPage * PAGE_SIZE,
              (currentPage + 1) * PAGE_SIZE,
            );
  const hasFilters = Boolean(query || sector || country);
  const value = (usd: number, full = false) =>
    formatRankingValue(usd, currency, full);
  const progress = next
    ? Math.min(100, (own.valueUsd / next.valueUsd) * 100)
    : 100;
  const progressLabel =
    progress > 0 && progress < 0.01
      ? "< 0,01"
      : new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(
          progress,
        );
  const reset = () => {
    setQuery("");
    setSector("");
    setCountry("");
    setPage(0);
  };
  const focusList = () =>
    requestAnimationFrame(() => {
      listHeading.current?.focus({ preventScroll: true });
      listHeading.current?.scrollIntoView({
        behavior: animated ? "smooth" : "auto",
        block: "start",
      });
    });
  const showStudio = (view: "world" | "real-near" | "group" = "world") => {
    reset();
    setMode(view);
    requestAnimationFrame(() => {
      listHeading.current?.focus({ preventScroll: true });
      playerRow.current?.scrollIntoView({
        behavior: animated ? "smooth" : "auto",
        block: "center",
      });
    });
  };
  const tier =
    own.valueUsd / marketSnapshot.usdPerEur >= 1e9
      ? "GLOBAL PLAYER"
      : own.valueUsd / marketSnapshot.usdPerEur >= 1e6
        ? "AUFSTREBENDES STUDIO"
        : "INDIE-STUDIO";

  return (
    <div className={`leaderboard ${animated ? "ranking-motion" : ""}`}>
      <header className="ranking-hero">
        <div className="ranking-crest" aria-hidden="true">
          <Trophy size={30} />
          <span>WORLD</span>
        </div>
        <div className="ranking-intro">
          <span className="ranking-kicker">STUDIO ZERO · WORLD LEAGUE</span>
          <h1>Von deiner Idee an die Weltspitze.</h1>
          <p>
            {realCompanies.length} echte Unternehmen. Alle Branchen. Dein
            nächstes großes Ziel.
          </p>
        </div>
        <div className="ranking-snapshot">
          <span>
            <Globe2 size={13} /> HEUTIGER MARKTVERGLEICH
          </span>
          <strong>{snapshotDate(marketSnapshot.retrievedOn)}</strong>
          <small>Gespeicherter Datenstand</small>
        </div>
        <div className="ranking-orbit" aria-hidden="true" />
      </header>

      <section
        className="ranking-podium"
        aria-label="Die drei wertvollsten Unternehmen im Vergleich"
      >
        {[top[1], top[0], top[2]].map((entry) => (
          <motion.article
            className={`podium-card podium-${top.indexOf(entry) + 1}`}
            key={entry.id}
            initial={animated ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: animated ? 0.35 : 0,
              delay: animated ? top.indexOf(entry) * 0.08 : 0,
            }}
          >
            <span className="podium-rank">
              {top.indexOf(entry) === 0 ? (
                <Crown size={14} />
              ) : (
                <Trophy size={12} />
              )}{" "}
              WELTSPITZE #{entry.rank}
            </span>
            <div className="podium-company">
              <Monogram company={entry} large />
              <div>
                <h2>{entry.name}</h2>
                <small>
                  {countryLabel(entry.country)} · {entry.sector}
                </small>
              </div>
            </div>
            <strong
              className="podium-value"
              title={value(entry.valueUsd, true)}
            >
              {value(entry.valueUsd)}
            </strong>
            <span className="podium-caption">
              {entry.player
                ? "Simulierter Firmenwert"
                : entry.group
                  ? "Simulierter Gruppenwert"
                  : "Börsenwert"}
            </span>
          </motion.article>
        ))}
      </section>

      <section
        className="ranking-player world-player"
        aria-label="Dein Studio im Weltvergleich"
      >
        <div className="player-rank">
          <span>WELTRANG · MODELL</span>
          <strong
            className="player-world-rank"
            title="Gerundeter Rang aus dem Spielweltmodell"
          >
            {formatWorldRank(globalRank)}
          </strong>
          <small>200 Mio. Unternehmen</small>
          <span className="player-percentile">
            Top{" "}
            {topShare < 0.01
              ? "< 0,01"
              : new Intl.NumberFormat("de-DE", {
                  maximumFractionDigits: 2,
                }).format(topShare)}{" "}
            % im Modell
          </span>
        </div>
        <div className="player-identity">
          <span className="ranking-kicker">
            <Sparkles size={12} /> {tier}
          </span>
          <h2>{company.name}</h2>
          <strong title={value(own.valueUsd, true)}>
            {value(own.valueUsd)}
          </strong>
          <small>
            Firmenvergleich: #{own.rank} von {ranking.length} · {beaten}{" "}
            überholt
          </small>
          <button onClick={() => showStudio()}>
            <Target size={13} /> Zu meiner Liga <ArrowDown size={12} />
          </button>
        </div>
        <div className="player-goal">
          {next ? (
            <>
              <span className="ranking-kicker">
                DEINE NÄCHSTE WACHSTUMSMARKE
              </span>
              <div className="goal-name">
                <Monogram company={next} />
                <div>
                  <strong>{next.name}</strong>
                  <small>Modellstufe · {value(next.valueUsd)}</small>
                </div>
              </div>
              <div
                className="goal-progress"
                role="progressbar"
                aria-label={`Fortschritt zur Wachstumsmarke ${next.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-valuetext={`${progressLabel} Prozent`}
              >
                <motion.span
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: animated ? 0.65 : 0 }}
                />
              </div>
              <div className="goal-meta">
                <span>{progressLabel} % erreicht</span>
                <span>
                  Noch {value(Math.max(0, next.valueUsd - own.valueUsd))}
                </span>
              </div>
            </>
          ) : (
            <>
              <Crown size={28} />
              <h3>Die Spitze gehört dir.</h3>
              <p>Dein Studio führt die gesamte Vergleichsliste an.</p>
            </>
          )}
        </div>
      </section>
      {groupEntry && (
        <section
          className="ranking-group-card"
          aria-label="Deine Group im Weltvergleich"
        >
          <Monogram company={groupEntry} large />
          <div className="ranking-group-identity">
            <span className="ranking-kicker">
              <Building2 size={12} /> DEINE UNTERNEHMENSGRUPPE
            </span>
            <h2>
              {groupEntry.name}
              <span className="ranking-you">GROUP</span>
            </h2>
            <small>
              {stats.companies} übernommene Unternehmen · Studio, Tochterstudios
              und Beteiligungen
            </small>
          </div>
          <div className="ranking-group-figures">
            <span>
              <small>Gruppenwert</small>
              <strong title={value(groupEntry.valueUsd, true)}>
                {value(groupEntry.valueUsd)}
              </strong>
            </span>
            <span>
              <small>Firmenvergleich</small>
              <strong>#{groupEntry.rank}</strong>
            </span>
            <span>
              <small>Weltrang</small>
              <strong>
                {formatWorldRank(estimatedWorldRank(groupEntry.valueUsd))}
              </strong>
            </span>
          </div>
          <button onClick={() => showStudio("group")}>
            <Target size={13} /> Meine Group <ArrowDown size={12} />
          </button>
        </section>
      )}
      {mergers.length > 0 && (
        <section
          className="ranking-mergers"
          aria-label="Fusionen in der Spielwelt"
        >
          <span className="ranking-kicker">
            FUSIONEN & ÜBERNAHMEN IN DER SPIELWELT
          </span>
          <ul>
            {mergers.map((m) => (
              <li key={`${m.acquirer}-${m.target}`}>
                <small>{snapshotDay(m.day)}</small>
                <strong>{m.acquirer}</strong> übernimmt{" "}
                <strong>{m.target}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="ranking-scope">
        Weltrang = gerundetes Spielweltmodell. Firmenvergleich = Platz unter{" "}
        {realCompanies.length} echten Börsenunternehmen. Dein Firmenwert ist
        simuliert.
      </p>

      <section className="ranking-ledger" aria-label="Unternehmensrangliste">
        <div className="ranking-ledger-heading">
          <h2 ref={listHeading} tabIndex={-1}>
            <Globe2 size={16} /> Unternehmensrangliste
          </h2>
          <div className="ranking-currency" aria-label="Währung">
            <button
              aria-pressed={currency === "EUR"}
              onClick={() => setCurrency("EUR")}
            >
              € EUR
            </button>
            <button
              aria-pressed={currency === "USD"}
              onClick={() => setCurrency("USD")}
            >
              $ USD
            </button>
          </div>
        </div>
        <div className="ranking-toolbar">
          <label className="ranking-search">
            <Search size={15} />
            <input
              aria-label="Unternehmen suchen"
              placeholder="Unternehmen oder Börsenkürzel …"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
                setNearby(false);
              }}
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setPage(0);
                }}
                aria-label="Suche leeren"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <GameSelect
            label="Branche filtern"
            value={sector}
            onChange={(value) => {
              setSector(value);
              setPage(0);
              setNearby(false);
            }}
            options={[
              { value: "", label: "Alle Branchen" },
              ...sectorNames.map((value) => ({ value, label: value })),
            ]}
          />
          <GameSelect
            label="Land filtern"
            value={country}
            onChange={(value) => {
              setCountry(value);
              setPage(0);
              setNearby(false);
            }}
            options={[
              { value: "", label: "Alle Länder" },
              ...countryCodes.map((value) => ({
                value,
                label: countryLabel(value),
              })),
            ]}
          />
        </div>
        <div className="ranking-list-options">
          <div className="ranking-tabs" aria-label="Ansicht">
            <button
              aria-pressed={!nearby}
              onClick={() => {
                setNearby(false);
                setPage(0);
              }}
            >
              Echte Unternehmen
            </button>
            <button
              aria-pressed={mode === "world"}
              onClick={() => showStudio("world")}
            >
              Deine Liga
            </button>
            <button
              aria-pressed={mode === "real-near"}
              onClick={() => showStudio("real-near")}
            >
              Um mein Studio
            </button>
            {groupEntry && (
              <button
                aria-pressed={mode === "group"}
                onClick={() => showStudio("group")}
              >
                Meine Group
              </button>
            )}
          </div>
          <span role="status">
            {mode === "world"
              ? "Modellstufen · keine realen Firmen"
              : mode === "group"
                ? `${stats.name} · Studio & Beteiligungen`
                : nearby
                  ? "Dein Platz & die nächsten Rivalen"
                  : `${filtered.length} ${hasFilters ? "Treffer" : "Einträge"}`}
          </span>
          {hasFilters && (
            <button className="ranking-reset" onClick={reset}>
              <X size={12} /> Filter löschen
            </button>
          )}
        </div>
        <div className="ranking-table-wrap">
          <table
            className={`ranking-table ${mode === "world" ? "world-table" : ""}`}
          >
            <caption className="ranking-sr-only">
              {mode === "world"
                ? "Angenommene Modellstufen in der Nähe deines Studios"
                : nearby
                  ? "Unternehmen in der Nähe deines Studio-Rangs"
                  : "Unternehmen nach Firmenwert absteigend"}
              . Ränge bleiben bei Filtern unverändert.
            </caption>
            <thead>
              <tr>
                <th scope="col">{mode === "world" ? "Modellrang" : "Rang"}</th>
                <th scope="col">Unternehmen</th>
                <th scope="col" className="ranking-sector-col">
                  Branche
                </th>
                <th scope="col">
                  Firmenwert <ArrowDown size={11} />
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((entry) => (
                <tr
                  key={entry.id}
                  ref={entry.player ? playerRow : undefined}
                  className={
                    entry.player
                      ? "ranking-own-row"
                      : entry.group
                        ? "ranking-own-row ranking-group-row"
                        : entry.memberOf
                          ? "ranking-member-row"
                          : ""
                  }
                >
                  <td className="ranking-place">
                    {entry.rank <= 3 ? <Crown size={14} /> : null}
                    <span>
                      {mode === "world"
                        ? formatWorldRank(entry.rank)
                        : `#${entry.rank}`}
                    </span>
                  </td>
                  <td>
                    <div className="ranking-company-cell">
                      <Monogram company={entry} />
                      <div>
                        <strong>
                          {entry.name}
                          {entry.player && (
                            <span className="ranking-you">DU</span>
                          )}
                          {entry.group && (
                            <span className="ranking-you">GROUP</span>
                          )}
                          {entry.absorbed && (
                            <span
                              className="ranking-absorbed"
                              title={`Hat übernommen: ${entry.absorbed.join(", ")}`}
                            >
                              +{entry.absorbed.length} Übernahme
                              {entry.absorbed.length === 1 ? "" : "n"}
                            </span>
                          )}
                          {entry.memberOf && (
                            <span
                              className="ranking-group-badge"
                              title={`Gehört zur ${entry.memberOf}`}
                            >
                              <Building2 size={10} />
                              {entry.memberOf}
                            </span>
                          )}
                        </strong>
                        <small>
                          {entry.player
                            ? "Simulierter Wert"
                            : entry.group
                              ? `Simulierter Gruppenwert · ${stats.companies} Unternehmen`
                              : entry.model
                                ? "Modellstufe · angenommener Wert"
                                : `${entry.ticker} · ${countryLabel(entry.country)}`}
                          <span className="ranking-mobile-sector">
                            {" "}
                            · {entry.sector}
                          </span>
                        </small>
                      </div>
                    </div>
                  </td>
                  <td className="ranking-sector-col">
                    <span
                      className="ranking-sector-dot"
                      style={{ background: sectorColors[entry.sector] }}
                    />
                    {entry.sector}
                  </td>
                  <td className="ranking-company-value">
                    <strong title={value(entry.valueUsd, true)}>
                      {value(entry.valueUsd)}
                    </strong>
                    {!entry.player && !entry.model && !entry.group && (
                      <a
                        href={entry.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Börsenwert von ${entry.name} bei CompaniesMarketCap ansehen`}
                        title="Quelle ansehen"
                      >
                        <ArrowUpRight size={13} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!displayed.length && (
          <div className="ranking-empty">
            <Search size={25} />
            <h3>Keine Unternehmen gefunden.</h3>
            <p>Versuche einen anderen Namen oder entferne die Filter.</p>
            <button onClick={reset}>Alle Unternehmen anzeigen</button>
          </div>
        )}
        {!nearby && filtered.length > 0 && (
          <footer className="ranking-pagination">
            <span>
              {currentPage * PAGE_SIZE + 1}–
              {Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} von{" "}
              {filtered.length}
            </span>
            <div>
              <button
                aria-label="Vorherige Seite"
                disabled={currentPage === 0}
                onClick={() => {
                  setPage(currentPage - 1);
                  focusList();
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                Seite {currentPage + 1} / {totalPages}
              </span>
              <button
                aria-label="Nächste Seite"
                disabled={currentPage === totalPages - 1}
                onClick={() => {
                  setPage(currentPage + 1);
                  focusList();
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </section>

      <details className="ranking-method">
        <summary>Werte, Datenstand & Quellen</summary>
        <div>
          <p>
            <strong>Reale Unternehmen:</strong> Börsenwert = Aktienkurs ×
            ausstehende Aktien. Abruf am{" "}
            {snapshotDate(marketSnapshot.retrievedOn)} von{" "}
            <a
              href={marketSnapshot.sources[0]}
              target="_blank"
              rel="noopener noreferrer"
            >
              CompaniesMarketCap
            </a>{" "}
            (Top 1.000 weltweit und 200 Unternehmen mit Gaming-Bezug, ohne
            doppelte Börsenkürzel). Kurse können verzögert sein. Es sind
            gespeicherte Vergleichswerte, keine Live-Kurse. Private Unternehmen
            sind nicht enthalten.
          </p>
          <p>
            <strong>Dein Studio:</strong> max(0, Kapital − Schulden) + Fans × 12
            € + Reputation × 900 €. Das ist die vereinfachte Spielbewertung und
            derselbe Wert wie in deinen Statistiken. Der Rang zählt Firmen mit
            höherem Wert; gleiche Werte teilen sich einen Rang.
          </p>
          <p>
            <strong>Globales Spielweltmodell:</strong> 200 Millionen Unternehmen
            sind eine Spielannahme, keine aktuelle amtliche Firmenzählung. Die
            frei festgelegte Wertverteilung ergänzt die echte Liste um
            modellierte kleine und private Unternehmen. Beispielsweise liegen im
            Modell 35 Millionen weitere Firmen über 50.000 € und 1,5 Millionen
            über 1 Million €. Zwischen den Wertstufen wird logarithmisch
            interpoliert; der angezeigte Rang wird auf drei Stellen gerundet.
            „Deine Liga“ zeigt angenommene Vergleichsstufen. Das ist keine
            beobachtete weltweite Rangliste. Die{" "}
            <a
              href="https://www.ifc.org/en/what-we-do/sector-expertise/financial-institutions/msme-finance"
              target="_blank"
              rel="noopener noreferrer"
            >
              IFC beschreibt die große Bedeutung kleiner Unternehmen
            </a>
            , liefert jedoch keine globale Bewertungsverteilung für dieses
            Modell.
          </p>
          <p>
            <strong>Euro-Umrechnung:</strong> 1 € ={" "}
            {marketSnapshot.usdPerEur.toLocaleString("de-DE", {
              maximumFractionDigits: 4,
            })}{" "}
            US-Dollar,{" "}
            <a
              href={marketSnapshot.fxSource}
              target="_blank"
              rel="noopener noreferrer"
            >
              EZB-Referenzkurs vom {snapshotDate(marketSnapshot.fxDate)}
            </a>
            . Der Datenstand bleibt unabhängig vom Kalenderjahr im Spiel.
            Branchen sind vereinfachte Filter; der Gaming-Bezug umfasst auch
            Mischkonzerne.
          </p>
        </div>
      </details>
    </div>
  );
}
