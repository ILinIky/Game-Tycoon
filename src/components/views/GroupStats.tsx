import { useMemo } from "react";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { useGame } from "../../store/gameStore";
import { groupStats, holdingsOf } from "../../game/market/holdings";
import {
  buildRanking,
  estimatedWorldRank,
  formatWorldRank,
} from "../../game/leaderboard";
import { money, number } from "../../game/utils";
import { EARNINGS_MULTIPLE } from "../../game/economy/valuation";
import { marketIndex, worldSeed } from "../../game/market/marketCycle";
import { Card, Empty, PanelTitle } from "../ui";
import { useStudioMotion } from "../game/GameMotion";
import GroupPortfolio, { compactEuro } from "../game/GroupPortfolio";

const factor = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const signedEuro = (eur: number) =>
  eur < 0 ? `−${compactEuro(-eur)}` : compactEuro(eur);

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
            stats.studio,
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
  const sp = stats.studioParts;
  const premium = stats.value - stats.fundamental;
  const parts = [
    {
      key: "earnings",
      label: "Ertragswert Studio",
      hint:
        sp.profit > 0
          ? `Ø ${compactEuro(sp.profit)} Betriebsgewinn im Jahr × ${EARNINGS_MULTIPLE}`
          : "Zuletzt kein Betriebsgewinn",
      value: sp.earnings,
    },
    {
      key: "cash",
      label: "Kasse",
      hint: s.company.debt > 0 ? "Kapital abzüglich Kredite" : "Freies Kapital",
      value: sp.cash,
    },
    {
      key: "brand",
      label: "Marke & Fans",
      hint: `${number(s.company.fans)} Fans · Ruf ${Math.round(s.company.reputation)}`,
      value: sp.brand,
    },
    {
      key: "assets",
      label: "Büro & Anlagen",
      hint: s.consoleProject
        ? "Gebäude, Räume und Konsole in Entwicklung"
        : "Gebäude und Räume",
      value: sp.assets,
    },
    {
      key: "subsidiaries",
      label: "Tochterstudios",
      hint: "Jahresgewinn × 10",
      value: stats.subsidiariesValue,
    },
    {
      key: "holdings",
      label: "Beteiligungen",
      hint: "Aktueller Börsenwert der Firmen",
      value: stats.holdingsValue,
    },
    ...(stats.marketCap !== null
      ? [
          {
            key: "premium",
            label: premium >= 0 ? "Börsenaufschlag" : "Börsenabschlag",
            hint: `Anlegerstimmung × ${factor(s.stock!.sentiment)} · Börsenindex × ${factor(marketIndex(s.day))}`,
            value: premium,
          },
        ]
      : []),
  ].filter((p) => Math.round(p.value) !== 0);
  // Positive parts fill the bar; deductions are listed below it.
  const gross = parts.reduce((n, p) => n + Math.max(0, p.value), 0) || 1;
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
            {stats.marketCap !== null
              ? "Bewertet zum Aktienkurs: Substanz und Ertrag mal Anlegerstimmung"
              : "Ertragswert des Studios plus Kasse, Marke, Anlagen, Tochterstudios und Beteiligungen"}
          </small>
        </div>
        <div className="group-composition">
          <div
            className="group-composition-bar"
            role="img"
            aria-label="Zusammensetzung des Gruppenwerts"
          >
            {parts
              .filter((p) => p.value > 0)
              .map((p) => (
                <motion.i
                  key={p.key}
                  className={p.key}
                  initial={animated ? { width: 0 } : false}
                  animate={{ width: `${(p.value / gross) * 100}%` }}
                  transition={{ duration: animated ? 0.6 : 0, ease: "easeOut" }}
                />
              ))}
          </div>
          <ul>
            {parts.map((p) => (
              <li key={p.key} className={p.value < 0 ? "minus" : undefined}>
                <span className={`group-dot ${p.key}`} />
                <span className="group-part">
                  {p.label}
                  <small>{p.hint}</small>
                </span>
                <b>{signedEuro(p.value)}</b>
                <small>
                  {p.value > 0
                    ? `${((p.value / gross) * 100).toLocaleString("de-DE", {
                        maximumFractionDigits: 1,
                      })} %`
                    : ""}
                </small>
              </li>
            ))}
            <li className="group-total">
              <span className="group-dot" />
              <span className="group-part">
                {stats.marketCap !== null ? "Börsenwert" : "Marktwert"}
              </span>
              <b>{compactEuro(stats.value)}</b>
              <small />
            </li>
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
