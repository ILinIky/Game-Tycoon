import { useMemo } from "react";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { useGame } from "../../store/gameStore";
import { groupStats, holdingsOf } from "../../game/market/holdings";
import { worldSeed } from "../../game/market/marketCycle";
import {
  buildRanking,
  estimatedWorldRank,
  formatWorldRank,
} from "../../game/leaderboard";
import { money } from "../../game/utils";
import { Card, Empty, PanelTitle } from "../ui";
import { useStudioMotion } from "../game/GameMotion";
import GroupPortfolio, { compactEuro } from "../game/GroupPortfolio";

export default function GroupStatsView() {
  const s = useGame((store) => store.game);
  const animated = useStudioMotion();
  const stats = useMemo(() => groupStats(s), [s]);
  const ranking = useMemo(
    () =>
      stats.active
        ? buildRanking(
            s.company,
            {
              name: stats.name,
              value: stats.value,
              members: holdingsOf(s).map((h) => h.id),
            },
            {
              day: s.day,
              seed: worldSeed(s),
              owned: holdingsOf(s).map((h) => h.id),
            },
          )
        : [],
    [s, stats],
  );
  const entry = ranking.find((x) => x.group);
  if (!stats.active || !entry)
    return (
      <Card>
        <Empty icon={<Building2 size={28} />} title={stats.name}>
          Deine Group entsteht mit der ersten Übernahme. Suche in der Branche
          nach einem Unternehmen und kaufe es zum Marktwert. Danach siehst du
          hier Marktwert, Gewinne und den Platz in der Weltrangliste.
        </Empty>
      </Card>
    );
  const parts = [
    { key: "studio", label: "Dein Studio", value: stats.studio },
    {
      key: "subsidiaries",
      label: "Tochterstudios",
      value: stats.subsidiariesValue,
    },
    { key: "holdings", label: "Beteiligungen", value: stats.holdingsValue },
  ].filter((p) => p.value > 0);
  const figures = [
    [
      stats.marketCap !== null ? "Börsenwert der Group" : "Marktwert der Group",
      compactEuro(stats.value),
    ],
    ["Weltrang", formatWorldRank(estimatedWorldRank(entry.valueUsd))],
    ["Firmenvergleich", `#${entry.rank} von ${ranking.length}`],
    ["Unternehmen", String(stats.companies + 1)],
  ];
  return (
    <>
      <section className="group-hero" aria-label="Kennzahlen deiner Group">
        <div>
          <span className="eyebrow">STATISTIK GROUP</span>
          <h2>{stats.name}</h2>
          <strong title={money(stats.value)}>{compactEuro(stats.value)}</strong>
          <small>
            Simulierter Marktwert aus Studio, Tochterstudios und Beteiligungen
          </small>
        </div>
        <div className="group-composition">
          <div
            className="group-composition-bar"
            role="img"
            aria-label="Zusammensetzung des Gruppenwerts"
          >
            {parts.map((p) => (
              <motion.i
                key={p.key}
                className={p.key}
                initial={animated ? { width: 0 } : false}
                animate={{ width: `${(p.value / stats.value) * 100}%` }}
                transition={{ duration: animated ? 0.6 : 0, ease: "easeOut" }}
              />
            ))}
          </div>
          <ul>
            {parts.map((p) => (
              <li key={p.key}>
                <span className={`group-dot ${p.key}`} />
                {p.label}
                <b>{compactEuro(p.value)}</b>
                <small>
                  {((p.value / stats.value) * 100).toLocaleString("de-DE", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  %
                </small>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <div className="stats-grid">
        {figures.map(([label, value]) => (
          <Card className="stat-card" key={label}>
            <div className="stat-top">{label}</div>
            <strong className="stat-value">{value}</strong>
          </Card>
        ))}
      </div>
      <Card className="table-card">
        <PanelTitle
          title="Unternehmen der Group"
          eyebrow="GEWINN JE UNTERNEHMEN"
        />
        <GroupPortfolio />
      </Card>
    </>
  );
}
