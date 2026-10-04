import { useId, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReleasedGame } from "../../game/types";
import { dateLabel, number, money } from "../../game/utils";
import {
  salesLifetime,
  salesMonth,
  salesPhase,
} from "../../game/economy/salesHistory";
import { useStudioMotion } from "./GameMotion";

export default function SalesChart({
  game,
  day,
  compact = false,
  series,
}: {
  game: ReleasedGame;
  day: number;
  compact?: boolean;
  series?: ReturnType<typeof salesMonth>;
}) {
  const animated = useStudioMotion();
  const chartId = useId();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const month = series ?? salesMonth(game, day, monthOffset);
  const phase = series
    ? { label: "Gesamtübersicht", tone: "growth", active: true }
    : salesPhase(game, day);
  const displayName = series ? "Alle aktiven Spiele" : game.name;
  const trackedFrom = Math.max(
    game.releasedDay + 1,
    game.salesHistory?.[0]?.day ?? day,
  );
  const canPrevious = month.firstDay > trackedFrom;
  const currentIndex = month.points.findIndex((point) => point.day === day);
  const lastIndex = month.points.reduce(
    (last, point, index) => (point.future ? last : index),
    -1,
  );
  const cursorIndex =
    selected ?? (currentIndex >= 0 ? currentIndex : lastIndex);
  const cursor = month.points[cursorIndex];
  const peak = Math.max(1, ...month.points.map((point) => point.units ?? 0));
  const scale =
    peak <= 5
      ? 5
      : Math.ceil(peak / (peak >= 100 ? 50 : 10)) * (peak >= 100 ? 50 : 10);
  const width = 420,
    left = 27,
    right = 8,
    baseline = 104,
    chartHeight = 86;
  const step = (width - left - right) / month.points.length;
  const x = (index: number) => left + (index + 0.5) * step;
  const y = (units: number) => baseline - (units / scale) * chartHeight;
  const changeMonth = (offset: number) => {
    setMonthOffset(offset);
    setSelected(null);
  };
  const cursorDescription = cursor
    ? `${dateLabel(cursor.day)}: ${cursor.future ? "noch kein Spieltag" : cursor.units === null ? "nicht aufgezeichnet" : `${number(cursor.units)} Verkäufe`}`
    : "Keine Verkaufsdaten";

  return (
    <section
      className={`sales-chart ${compact ? "compact" : ""}`}
      aria-label={`Verkaufsverlauf von ${displayName}`}
    >
      <header className="sales-chart-header">
        <div>
          <span className="sales-eyebrow">VERKAUFSVERLAUF</span>
          <h3>{month.label}</h3>
        </div>
        <div className="sales-month-nav">
          <button
            aria-label="Vorheriger Verkaufsmonat"
            disabled={!canPrevious || compact}
            onClick={() => changeMonth(monthOffset - 1)}
          >
            <ChevronLeft size={13} />
          </button>
          <button
            aria-label="Aktuellen Verkaufsmonat anzeigen"
            disabled={monthOffset === 0}
            onClick={() => changeMonth(0)}
          >
            Heute
          </button>
          <button
            aria-label="Nächster Verkaufsmonat"
            disabled={monthOffset >= 0 || compact}
            onClick={() => changeMonth(monthOffset + 1)}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </header>
      <div className="sales-summary">
        <strong>
          {month.hasHistory || !month.partial ? number(month.units) : "—"}
        </strong>
        <span>{month.partial ? "erfasste Verkäufe" : "Verkäufe im Monat"}</span>
        <span className={`sales-phase ${phase.tone}`}>{phase.label}</span>
      </div>
      <svg
        viewBox="0 0 420 124"
        role="img"
        tabIndex={0}
        aria-label={`${displayName}, ${month.label}. ${cursorDescription}. Pfeiltasten wählen einen Tag.`}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            setSelected(
              Math.max(
                0,
                Math.min(
                  lastIndex,
                  cursorIndex + (event.key === "ArrowLeft" ? -1 : 1),
                ),
              ),
            );
          }
        }}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const plotX = ((event.clientX - rect.left) / rect.width) * width;
          setSelected(
            Math.max(
              0,
              Math.min(
                month.points.length - 1,
                Math.floor((plotX - left) / step),
              ),
            ),
          );
        }}
        onPointerLeave={() => setSelected(null)}
      >
        <defs>
          <linearGradient id={chartId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#bbd9b7" />
            <stop offset="1" stopColor="#698f83" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((fraction) => (
          <g key={fraction}>
            <line
              x1={left}
              x2={width - right}
              y1={y(scale * fraction)}
              y2={y(scale * fraction)}
              stroke="#b5cbb523"
              strokeDasharray="2 5"
            />
            <text
              x={left - 6}
              y={y(scale * fraction) + 3}
              textAnchor="end"
              className="sales-axis-label"
            >
              {number(scale * fraction)}
            </text>
          </g>
        ))}
        {month.points.map((point, index) => (
          <g key={point.date}>
            {point.units !== null ? (
              <motion.rect
                x={x(index) - step * 0.3}
                width={step * 0.6}
                rx={2}
                initial={false}
                animate={{
                  y: y(point.units),
                  height: Math.max(
                    point.units > 0 ? 1.5 : 0,
                    (point.units / scale) * chartHeight,
                  ),
                }}
                transition={{ duration: animated ? 0.28 : 0, ease: "easeOut" }}
                fill={index === cursorIndex ? "#ebc88b" : `url(#${chartId})`}
              />
            ) : (
              <rect
                x={x(index) - 1}
                y={baseline - 2}
                width={2}
                height={2}
                fill={point.future ? "#b5cbb533" : "#d3b588"}
              />
            )}
            {(point.date === 1 ||
              (point.date % 5 === 0 && month.points.length - point.date >= 3) ||
              point.date === month.points.length) && (
              <text
                x={x(index)}
                y={baseline + 15}
                textAnchor="middle"
                className="sales-axis-label"
              >
                {point.date}
              </text>
            )}
          </g>
        ))}
        {cursor && (
          <motion.g
            initial={false}
            animate={{ x: x(cursorIndex) }}
            transition={{ duration: animated ? 0.22 : 0 }}
          >
            <line
              x1={0}
              x2={0}
              y1={9}
              y2={baseline}
              stroke="#ebc88b88"
              strokeDasharray="2 3"
            />
            <circle cx={0} cy={8} r={3} fill="#ebc88b" />
          </motion.g>
        )}
      </svg>
      <div className="sales-chart-footer">
        <span>
          {cursor ? dateLabel(cursor.day).slice(0, 7) : "—"}
          <strong>
            {cursor?.future
              ? "Noch offen"
              : cursor?.units === null || !cursor
                ? "Nicht erfasst"
                : `${number(cursor.units)} Verkäufe`}
          </strong>
        </span>
        <span>
          {compact ? "Monatsumsatz" : "Netto-Umsatz im Monat"}
          <strong>
            {month.hasHistory || !month.partial ? money(month.revenue) : "—"}
          </strong>
        </span>
      </div>
      {!compact && (
        <>
          <p className="sales-chart-note">
            {month.partial
              ? "Fehlende Tage wurden nicht aufgezeichnet. Summen umfassen nur erfasste Tage; deine bisherigen Gesamtverkäufe bleiben erhalten."
              : "Balken = tatsächlich verkaufte Einheiten pro Tag. Helle Markierung = ausgewählter Tag; zukünftige Tage bleiben offen."}
          </p>
          <div className="sales-lifetime">
            <span>Verkaufsfenster · {salesLifetime(game)} Tage</span>
            <span>
              {phase.active
                ? `${Math.max(0, salesLifetime(game) - (day - game.releasedDay))} Tage verbleiben`
                : "Verkaufsphase abgeschlossen"}
            </span>
            <div>
              <motion.i
                initial={false}
                animate={{
                  width: `${Math.min(100, (Math.max(0, day - game.releasedDay) / salesLifetime(game)) * 100)}%`,
                }}
                transition={{ duration: animated ? 0.4 : 0 }}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
