import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Building,
  Building2,
  Crown,
  Gamepad2,
  Minus,
  Smartphone,
  Cloud,
  Monitor,
  Sparkles,
  Search,
  Star,
  Tv,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useGame } from "../../store/gameStore";
import { PLATFORMS } from "../../game/config/platforms";
import {
  platformShare,
  platformStatus,
  STATUS_LABEL,
  yearOf,
} from "../../game/market/platforms";
import {
  acquisitionBlocker,
  acquisitionPrice,
} from "../../game/market/rivals";
import {
  buyBlocker,
  earningsYield,
  groupName,
  monthlyProfit,
  ownsCompany,
} from "../../game/market/holdings";
import {
  affordableCompanies,
  cheapestCompanies,
  companyOffer,
  searchCompanies,
  type Acquirable,
} from "../../game/market/companyMarket";
import { countryLabel, realCompanies } from "../../game/leaderboard";
import GroupPortfolio, { compactEuro } from "../game/GroupPortfolio";
import { useState } from "react";
import { scaled } from "../../game/economy/scale";
import { money, number } from "../../game/utils";
import { Button, Card, PanelTitle, Progress } from "../ui";
import { useStudioMotion } from "../game/GameMotion";
import type { GameState, Platform } from "../../game/types";

const KIND_ICON: Record<NonNullable<Platform["kind"]>, LucideIcon> = {
  pc: Monitor,
  console: Tv,
  handheld: Gamepad2,
  mobile: Smartphone,
  cloud: Cloud,
};

function PlatformTimeline({ s }: { s: GameState }) {
  const now = yearOf(s.day);
  const from = Math.max(1990, Math.floor(now) - 5);
  const to = from + 11;
  const span = to - from;
  const pos = (y: number) => `${((Math.min(Math.max(y, from), to) - from) / span) * 100}%`;
  const rows = PLATFORMS.filter((p) => p.year - 1 <= to && (p.end ?? 9999) + 1 >= from);
  return (
    <Card className="platform-timeline">
      <PanelTitle title="Konsolen-Generationen" eyebrow="PLATTFORMEN IM WANDEL" />
      <div className="timeline-scale" aria-hidden>
        {Array.from({ length: span + 1 }, (_, i) => (
          <span key={i} style={{ left: pos(from + i) }}>
            {from + i}
          </span>
        ))}
      </div>
      <div className="timeline-rows">
        <span className="timeline-now" style={{ left: pos(now) }} />
        {rows.map((p) => {
          const status = platformStatus(p, s.day);
          const Icon = KIND_ICON[p.kind ?? "console"];
          const share = platformShare(p, s.day);
          const start = p.year;
          const end = p.end === undefined ? to + 1 : p.end + 1;
          return (
            <div className={`timeline-row ${status}`} key={p.id}>
              <div className="timeline-label">
                <Icon size={13} />
                <strong>{p.name}</strong>
                <small>{STATUS_LABEL[status]}</small>
              </div>
              <div className="timeline-track">
                <span
                  className="timeline-announce"
                  style={{ left: pos(start - 1), width: `calc(${pos(start)} - ${pos(start - 1)})` }}
                />
                <span
                  className="timeline-bar"
                  style={{ left: pos(start), width: `calc(${pos(end)} - ${pos(start)})` }}
                  title={`${p.name} · ${p.year}–${p.end ?? "heute"} · Lizenz ${money(scaled(s, p.license))}`}
                >
                  <i style={{ width: `${(share / 50) * 100}%` }} />
                </span>
              </div>
              <span className="timeline-share">{share ? `${Math.round(share)}` : "–"}</span>
            </div>
          );
        })}
      </div>
      <p className="hint">
        Neue Plattformen werden ein Jahr vorher angekündigt. Spiele im ersten
        Jahr einer Plattform gelten als Launch-Titel (+30 % Reichweite). Zahlen
        rechts: aktuelles Marktgewicht.
      </p>
    </Card>
  );
}

function ChartsCard({ s }: { s: GameState }) {
  const animated = useStudioMotion();
  const charts = s.charts;
  return (
    <Card className="charts-card">
      <PanelTitle
        title={charts ? `Verkaufscharts · KW ${(charts.week % 52) + 1}` : "Verkaufscharts"}
        eyebrow="DIE MEISTVERKAUFTEN SPIELE DER WOCHE"
      />
      {!charts?.entries.length ? (
        <p className="quiet-empty">Die ersten Charts erscheinen nach einer Woche.</p>
      ) : (
        <ol className="charts-list">
          <AnimatePresence initial={false}>
            {charts.entries.map((e) => {
              const move = e.previous === null ? "new" : e.previous > e.rank ? "up" : e.previous < e.rank ? "down" : "same";
              return (
                <motion.li
                  key={e.id}
                  layout={animated}
                  initial={animated ? { opacity: 0, x: -12 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className={`chart-entry ${e.own ? "own" : ""} rank-${e.rank}`}
                >
                  <span className="chart-rank">{e.rank === 1 ? <Crown size={14} /> : e.rank}</span>
                  <span className={`chart-move ${move}`}>
                    {move === "new" ? "NEU" : move === "up" ? <ArrowUp size={12} /> : move === "down" ? <ArrowDown size={12} /> : <Minus size={12} />}
                  </span>
                  <span className="chart-title">
                    <strong>{e.title}</strong>
                    <small>
                      {e.studio} · {e.weeks} {e.weeks === 1 ? "Woche" : "Wochen"}
                    </small>
                  </span>
                  <span className="chart-units">{number(e.units)}</span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
    </Card>
  );
}

function RivalsCard({ s }: { s: GameState }) {
  const store = useGame();
  const animated = useStudioMotion();
  const latest = (name: string) => (s.market.rivalGames ?? []).find((g) => g.studio === name);
  return (
    <Card className="rivals-card">
      <PanelTitle title="Die Konkurrenz" eyebrow="STUDIOS & ÜBERNAHMEN" />
      <div className="rivals-list">
        {s.market.competitors.map((c) => {
          const game = latest(c.name);
          const blocker = acquisitionBlocker(s, c);
          return (
            <motion.div
              layout={animated}
              className={`rival ${c.owned ? "owned" : ""}`}
              key={c.name}
            >
              <span className="rival-logo">
                <Building size={16} />
              </span>
              <div className="rival-info">
                <strong>{c.name}</strong>
                <span className="rival-stars" aria-label={`Stärke ${c.strength ?? 2} von 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={10} className={i < (c.strength ?? 2) ? "on" : ""} />
                  ))}
                </span>
                <small>
                  {c.releases} Releases · {money(c.revenue)} Umsatz
                  {game && ` · zuletzt „${game.title}“ (${game.score.toFixed(1)})`}
                </small>
              </div>
              {c.owned ? (
                <span className="rival-owned">
                  <Sparkles size={12} /> Tochterstudio
                </span>
              ) : (
                <div className="rival-buy">
                  <Button
                    secondary
                    disabled={!!blocker}
                    onClick={() => store.acquireStudio(c.name)}
                    detail={money(acquisitionPrice(s, c))}
                  >
                    Übernehmen
                  </Button>
                  {blocker && <small>{blocker}</small>}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

function CompanyRow({ s, c }: { s: GameState; c: Acquirable }) {
  const store = useGame();
  const offer = companyOffer(c);
  const price = offer.price;
  const owned = ownsCompany(s, c.id);
  const blocker = buyBlocker(s, offer);
  const monthly = monthlyProfit({ id: c.id, sector: c.sector, value: price });
  const yieldRate = earningsYield(c.id, c.sector);
  return (
    <li className={`company-offer ${owned ? "owned" : ""}`}>
      <span className="rival-logo">
        <Building2 size={16} />
      </span>
      <div className="company-offer-info">
        <strong title={c.name}>{c.name}</strong>
        <small>
          {c.ticker} · {countryLabel(c.country)} · {c.sector}
        </small>
      </div>
      <div className="company-offer-figure">
        <small>Marktwert</small>
        <b title={money(price)}>{compactEuro(price)}</b>
      </div>
      <div className="company-offer-figure profit">
        <small>Gewinn / Monat</small>
        <b>+{money(monthly)}</b>
        <small>
          {(yieldRate * 100).toLocaleString("de-DE", {
            maximumFractionDigits: 1,
          })}{" "}
          % p. a. · amortisiert in {Math.round(1 / yieldRate)} J.
        </small>
      </div>
      {owned ? (
        <span className="rival-owned">
          <Sparkles size={12} /> In deiner Group
        </span>
      ) : (
        <div className="rival-buy">
          <Button
            secondary
            disabled={!!blocker}
            onClick={() => store.buyCompany(offer)}
            detail={money(price)}
          >
            Übernehmen
          </Button>
          {blocker && <small>{blocker}</small>}
        </div>
      )}
    </li>
  );
}

function AcquisitionsCard({ s }: { s: GameState }) {
  const [query, setQuery] = useState("");
  const results = searchCompanies(query);
  const affordable = affordableCompanies(s);
  const list = query.trim()
    ? results
    : affordable.length
      ? affordable
      : cheapestCompanies(s);
  return (
    <Card className="acquisitions-card">
      <PanelTitle
        title="Unternehmen übernehmen"
        eyebrow={`${realCompanies.length} BÖRSENUNTERNEHMEN · ZUM MARKTWERT`}
      />
      <label className="company-search">
        <Search size={15} />
        <input
          aria-label="Unternehmen zum Übernehmen suchen"
          placeholder="Unternehmen oder Börsenkürzel suchen …"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Suche leeren">
            <X size={14} />
          </button>
        )}
      </label>
      <span className="company-list-caption" role="status">
        {query.trim()
          ? results.length
            ? `${results.length} Treffer für „${query.trim()}“`
            : `Kein Unternehmen gefunden für „${query.trim()}“.`
          : affordable.length
            ? "Die wertvollsten Unternehmen, die du dir heute leisten kannst"
            : "Günstigste Einstiegsziele · spare Kapital für deine erste Übernahme"}
      </span>
      {list.length > 0 && (
        <ul className="company-offers">
          {list.map((c) => (
            <CompanyRow key={c.id} s={s} c={c} />
          ))}
        </ul>
      )}
      <div className="group-portfolio-heading">
        <span className="eyebrow">GEWINN DEINER GROUP</span>
        <h3>{groupName(s.company.name)}</h3>
      </div>
      <GroupPortfolio sell />
    </Card>
  );
}

export default function MarketView() {
  const store = useGame();
  const s = store.game;
  return (
    <div className="market-view">
      <PlatformTimeline s={s} />
      <div className="two-columns">
        <ChartsCard s={s} />
        <Card className="table-card">
          <PanelTitle title="Genre-Nachfrage" eyebrow="DER AKTUELLE ZEITGEIST" />
          <table>
            <thead>
              <tr>
                <th>Genre</th>
                <th>Interesse</th>
                <th>Deine Releases</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(s.market.popularity)
                .sort((a, b) => b[1] - a[1])
                .map(([g, v]) => (
                  <tr key={g}>
                    <td>{g}</td>
                    <td>
                      <div className="table-progress">
                        <Progress value={v} />
                        <span>{Math.round(v)}</span>
                      </div>
                    </td>
                    <td>{s.genreExperience[g as keyof typeof s.genreExperience] ?? 0}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="hint">Jeder eigene Release sättigt sein Genre ein wenig.</p>
        </Card>
      </div>
      <AcquisitionsCard s={s} />
      <RivalsCard s={s} />
    </div>
  );
}
