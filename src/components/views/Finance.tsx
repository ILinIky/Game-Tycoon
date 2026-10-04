import { bankruptcyLimit, loanAmount, loanLimit, marketScale, scaled } from "../../game/economy/scale";
import { facilityUpkeep, officeRent } from "../../game/office/office";
import { lab } from "../../game/research/research";
import { Wallet } from "lucide-react";
import { useGame } from "../../store/gameStore";
import { BALANCE } from "../../game/config/balance";
import { money, dateLabel } from "../../game/utils";
import { monthlyCosts } from "../../game/economy/economy";
import { Button, Card, PanelTitle } from "../ui";
import { FinanceChart } from "../FinanceChart";
export default function FinanceView() {
  const store = useGame();
  const s = store.game;
  const ledger = s.finances.at(-1)!;
  return (
    <>
      <div className="stats-grid">
        {[
          ["Kontostand", money(s.company.cash)],
          ["Umsatz / laufender Monat", money(ledger.revenue)],
          ["Monatliche Fixkosten", money(monthlyCosts(s))],
          ["Offene Kredite", money(s.company.debt)],
        ].map(([label, value]) => (
          <Card className="stat-card" key={label}>
            <div className="stat-top">
              {label}
              <Wallet size={17} />
            </div>
            <strong className="stat-value">{value}</strong>
          </Card>
        ))}
      </div>
      <div className="two-columns">
        <Card>
          <PanelTitle title="Kapitalentwicklung" eyebrow="LIQUIDITÄT" />
          <FinanceChart cash />
        </Card>
        <Card className="finance-breakdown">
          <PanelTitle
            title="Das kostet dein Studio"
            eyebrow="MONATLICHE FIXKOSTEN"
          />
          {[
            ["Büromiete", officeRent(s)],
            ["Einrichtungen", facilityUpkeep(s)],
            ["Forschungslabor", scaled(s, lab(s).upkeep)],
            ["Gehälter", s.employees.reduce((n, e) => n + e.salary, 0)],
            [
              "Software & Infrastruktur",
              s.employees.length * scaled(s, BALANCE.softwarePerEmployee),
            ],
            ["Kreditzinsen", s.company.debt * BALANCE.loanInterest],
          ].map(([label, value]) => (
            <div key={label}>
              {label}
              <strong>{money(Number(value))}</strong>
            </div>
          ))}
          <div className="button-row">
            <Button
              secondary
              disabled={s.company.debt + loanAmount(s) > loanLimit(s)}
              onClick={store.loan}
            >
              {money(loanAmount(s))} Kredit aufnehmen
            </Button>
            <Button
              secondary
              disabled={
                !s.company.debt ||
                s.company.cash < Math.min(s.company.debt, loanAmount(s))
              }
              onClick={store.repay}
            >
              Kredit zurückzahlen
            </Button>
          </div>
          <p className="hint">
            0,8 % Zinsen pro Monat · maximal {money(loanLimit(s))}{" "}
            Kreditrahmen. Zahlungsunfähigkeit bei {money(bankruptcyLimit(s))}.
            Alle Preise wachsen mit dem Markt (×
            {marketScale(s).toLocaleString("de-DE", { maximumFractionDigits: 2 })}{" "}
            gegenüber 1990).
          </p>
        </Card>
      </div>
      <Card className="table-card">
        <PanelTitle title="Deine Geschäftsbücher" />
        <table>
          <thead>
            <tr>
              <th>Zeitraum ab</th>
              <th>Umsatz</th>
              <th>Ausgaben</th>
              <th>Cashflow</th>
            </tr>
          </thead>
          <tbody>
            {[...s.finances].reverse().map((f) => (
              <tr key={f.day}>
                <td>{dateLabel(f.day)}</td>
                <td>{money(f.revenue)}</td>
                <td>{money(f.expenses)}</td>
                <td className={f.revenue - f.expenses >= 0 ? "positive" : ""}>
                  {money(f.revenue - f.expenses)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
