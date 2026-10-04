import { useState, type KeyboardEvent, type PointerEvent } from "react";
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

/** Marked points: roughly one per quarter plus the first and the latest. */
const markedPoints = (count: number) => {
  const step = Math.max(1, Math.ceil((count - 1) / 20));
  const marks = new Set<number>([0, count - 1]);
  for (let i = count - 1; i >= 0; i -= step) marks.add(i);
  return [...marks].sort((a, b) => a - b);
};

/** Share price line of the last five years; hover or arrow keys show values. */
function PriceChart({ points }: { points: { day: number; price: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (points.length < 2)
    return (
      <p className="quiet-empty">Der Kursverlauf beginnt nächste Woche.</p>
    );
  const w = 600;
  const h = 150;
  const last = points.length - 1;
  const min = Math.min(...points.map((p) => p.price));
  const max = Math.max(...points.map((p) => p.price));
  const span = max - min || 1;
  const x = (i: number) => (i / last) * w;
  const y = (v: number) => h - 8 - ((v - min) / span) * (h - 16);
  const line = points
    .map(
      (p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`,
    )
    .join(" ");
  const up = points[last].price >= points[0].price;
  const price = (v: number) =>
    v.toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: v < 100 ? 2 : 0,
    });
  // Dots are HTML so they stay round although the SVG stretches.
  const at = (i: number) => ({
    left: `${(i / last) * 100}%`,
    top: `${(y(points[i].price) / h) * 100}%`,
  });
  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    setActive(Math.round(rel * last));
  };
  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(last);
    else if (e.key === "Escape") setActive(null);
    else if (step)
      setActive((i) => Math.min(last, Math.max(0, (i ?? last) + step)));
    else return;
    e.preventDefault();
  };
  const point = active === null ? null : points[active];
  const change = (from: number, to: number) => ((to - from) / from) * 100;
  return (
    <div className={`price-chart-frame ${up ? "up" : "down"}`}>
      <div className="price-chart-axis" aria-hidden>
        <span>{price(max)}</span>
        <span>{price((max + min) / 2)}</span>
        <span>{price(min)}</span>
      </div>
      <div className="price-chart-plot">
        <div
          className="price-chart-area"
          tabIndex={0}
          role="group"
          aria-label={`Kursverlauf von ${money(points[0].price)} bis ${money(points[last].price)}. Pfeiltasten zeigen einzelne Wochen.`}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setActive(null);
          }}
          onKeyDown={keys}
          onBlur={() => setActive(null)}
        >
          <svg
            className="price-chart"
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            {[8, h / 2, h - 8].map((gy) => (
              <line
                key={gy}
                className="price-grid"
                x1="0"
                x2={w}
                y1={gy}
                y2={gy}
              />
            ))}
            <path className="price-area" d={`${line} L${w},${h} L0,${h} Z`} />
            <path className="price-line" d={line} />
          </svg>
          {markedPoints(points.length).map((i) => (
            <i
              key={i}
              className={`price-dot${i === last ? " latest" : ""}`}
              style={at(i)}
            />
          ))}
          {point && active !== null && (
            <>
              <i className="price-cursor" style={{ left: at(active).left }} />
              <i className="price-dot active" style={at(active)} />
              <div
                className={`price-tooltip${active / last > 0.6 ? " flip" : ""}${y(point.price) / h < 0.35 ? " below" : ""}`}
                style={at(active)}
                role="status"
              >
                <small>
                  {dateLabel(point.day)}
                  {active === last && " · aktuell"}
                </small>
                <b>{price(point.price)}</b>
                {active > 0 && (
                  <span
                    className={
                      point.price >= points[active - 1].price ? "up" : "down"
                    }
                  >
                    {pct(change(points[active - 1].price, point.price))} zur
                    Vorwoche
                  </span>
                )}
                {active < last && (
                  <span
                    className={
                      points[last].price >= point.price ? "up" : "down"
                    }
                  >
                    {pct(change(point.price, points[last].price))} bis heute
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        <div className="price-chart-dates" aria-hidden>
          <span>{dateLabel(points[0].day)}</span>
          <span>{dateLabel(points[last].day)}</span>
        </div>
      </div>
    </div>
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
          Firmenwert {compactEuro(fundamental)} · nötig{" "}
          {compactEuro(ipoMinimum(s))}
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
