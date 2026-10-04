import { motion } from "framer-motion";
import {
  Building,
  Building2,
  Coins,
  PiggyBank,
  TrendingUp,
} from "lucide-react";
import { useGame } from "../../store/gameStore";
import {
  groupStats,
  holdingsOf,
  currentValue,
  incomeBonus,
  monthlyProfit,
  SALE_SHARE,
  subsidiaryValue,
} from "../../game/market/holdings";
import { scaled } from "../../game/economy/scale";
import { formatRankingValue, marketSnapshot } from "../../game/leaderboard";
import { date, money } from "../../game/utils";
import { Button } from "../ui";
import { useStudioMotion } from "./GameMotion";

/** Compact euro value for large company values (e.g. "1,2 Mrd. €"). */
export const compactEuro = (eur: number) =>
  formatRankingValue(eur * marketSnapshot.usdPerEur, "EUR");

interface Member {
  key: string;
  name: string;
  kind: string;
  value: number;
  monthly: number;
  earned: number | null;
  since: number;
  holding: boolean;
  /** Price change since purchase in percent. */
  change: number | null;
}

/** Profit overview of the player's group with all owned companies. */
export default function GroupPortfolio({ sell = false }: { sell?: boolean }) {
  const store = useGame();
  const s = store.game;
  const animated = useStudioMotion();
  const stats = groupStats(s);
  const bonus = incomeBonus(s);
  const members: Member[] = [
    ...holdingsOf(s).map((h) => {
      const value = currentValue(h, s.day);
      const paid = h.paid ?? h.value;
      return {
        key: h.id,
        name: h.name,
        kind: `${h.id} · ${h.sector}`,
        value,
        monthly: Math.round(monthlyProfit({ ...h, value }) * bonus),
        earned: h.earned,
        since: h.since,
        holding: true,
        change: ((value - paid) / paid) * 100,
      };
    }),
    ...s.subsidiaries.map((x) => ({
      key: `subsidiary-${x.name}`,
      name: x.name,
      kind: "Tochterstudio",
      value: subsidiaryValue(s, x.income),
      monthly: Math.round(scaled(s, x.income) * bonus),
      earned: null,
      since: x.since,
      holding: false,
      change: null,
    })),
  ].sort((a, b) => b.monthly - a.monthly);
  const top = Math.max(1, ...members.map((m) => m.monthly));
  if (!members.length)
    return (
      <div className="group-portfolio empty">
        <Building2 size={22} />
        <p>
          Noch keine Übernahmen. Jede gekaufte Firma bildet die{" "}
          <strong>{stats.name}</strong> und zahlt dir monatlich ihren Gewinn
          aus.
        </p>
      </div>
    );
  const tiles = [
    {
      icon: TrendingUp,
      label: "Gewinn pro Monat",
      value: money(stats.monthlyIncome),
    },
    {
      icon: Coins,
      label: "Gewinn pro Jahr",
      value: money(stats.monthlyIncome * 12),
    },
    {
      icon: PiggyBank,
      label: "Bisher ausgezahlt",
      value: money(stats.earned),
    },
    {
      icon: Building,
      label: "Wert der Übernahmen",
      value: compactEuro(stats.holdingsValue + stats.subsidiariesValue),
    },
  ];
  return (
    <div className="group-portfolio">
      <div className="group-tiles">
        {tiles.map(({ icon: Icon, label, value }) => (
          <div className="group-tile" key={label}>
            <span>
              <Icon size={14} /> {label}
            </span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <ul className="group-members">
        {members.map((m) => (
          <li key={m.key} className={m.holding ? "" : "subsidiary"}>
            <div className="group-member-name">
              <strong>{m.name}</strong>
              <small>
                {m.kind} · seit {date(m.since).getUTCFullYear()}
                {m.earned !== null && ` · bisher ${money(m.earned)}`}
              </small>
            </div>
            <div
              className="group-member-bar"
              role="img"
              aria-label={`${m.name}: ${money(m.monthly)} Gewinn pro Monat`}
            >
              <motion.i
                initial={animated ? { width: 0 } : false}
                animate={{ width: `${(m.monthly / top) * 100}%` }}
                transition={{ duration: animated ? 0.5 : 0, ease: "easeOut" }}
              />
            </div>
            <div className="group-member-profit">
              <b>+{money(m.monthly)}</b>
              <small>
                / Monat · Wert {compactEuro(m.value)}
                {m.change !== null && (
                  <em className={m.change >= 0 ? "up" : "down"}>
                    {" "}
                    {m.change >= 0 ? "+" : ""}
                    {m.change.toLocaleString("de-DE", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    %
                  </em>
                )}
              </small>
            </div>
            {sell && m.holding && (
              <Button
                secondary
                detail={money(Math.round(m.value * SALE_SHARE))}
                onClick={() => store.sellCompany(m.key)}
              >
                Verkaufen
              </Button>
            )}
          </li>
        ))}
      </ul>
      <p className="hint">
        Börsenkurse schwanken mit dem Markt: Kaufe günstig, verkaufe teuer. Der
        Gewinn folgt dem aktuellen Wert und schwankt monatlich um ±15 %. Ein
        Verkauf bringt {Math.round(SALE_SHARE * 100)} % des aktuellen Werts.
      </p>
    </div>
  );
}
