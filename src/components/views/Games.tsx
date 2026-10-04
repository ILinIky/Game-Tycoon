import { motion } from "framer-motion";
import {
  Award as AwardIcon,
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
import { money, number, dateLabel } from "../../game/utils";
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
  PRICE_STEPS,
  saleBlocker,
} from "../../game/projects/pricing";
import type { Award, GameState } from "../../game/types";

const AWARD_STYLE: Record<Award["kind"], string> = {
  goty: "gold",
  indie: "silver",
  expo: "bronze",
  chart: "chart",
};

function TrophyCabinet({ s }: { s: GameState }) {
  const animated = useStudioMotion();
  if (!s.awards.length) return null;
  return (
    <Card className="trophy-cabinet">
      <div className="trophy-head">
        <Trophy size={18} />
        <h3>Trophäenschrank</h3>
        <span>{s.awards.length} Auszeichnungen</span>
      </div>
      <div className="trophy-shelf">
        {[...s.awards].reverse().map((a, i) => (
          <motion.div
            key={`${a.year}-${a.title}-${a.game}`}
            className={`trophy ${AWARD_STYLE[a.kind]}`}
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
    </Card>
  );
}

export default function GamesView({ newProject }: { newProject: (sequelOf?: string) => void }) {
  const store = useGame();
  const s = store.game;
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
      {s.games.map((g) => {
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
                  {g.genre} · {g.theme} · {g.size} · Release {dateLabel(g.releasedDay)}
                </p>
                <div className="game-badges">
                  {series.length > 1 && (
                    <span className="game-badge badge-series">
                      <Layers size={11} /> Teil {g.entry ?? 1} von {series.length}
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
                  options={PRICE_STEPS.map((f) => ({
                    value: String(f),
                    label: money(Math.round(basePrice(g) * f)),
                    description:
                      f < 1 ? "Mehr Käufer, mehr Fans" : f > 1 ? "Lohnt bei starken Wertungen" : "Marktüblich",
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
      })}
    </div>
  );
}
