import { useGame } from "../../store/gameStore";
import { money, number } from "../../game/utils";
import { Card, PanelTitle } from "../ui";
import { FinanceChart, type FinanceMetric } from "../FinanceChart";
import { useState } from "react";
import { Coins, BarChart3, TrendingUp, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { useStudioMotion } from "../game/GameMotion";
import {
  financialStats,
  prefersYears,
  yearlyFinances,
} from "../../game/economy/financialStats";
import { studioValue } from "../../game/economy/valuation";
import { gameTotals } from "../../game/projects/archive";
export default function StatisticsView() {
  const store = useGame();
  const s = store.game;
  const totals = financialStats(s);
  const games = gameTotals(s);
  const [metric, setMetric] = useState<FinanceMetric>("Gewinn");
  // Long-running studios read better by year; the player can switch anytime.
  const [range, setRange] = useState<"months" | "years">(() =>
    prefersYears(s) ? "years" : "months",
  );
  const years = yearlyFinances(s);
  const running = years.at(-1);
  const finishedYears = years.filter((y) => !y.running);
  const profitableYears = finishedYears.filter((y) => y.profit > 0).length;
  const byYear = range === "years";
  const score = byYear
    ? { good: profitableYears, total: finishedYears.length, unit: "Jahre" }
    : {
        good: totals.profitablePeriods,
        total: totals.completedPeriods,
        unit: "Perioden",
      };
  const animated = useStudioMotion();
  const metrics = [
    {
      key: "Kapital" as const,
      icon: Coins,
      value: totals.capital,
      sub: "Verfügbares Studiokapital",
      period: totals.capital,
    },
    {
      key: "Umsatz" as const,
      icon: BarChart3,
      value: totals.totalRevenue,
      sub: "Alle erfassten Einnahmen",
      period: totals.periodRevenue,
    },
    {
      key: "Gewinn" as const,
      icon: TrendingUp,
      value: totals.totalProfit,
      sub: "Einnahmen minus alle Kosten",
      period: totals.periodProfit,
    },
  ];
  return (
    <>
      <section
        className="studio-financials"
        aria-label="Kapital, Umsatz und Gewinn"
      >
        <div className="financial-intro">
          <span className="eyebrow">
            DEIN STUDIO · DIE ZAHLEN HINTER DEN SPIELEN
          </span>
          <h2>Vom ersten Verkauf zum erfolgreichen Studio.</h2>
          <p>Wähle eine Kennzahl und sieh, wie dein Studio wächst.</p>
        </div>
        <div className="financial-metrics">
          {metrics.map(({ key, icon: Icon, value, sub, period }) => (
            <motion.button
              key={key}
              className={`financial-metric ${metric === key ? "selected" : ""} ${value < 0 ? "in-loss" : ""}`}
              aria-pressed={metric === key}
              onClick={() => setMetric(key)}
              whileHover={animated ? { y: -2 } : undefined}
            >
              <span>
                <Icon size={17} />
                {key}
              </span>
              <strong>{money(value)}</strong>
              <small>{sub}</small>
              <b>
                {key === "Kapital"
                  ? "Aktueller Kontostand"
                  : byYear && running
                    ? `Laufendes Jahr: ${money(key === "Umsatz" ? running.revenue : running.profit)}`
                    : `Laufende Periode: ${money(period)}`}
              </b>
            </motion.button>
          ))}
        </div>
        <div className="financial-chart-heading">
          <h3>
            {metric === "Gewinn"
              ? "Was von deinen Einnahmen bleibt"
              : metric === "Umsatz"
                ? "Deine Einnahmen über die Zeit"
                : "Dein Kapital über die Zeit"}
          </h3>
          <div className="chart-range" role="group" aria-label="Zeitraum">
            {(["months", "years"] as const).map((r) => (
              <button
                key={r}
                className={range === r ? "selected" : ""}
                aria-pressed={range === r}
                onClick={() => setRange(r)}
              >
                {r === "months" ? "Monate" : "Jahre"}
              </button>
            ))}
          </div>
          <span>
            {byYear
              ? `${years.length} ${years.length === 1 ? "Jahr" : "Jahre"} · laufendes Jahr gestrichelt`
              : `${totals.periodDays}/30 Tage · laufende Periode`}
          </span>
        </div>
        <FinanceChart metric={metric} range={range} />
        <div className="financial-score">
          <Trophy size={17} />
          <span>
            <strong>
              {score.good}/{score.total} {score.unit} profitabel
            </strong>
            <small>
              {score.total
                ? byYear
                  ? "Jedes Gewinnjahr bringt dein Studio weiter."
                  : "Jede grüne Periode bringt dein Studio weiter."
                : byYear
                  ? "Dein erstes Jahr läuft noch."
                  : "Deine erste Periode läuft noch."}
            </small>
          </span>
          <div
            role="progressbar"
            aria-label={`Anteil profitabler abgeschlossener ${score.unit}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={score.total ? (score.good / score.total) * 100 : 0}
          >
            <motion.i
              initial={false}
              animate={{
                width: `${score.total ? (score.good / score.total) * 100 : 0}%`,
              }}
              transition={{ duration: animated ? 0.5 : 0 }}
            />
          </div>
        </div>
        <p className="financial-note">
          Perioden umfassen 30 Spieltage; die Monatsansicht zeigt die letzten
          drei Jahre. Die Jahresansicht fasst alle Perioden nach Kalenderjahr
          zusammen und öffnet sich automatisch, sobald dein Studio länger als
          drei Jahre besteht. Gewinn = erfasste Einnahmen minus
          Entwicklung, Personal, Miete und weitere Kosten; Startkapital und
          Kredite sind kein Gewinn. Umsatz zeigt deine Einnahmen nach
          Verkaufsgebühren.
        </p>
      </section>
      <div className="stats-grid">
        {[
          ["Veröffentlichte Spiele", games.count],
          ["Verkaufte Einheiten", games.units],
          ["Spieleumsatz", money(games.revenue)],
          [
            "Ø Review",
            games.avgScore === null
              ? "—"
              : games.avgScore.toFixed(1) + " / 10",
          ],
          ["Firmenwert", money(studioValue(s).total)],
          ["Mitarbeiter", s.employees.length],
          ["Fans", s.company.fans],
          ["Erforschte Technologien", s.technologies.length],
          ["Auszeichnungen", s.awards.length],
          ["Erledigte Aufträge", s.contracts.completed],
          ["Tochterstudios", s.subsidiaries.length],
          ["Beste Chartplatzierung", games.bestChart === null ? "—" : `#${games.bestChart}`],
        ].map(([label, v]) => (
          <Card className="stat-card" key={label}>
            <div className="stat-top">{label}</div>
            <strong className="stat-value">
              {typeof v === "number" ? number(v) : v}
            </strong>
          </Card>
        ))}
      </div>
      {s.yearReviews.length > 0 && (
        <Card className="table-card chronicle">
          <PanelTitle title="Studiochronik" eyebrow="JAHR FÜR JAHR" />
          <table>
            <thead>
              <tr>
                <th>Jahr</th>
                <th>Releases</th>
                <th>Bestes Spiel</th>
                <th>Umsatz</th>
                <th>Gewinn</th>
                <th>Auszeichnungen</th>
              </tr>
            </thead>
            <tbody>
              {s.yearReviews.map((r) => (
                <tr key={r.year}>
                  <td>{r.year}</td>
                  <td>{r.released}</td>
                  <td>{r.best ? `${r.best.name} (${r.best.score.toFixed(1)})` : "—"}</td>
                  <td>{money(r.revenue)}</td>
                  <td className={r.revenue - r.expenses >= 0 ? "positive" : "negative"}>
                    {money(r.revenue - r.expenses)}
                  </td>
                  <td>{r.awards.length ? `🏆 ${r.awards.length}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Card className="table-card">
        <PanelTitle title="Deine erfolgreichsten Spiele" />
        <table>
          <thead>
            <tr>
              <th>Spiel</th>
              <th>Genre</th>
              <th>Review</th>
              <th>Einheiten</th>
              <th>Netto-Umsatz</th>
            </tr>
          </thead>
          <tbody>
            {[...s.games]
              .sort((a, b) => b.revenue - a.revenue)
              .map((g) => (
                <tr key={g.id}>
                  <td>{g.name}</td>
                  <td>{g.genre}</td>
                  <td>{g.score}</td>
                  <td>{number(g.units)}</td>
                  <td>{money(g.revenue)}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {!s.games.length && (
          <p className="quiet-empty">
            Dein erster Release bringt die ersten Daten.
          </p>
        )}
      </Card>
    </>
  );
}
