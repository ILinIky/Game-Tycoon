import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  ChartNoAxesCombined,
  ArrowUpRight,
} from "lucide-react";
import { useGame } from "../../store/gameStore";
import {
  combinedSalesMonth,
  salesMonth,
  salesPhase,
} from "../../game/economy/salesHistory";
import { number, money } from "../../game/utils";
import SalesChart from "./SalesChart";
import { useStudioMotion } from "./GameMotion";
import GameSelect from "./GameSelect";

function initiallyCollapsed() {
  try {
    const preference = localStorage.getItem("studio-zero-sales-collapsed");
    if (preference) return preference === "yes";
  } catch {
    /* optional preference */
  }
  return window.matchMedia("(max-width: 720px)").matches;
}
export default function SalesMonitor({ onOpen }: { onOpen: () => void }) {
  const { games, day } = useGame((store) => store.game);
  const active = games.filter((game) => salesPhase(game, day).active);
  const animated = useStudioMotion();
  const [selectedId, setSelectedId] = useState("all");
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const selected = active.find((game) => game.id === selectedId) ?? active[0];
  if (!selected) return null;
  const combined =
    active.length > 1 &&
    (selectedId === "all" || !active.some((game) => game.id === selectedId));
  const monthSeries = combined ? combinedSalesMonth(active, day)! : undefined;
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("studio-zero-sales-collapsed", next ? "yes" : "no");
    } catch {
      /* optional preference */
    }
  };
  return (
    <motion.aside
      className={`sales-monitor ${collapsed ? "collapsed" : ""}`}
      aria-label="Aktive Spieleverkäufe"
      initial={animated ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        className="sales-monitor-toggle"
        onClick={toggle}
        aria-expanded={!collapsed}
      >
        <ChartNoAxesCombined size={15} />
        <span>
          Verkäufe <small>{active.length} aktiv</small>
        </span>
        {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            className="sales-monitor-body"
            initial={animated ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: animated ? 0.25 : 0 }}
          >
            <div className="sales-game-picker">
              <GameSelect
                compact
                label="Spiel für Verkaufsanzeige"
                value={combined ? "all" : selected.id}
                onChange={setSelectedId}
                options={[
                  ...(active.length > 1
                    ? [
                        {
                          value: "all",
                          label: `Alle Releases (${active.length})`,
                          description: "Gemeinsamer Verkaufsverlauf",
                        },
                      ]
                    : []),
                  ...active.map((game) => ({
                    value: game.id,
                    label: game.name,
                    description: `${salesPhase(game, day).label} · ${salesMonth(game, day).todayUnits === null ? "Heute noch nicht erfasst" : `${number(salesMonth(game, day).todayUnits!)} Verkäufe heute`}`,
                  })),
                ]}
              />
              <button
                onClick={onOpen}
                aria-label="Verkäufe im Spielearchiv öffnen"
              >
                <ArrowUpRight size={15} />
              </button>
            </div>
            <SalesChart
              game={selected}
              day={day}
              compact
              key={combined ? "all" : selected.id}
              series={monthSeries}
            />
            {combined && (
              <div
                className="sales-release-list"
                aria-label="Aktive Releases im Überblick"
              >
                {active.map((game) => (
                  <button key={game.id} onClick={() => setSelectedId(game.id)}>
                    <span>{game.name}</span>
                    <strong>
                      {money(salesMonth(game, day).revenue)}
                      <small>im Monat</small>
                    </strong>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
