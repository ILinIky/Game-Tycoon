import { useState } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  Award as AwardIcon,
  ChevronDown,
  ChevronUp,
  Check,
  Crown,
  Handshake,
  Layers,
  Monitor,
  Package,
  Percent,
  Repeat,
  Star,
  Trophy,
} from "lucide-react";
import { patchCost } from "../../game/economy/scale";
import { useGame } from "../../store/gameStore";
import { date, money, number, dateLabel } from "../../game/utils";
import { sizeLabel } from "../../game/config/balance";
import { isOnSale, MAX_ARCHIVED_GAMES } from "../../game/projects/archive";
import { Badge, Button, Card, Empty } from "../ui";
import GameArtwork from "../game/GameArtwork";
import SalesChart from "../game/SalesChart";
import GameSelect from "../game/GameSelect";
import { useStudioMotion } from "../game/GameMotion";
import { seriesOf, SEQUEL_MIN_SCORE } from "../../game/projects/franchise";
import {
  basePrice,
  dlcBlocker,
  dlcCost,
  MAX_DLCS,
  onSale,
  PRICE_LEVELS,
  PRICE_STEPS,
  saleBlocker,
} from "../../game/projects/pricing";
import type { Award, GameState, ReleasedGame } from "../../game/types";

const AWARD_STYLE: Record<Award["kind"], string> = {
  goty: "gold",
  indie: "silver",
  expo: "bronze",
  chart: "chart",
};

const AWARD_KINDS: { kind: Award["kind"]; label: string }[] = [
  { kind: "goty", label: "Spiel des Jahres" },
  { kind: "indie", label: "Indie-Preise" },
  { kind: "expo", label: "Messepreise" },
  { kind: "chart", label: "Nr. 1 der Charts" },
];
const TROPHY_PREVIEW = 6;

function TrophyCabinet({ s }: { s: GameState }) {
  const animated = useStudioMotion();
  const [all, setAll] = useState(false);
  if (!s.awards.length) return null;
  const awards = [...s.awards].reverse();
  const shown = all ? awards : awards.slice(0, TROPHY_PREVIEW);
  return (
    <Card className="trophy-cabinet">
      <div className="trophy-head">
        <Trophy size={18} />
        <h3>Trophäenschrank</h3>
        <span>{s.awards.length} Auszeichnungen</span>
      </div>
      <div className="trophy-summary">
        {AWARD_KINDS.map(({ kind, label }) => {
          const count = s.awards.filter((a) => a.kind === kind).length;
          return (
            <span
              key={kind}
              className={`trophy-count tone-${AWARD_STYLE[kind]}${count ? "" : " is-empty"}`}
            >
              <b>{count}</b>
              {label}
            </span>
          );
        })}
      </div>
      <div className="trophy-shelf">
        {shown.map((a, i) => (
          <motion.div
            key={`${a.year}-${a.title}-${a.game}-${i}`}
            className={`trophy tone-${AWARD_STYLE[a.kind]}`}
            initial={animated ? { opacity: 0, y: 12, scale: 0.8 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: animated ? Math.min(i, 8) * 0.05 : 0 }}
            title={`${a.title} ${a.year} · ${a.game}`}
          >
            <span className="trophy-icon">
              {a.kind === "chart" ? <Crown size={18} /> : a.kind === "expo" ? <AwardIcon size={18} /> : <Trophy size={18} />}
            </span>
            <strong>{a.title}</strong>
            <small>
              {a.game} · {a.year}
            </small>
          </motion.div>
        ))}
      </div>
      {awards.length > TROPHY_PREVIEW && (
        <button
          className="trophy-toggle"
          aria-expanded={all}
          onClick={() => setAll(!all)}
        >
          {all ? (
            <>
              <ChevronUp size={13} /> Nur die neuesten zeigen
            </>
          ) : (
            <>
              <ChevronDown size={13} /> Alle {awards.length} Auszeichnungen
              zeigen
            </>
          )}
        </button>
      )}
    </Card>
  );
}

function GameCard({
  g,
  newProject,
}: {
  g: ReleasedGame;
  newProject: (sequelOf?: string) => void;
}) {
  const store = useGame();
  const s = store.game;
  const awards = s.awards.filter((a) => a.game === g.name);
  const series = seriesOf(s, g);
  const isLatest = series.at(-1)?.id === g.id;
  const sale = saleBlocker(s, g);
  const dlc = dlcBlocker(s, g);
  const factor = Math.round((g.price / basePrice(g)) * 10) / 10;
  return (
    <Card className="released-game" key={g.id}>
      <div className="released-heading">
        <div className="game-cover">
          <GameArtwork project={g} />
        </div>
        <div>
          <h2>{g.name}</h2>
          <p>
            {g.genre} · {g.theme} · {sizeLabel(g.size)} · Release {dateLabel(g.releasedDay)}
          </p>
          <div className="game-badges">
            {series.length > 1 && (
              <span className="game-badge badge-series">
                <Layers size={11} /> Teil {g.entry ?? 1} von {series.length}
              </span>
            )}
            {awards.length > 0 && (
              <span
                className="game-badge badge-award"
                title={awards.map((a) => `${a.title} ${a.year}`).join(", ")}
              >
                <Trophy size={11} /> {awards.length}{" "}
                {awards.length === 1 ? "Auszeichnung" : "Auszeichnungen"}
              </span>
            )}
            {g.chartPeak !== undefined && (
              <span className={`game-badge badge-chart ${g.chartPeak === 1 ? "badge-top" : ""}`}>
                <Crown size={11} /> Charts-Platz {g.chartPeak}
              </span>
            )}
            {g.publisher && (
              <span className="game-badge">
                <Handshake size={11} /> {g.publisher.name} · {Math.round(g.publisher.share * 100)} %
              </span>
            )}
            {(g.dlcs ?? 0) > 0 && (
              <span className="game-badge">
                <Package size={11} /> {g.dlcs} Erweiterung{g.dlcs === 1 ? "" : "en"}
              </span>
            )}
            {onSale(g, s.day) && (
              <span className="game-badge badge-sale">
                <Percent size={11} /> −{g.sale!.discount * 100} % bis {dateLabel(g.sale!.until)}
              </span>
            )}
          </div>
        </div>
        <div className="review-score">
          <Star size={19} />
          {g.score.toFixed(1)}
          <small>/ 10</small>
        </div>
      </div>
      <div className="detail-grid">
        <span>
          Verkaufte Einheiten<strong>{number(g.units)}</strong>
        </span>
        <span>
          Netto-Umsatz<strong>{money(g.revenue)}</strong>
        </span>
        <span>
          Ergebnis nach Projektbudget
          <strong>{money(g.revenue - g.budget)}</strong>
        </span>
        <span>
          Verkaufspreis<strong>{money(g.price)}</strong>
        </span>
      </div>
      <SalesChart game={g} day={s.day} />
      <div className="reviews">
        {g.reviews.map((r) => (
          <div key={r.magazine}>
            <span>
              {r.magazine}
              <b>{r.score.toFixed(1)}</b>
            </span>
            <p>„{r.text}“</p>
          </div>
        ))}
      </div>
      <div className="game-actions">
        <label className="game-price">
          Preis
          <GameSelect
            compact
            label={`Preis für ${g.name}`}
            value={String(PRICE_STEPS.includes(factor) ? factor : 1)}
            onChange={(v) => store.setPrice(g.id, Number(v))}
            options={PRICE_LEVELS.map((level) => ({
              value: String(level.factor),
              label: `${money(Math.round(basePrice(g) * level.factor))} · ${level.label}`,
              description: level.description,
            }))}
          />
        </label>
        <Button
          secondary
          disabled={!!sale}
          onClick={() => store.startSale(g.id, 0.25)}
          detail={sale ?? "14 Tage −25 %"}
        >
          Rabattaktion
        </Button>
        <Button
          secondary
          disabled={!!sale}
          onClick={() => store.startSale(g.id, 0.5)}
          detail={sale ? undefined : "14 Tage −50 %"}
        >
          Großer Sale
        </Button>
        <Button
          secondary
          disabled={!!dlc}
          onClick={() => store.startDlc(g.id)}
          detail={
            (g.dlcs ?? 0) >= MAX_DLCS
              ? "Maximum erreicht"
              : g.dlcReady !== undefined
                ? `fertig am ${dateLabel(g.dlcReady)}`
                : dlc ?? money(dlcCost(s, g))
          }
        >
          <Package size={14} /> Erweiterung
        </Button>
        <Button
          detail={g.patched ? undefined : money(patchCost(s))}
          secondary
          disabled={g.patched || s.company.cash < patchCost(s)}
          onClick={() => store.patch(g.id)}
        >
          {g.patched ? (
            <>
              <Check size={16} />
              Patch veröffentlicht
            </>
          ) : (
            "Qualitätspatch"
          )}
        </Button>
        {isLatest && g.score >= SEQUEL_MIN_SCORE && (
          <Button onClick={() => newProject(g.id)} detail={`Teil ${(g.entry ?? 1) + 1}`}>
            <Repeat size={14} /> Fortsetzung
          </Button>
        )}
        <Badge tone="neutral">{Math.round(g.hype)} Hype</Badge>
      </div>
    </Card>
  );
}

export default function GamesView({ newProject }: { newProject: (sequelOf?: string) => void }) {
  const s = useGame((store) => store.game);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const active = s.games.filter((g) => isOnSale(g, s.day));
  const archived = s.games.filter((g) => !isOnSale(g, s.day));
  const awardsFor = (g: ReleasedGame) =>
    s.awards.filter((a) => a.game === g.name).length;
  return (
    <div className="stack games-view">
      <TrophyCabinet s={s} />
      {!s.games.length && (
        <Card>
          <Empty icon={<Monitor size={30} />} title="Deine Bibliothek wächst mit dir.">
            Hier erscheinen deine Spiele nach ihrem Release — mit echten Reviews
            und Verkaufszahlen.
          </Empty>
        </Card>
      )}
      {s.games.length > 0 && (
        <div className="games-section-heading">
          <h2>Im Handel</h2>
          <Badge>{active.length}</Badge>
          <small>
            {active.length
              ? "Spiele mit laufenden Verkäufen"
              : "Gerade ist kein Spiel im Handel."}
          </small>
        </div>
      )}
      {active.map((g) => (
        <GameCard key={g.id} g={g} newProject={newProject} />
      ))}
      {archived.length > 0 && (
        <Card className="games-archive">
          <button
            className="games-archive-toggle"
            aria-expanded={archiveOpen}
            onClick={() => setArchiveOpen(!archiveOpen)}
          >
            <Archive size={16} />
            <span>
              <strong>Nicht mehr im Handel</strong>
              <small>
                {archived.length} Spiele ·{" "}
                {money(archived.reduce((n, g) => n + g.revenue, 0))} Umsatz
                {s.retiredGames?.count
                  ? ` · ${s.retiredGames.count} ältere Einträge entfernt`
                  : ""}
              </small>
            </span>
            {archiveOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {archiveOpen && (
            <ul className="archive-list">
              {archived.map((g) => {
                const open = expanded === g.id;
                const awards = awardsFor(g);
                return (
                  <li key={g.id} className={open ? "open" : ""}>
                    <button
                      className="archive-row"
                      aria-expanded={open}
                      onClick={() => setExpanded(open ? null : g.id)}
                    >
                      <span className="archive-score">
                        <Star size={12} />
                        {g.score.toFixed(1)}
                      </span>
                      <span className="archive-name">
                        <strong>{g.name}</strong>
                        <small>
                          {g.genre} · {sizeLabel(g.size)} ·{" "}
                          {date(g.releasedDay).getUTCFullYear()}
                          {g.chartPeak !== undefined && ` · Charts #${g.chartPeak}`}
                          {awards > 0 && ` · ${awards} 🏆`}
                        </small>
                      </span>
                      <span className="archive-figure">
                        <small>Einheiten</small>
                        {number(g.units)}
                      </span>
                      <span className="archive-figure">
                        <small>Umsatz</small>
                        {money(g.revenue)}
                      </span>
                      {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    {open && <GameCard g={g} newProject={newProject} />}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="hint">
            Das Archiv behält bis zu {MAX_ARCHIVED_GAMES} Spiele. Danach werden
            die ältesten Spiele ohne Verkäufe entfernt; ihre Umsätze bleiben in
            den Statistiken.
          </p>
        </Card>
      )}
    </div>
  );
}
