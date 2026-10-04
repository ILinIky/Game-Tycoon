import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { useGame } from "../../store/gameStore";
import { groupStats } from "../../game/market/holdings";
import {
  buybackCost,
  fairMarketCap,
  IPO_FLOATS,
  ipoBlocker,
  ipoMinimum,
  issueProceeds,
  marketCap,
  ownership,
  QUARTER_DAYS,
  QUARTER_GROWTH,
  sinceIpo,
  STOCK_STEP,
} from "../../game/market/stock";
import { rivalStakeCost } from "../../game/market/rivals";
import { marketIndex } from "../../game/market/marketCycle";
import { dateLabel, money } from "../../game/utils";
import { Button, Card, PanelTitle, Progress } from "../ui";
import GameSelect from "../game/GameSelect";
import { compactEuro } from "../game/GroupPortfolio";

const pct = (n: number, digits = 1) =>
  `${n >= 0 ? "+" : ""}${n.toLocaleString("de-DE", { maximumFractionDigits: digits })} %`;

/** Share price line of the last five years. */
function PriceChart({ points }: { points: { day: number; price: number }[] }) {
  if (points.length < 2)
    return (
      <p className="quiet-empty">Der Kursverlauf beginnt nächste Woche.</p>
    );
  const w = 600;
  const h = 150;
  const min = Math.min(...points.map((p) => p.price));
  const max = Math.max(...points.map((p) => p.price));
  const span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * w;
  const y = (v: number) => h - 8 - ((v - min) / span) * (h - 16);
  const line = points
    .map(
      (p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`,
    )
    .join(" ");
  const up = points.at(-1)!.price >= points[0].price;
  return (
    <svg
      className={`price-chart ${up ? "up" : "down"}`}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Kursverlauf von ${money(points[0].price)} bis ${money(points.at(-1)!.price)}`}
    >
      <path className="price-area" d={`${line} L${w},${h} L0,${h} Z`} />
      <path className="price-line" d={line} />
    </svg>
  );
}

function Ipo() {
  const store = useGame();
  const s = store.game;
  const [float, setFloat] = useState(0.25);
  const blocker = ipoBlocker(s);
  const value = fairMarketCap(s, 1);
  const proceeds = Math.round(value * (float / (1 - float)) * 0.95);
  const fundamental = groupStats(s).fundamental;
  return (
    <Card className="stock-ipo">
      <span className="eyebrow">BÖRSENGANG</span>
      <h2>Bring deine Group an die Börse.</h2>
      <p>
        Investoren kaufen neue Aktien und bringen frisches Kapital. Danach
        erwarten sie jedes Quartal {Math.round((QUARTER_GROWTH - 1) * 100)} %
        mehr Umsatz. Releases, Wertungen und Quartalszahlen bewegen den Kurs.
      </p>
      <div className="stock-requirements">
        <span className={s.company.office >= 3 ? "ok" : ""}>
          Büro: mindestens Studio-Campus
        </span>
        <span className={fundamental >= ipoMinimum(s) ? "ok" : ""}>
          Firmenwert {compactEuro(fundamental)} von {compactEuro(ipoMinimum(s))}
        </span>
      </div>
      <Progress value={Math.min(100, (fundamental / ipoMinimum(s)) * 100)} />
      <div className="stock-ipo-action">
        <label>
          Angebotene Anteile
          <GameSelect
            label="Angebotene Anteile"
            value={String(float)}
            onChange={(v) => setFloat(Number(v))}
            options={IPO_FLOATS.map((f) => ({
              value: String(f),
              label: `${Math.round(f * 100)} % der Aktien`,
              description:
                f <= 0.15
                  ? "Weniger Kapital, sicherer vor Übernahmen"
                  : f >= 0.4
                    ? "Viel Kapital, aber Übernahmen drohen"
                    : "Ausgewogen",
            }))}
          />
        </label>
        <Button
          disabled={!!blocker}
          detail={money(proceeds)}
          onClick={() => store.goPublic(float)}
        >
          <Landmark size={14} /> Börsengang
        </Button>
      </div>
      {blocker && <p className="stock-blocker">{blocker}</p>}
    </Card>
  );
}

export default function StockView() {
  const store = useGame();
  const s = store.game;
  const stock = s.stock;
  if (!stock) return <Ipo />;
  const stake = ownership(stock);
  const change = sinceIpo(stock);
  const quarterRevenue = s.finances
    .filter((f) => f.day >= stock.quarterStart)
    .reduce((n, f) => n + f.revenue, 0);
  const daysLeft = Math.max(0, QUARTER_DAYS - (s.day - stock.quarterStart));
  const mood = stock.sentiment;
  const cycle = marketIndex(s.day);
  const free = stock.shares - stock.owned - stock.rivalStake;
  return (
    <div className="stock-view">
      <section className="stock-hero">
        <div>
          <span className="eyebrow">
            {groupStats(s).name.toUpperCase()} · AKTIE
          </span>
          <strong className="stock-price">{money(stock.price)}</strong>
          <span className={`stock-change ${change >= 0 ? "up" : "down"}`}>
            {change >= 0 ? (
              <ArrowUpRight size={14} />
            ) : (
              <ArrowDownRight size={14} />
            )}
            {pct(change)} seit Börsengang ({money(stock.ipoPrice)})
          </span>
        </div>
        <div className="stock-figures">
          <span>
            <small>Börsenwert</small>
            <b>{compactEuro(marketCap(stock))}</b>
          </span>
          <span>
            <small>Dein Anteil</small>
            <b>{Math.round(stake * 100)} %</b>
          </span>
          <span>
            <small>Wert deiner Aktien</small>
            <b>{compactEuro(stock.owned * stock.price)}</b>
          </span>
          <span>
            <small>Stimmung</small>
            <b className={mood >= 1 ? "up" : "down"}>
              {mood >= 1.15
                ? "Euphorisch"
                : mood >= 1
                  ? "Positiv"
                  : mood >= 0.85
                    ? "Skeptisch"
                    : "Nervös"}
            </b>
          </span>
        </div>
      </section>
      <Card className="stock-chart-card">
        <PanelTitle
          title="Kursverlauf"
          eyebrow={`BÖRSE ${cycle >= 1 ? "IM AUFWIND" : "UNTER DRUCK"} · INDEX ${cycle.toLocaleString("de-DE", { maximumFractionDigits: 2 })}`}
        />
        <PriceChart points={stock.history} />
      </Card>
      <div className="two-columns">
        <Card className="stock-quarter">
          <PanelTitle
            title="Laufendes Quartal"
            eyebrow="WAS DIE AKTIONÄRE ERWARTEN"
          />
          <div className="stock-quarter-figures">
            <span>
              <small>Umsatz bisher</small>
              <b>{money(quarterRevenue)}</b>
            </span>
            <span>
              <small>Ziel</small>
              <b>{money(stock.target)}</b>
            </span>
            <span>
              <small>Bericht in</small>
              <b>{daysLeft} Tagen</b>
            </span>
          </div>
          <Progress
            value={Math.min(100, (quarterRevenue / stock.target) * 100)}
          />
          {stock.lastQuarter && (
            <p className="hint">
              Letztes Quartal ({dateLabel(stock.lastQuarter.day)}):{" "}
              {money(stock.lastQuarter.revenue)} bei Ziel{" "}
              {money(stock.lastQuarter.target)} ·{" "}
              {stock.lastQuarter.revenue >= stock.lastQuarter.target
                ? "Erwartungen übertroffen"
                : "Erwartungen verfehlt"}
            </p>
          )}
        </Card>
        <Card className="stock-actions">
          <PanelTitle title="Kapitalmaßnahmen" eyebrow="AKTIEN & KONTROLLE" />
          <div className="stock-shareholders">
            <span>
              <i className="own" style={{ width: `${stake * 100}%` }} />
              <i
                className="rival"
                style={{ width: `${(stock.rivalStake / stock.shares) * 100}%` }}
              />
            </span>
            <small>
              Du {Math.round(stake * 100)} % · Streubesitz{" "}
              {Math.round((free / stock.shares) * 100)} %
              {stock.rivalStake > 0 &&
                ` · ${stock.rival} ${Math.round((stock.rivalStake / stock.shares) * 100)} %`}
            </small>
          </div>
          <div className="button-row">
            <Button
              secondary
              detail={money(buybackCost(s))}
              disabled={s.company.cash < buybackCost(s) || free <= 0}
              onClick={store.buyBack}
            >
              <TrendingUp size={14} /> Rückkauf {Math.round(STOCK_STEP * 100)} %
            </Button>
            <Button
              secondary
              detail={`+${money(issueProceeds(s))}`}
              onClick={store.issueShares}
            >
              Kapitalerhöhung {Math.round(STOCK_STEP * 100)} %
            </Button>
            {stock.rivalStake > 0 && (
              <Button
                detail={money(rivalStakeCost(s))}
                disabled={s.company.cash < rivalStakeCost(s)}
                onClick={store.buyOutRival}
              >
                <ShieldAlert size={14} /> {stock.rival} auskaufen
              </Button>
            )}
          </div>
          <p className="hint">
            Unter 60 % eigenem Anteil und bei schwachem Kurs versuchen
            Konkurrenten feindliche Übernahmen. In der Branche kannst du
            Unternehmen auch per Aktientausch übernehmen, solange du die
            Mehrheit behältst.
          </p>
        </Card>
      </div>
    </div>
  );
}
