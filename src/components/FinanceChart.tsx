import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { useGame } from "../store/gameStore";
import { money, number, date } from "../game/utils";
import { useId } from "react";
import { useStudioMotion } from "./game/GameMotion";
import {
  MONTHS_VISIBLE,
  prefersYears,
  yearlyFinances,
} from "../game/economy/financialStats";
export type FinanceMetric = "Kapital" | "Umsatz" | "Gewinn";
export type FinanceRange = "auto" | "months" | "years";

const monthLabel = (day: number) =>
  date(day)
    .toLocaleDateString("de-DE", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    })
    .replace(".", "");

const axis = {
  axisLine: false,
  tickLine: false,
  tick: { fill: "#a6bba9", fontSize: 10 },
};
const tooltipStyle = {
  background: "#182f39",
  color: "#eee1c6",
  border: "1px solid #829e8c55",
  borderRadius: 3,
  fontSize: 12,
};
const compact = (v: number) =>
  Math.abs(v) >= 1e6 ? `${number(v / 1e6)} Mio.` : `${number(v / 1000)}k`;

export function FinanceChart({
  cash = false,
  metric,
  range = "auto",
}: {
  cash?: boolean;
  metric?: FinanceMetric;
  range?: FinanceRange;
}) {
  const fillId = useId();
  const animated = useStudioMotion();
  const selected = metric ?? (cash ? "Kapital" : "Umsatz");
  const color =
    selected === "Kapital"
      ? "#a7cad7"
      : selected === "Gewinn"
        ? "#ebc88b"
        : "#bfd4a5";
  const s = useGame((g) => g.game);
  const years = range === "years" || (range === "auto" && prefersYears(s));

  if (years) {
    const data = yearlyFinances(s).map((y) => ({
      name: y.running ? `${y.year}*` : String(y.year),
      Umsatz: Math.round(y.revenue),
      Kosten: Math.round(y.expenses),
      Kapital: Math.round(y.cash),
      Gewinn: Math.round(y.profit),
      running: y.running,
    }));
    return (
      <div className="chart" aria-label={`Finanzverlauf nach Jahren · ${selected}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 15, right: 10, left: -4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#aec7b51c" strokeDasharray="3 5" />
            <XAxis dataKey="name" {...axis} dy={8} interval="preserveStartEnd" />
            <YAxis {...axis} tickFormatter={(v) => compact(Number(v))} />
            <Tooltip
              cursor={{ fill: "#ffffff0a" }}
              formatter={(value) => money(Number(value))}
              labelFormatter={(label) =>
                String(label).endsWith("*") ? `${String(label).slice(0, -1)} · laufendes Jahr` : `Jahr ${label}`
              }
              contentStyle={tooltipStyle}
            />
            {selected === "Gewinn" && <ReferenceLine y={0} stroke="#ebc88b66" strokeDasharray="3 3" />}
            <Bar
              key={selected}
              dataKey={selected}
              radius={[3, 3, 0, 0]}
              maxBarSize={46}
              isAnimationActive={animated}
              animationDuration={600}
            >
              {data.map((d) => (
                <Cell
                  key={d.name}
                  fill={selected === "Gewinn" && d.Gewinn < 0 ? "#e59b7c" : color}
                  fillOpacity={d.running ? 0.45 : 0.9}
                  stroke={d.running ? color : undefined}
                  strokeDasharray={d.running ? "3 3" : undefined}
                />
              ))}
            </Bar>
            {!cash && !metric && (
              <Bar dataKey="Kosten" fill="#b9bcae55" radius={[3, 3, 0, 0]} maxBarSize={46} isAnimationActive={false} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const data = s.finances.slice(-MONTHS_VISIBLE).map((f) => ({
    name: monthLabel(f.day),
    Umsatz: Math.round(f.revenue),
    Kosten: Math.round(f.expenses),
    Kapital: Math.round(f.cash),
    Gewinn: Math.round(f.revenue - f.expenses),
  }));
  return (
    <div className="chart" aria-label={`Finanzverlauf · ${selected}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 15, right: 10, left: -4, bottom: 0 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#aec7b51c" strokeDasharray="3 5" />
          <XAxis dataKey="name" {...axis} dy={8} interval="preserveStartEnd" minTickGap={18} />
          <YAxis {...axis} tickFormatter={(v) => compact(Number(v))} />
          <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
          {selected === "Gewinn" && <ReferenceLine y={0} stroke="#ebc88b66" strokeDasharray="3 3" />}
          <Area
            key={selected}
            type="monotone"
            dataKey={selected}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${fillId})`}
            dot={data.length <= 24 ? { r: 3, fill: color } : false}
            isAnimationActive={animated}
            animationDuration={550}
          />
          {!cash && !metric && (
            <Area
              type="monotone"
              dataKey="Kosten"
              stroke="#b9bcae"
              strokeDasharray="5 4"
              fill="transparent"
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
