import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, HandCoins } from "lucide-react";
import { useGame } from "../../store/gameStore";
import {
  fairSalary,
  poachDaysLeft,
  retentionSalary,
  teamRaiseCost,
  unrestReasons,
} from "../../game/employees/perks";
import { money } from "../../game/utils";
import { Button } from "../ui";

const ORDER = { poach: 0, salary: 1, raise: 2 } as const;

/** Open staff decisions shown directly in the studio, so nobody leaves unnoticed. */
export default function StaffAlert({
  animated,
  onJournal,
}: {
  animated: boolean;
  onJournal: () => void;
}) {
  const { game: s, decision } = useGame();
  const open = s.events
    .filter((ev) =>
      ev.decision === "raise"
        ? true
        : (ev.decision === "poach" || ev.decision === "salary") &&
          s.employees.some((e) => e.id === ev.target),
    )
    .sort(
      (a, b) =>
        ORDER[a.decision as keyof typeof ORDER] -
          ORDER[b.decision as keyof typeof ORDER] || a.day - b.day,
    );
  const event = open[0];
  const employee = s.employees.find((e) => e.id === event?.target);
  let content = null;
  if (event?.decision === "poach" && employee) {
    const reasons = unrestReasons(employee, s);
    const days = poachDaysLeft(s, event.day);
    content = {
      tone: "danger",
      title: `${employee.name} will kündigen`,
      body: `${reasons.length ? `Grund: ${reasons.join(", ")}. ` : ""}Ohne Gegenangebot verlässt ${employee.name} das Studio in ${days} ${days === 1 ? "Tag" : "Tagen"}.`,
      accept: "Gegenangebot",
      detail: `${money(retentionSalary(employee, s))} / Monat`,
      decline: "Ziehen lassen",
    };
  } else if (event?.decision === "salary" && employee) {
    content = {
      tone: "warning",
      title: `${employee.name} möchte mehr Gehalt`,
      body: `Aktuell ${money(employee.salary)}, Marktwert ${money(fairSalary(employee, s))}. Ohne Erhöhung sinkt die Loyalität, bis Konkurrenten abwerben.`,
      accept: "Gehalt erhöhen",
      detail: `${money(Math.max(employee.salary, fairSalary(employee, s)))} / Monat`,
      decline: "Ablehnen",
    };
  } else if (event?.decision === "raise") {
    content = {
      tone: "warning",
      title: "Dein Team wünscht sich mehr Gehalt",
      body: "+8 % für alle, mindestens bis zum Marktwert. Ablehnen kostet Motivation und Loyalität.",
      accept: "Gehälter erhöhen",
      detail: `+${money(teamRaiseCost(s))} / Monat`,
      decline: "Ablehnen",
    };
  }
  return (
    <AnimatePresence>
      {event && content && (
        <motion.aside
          key={event.id}
          className={`staff-alert ${content.tone}`}
          role="alertdialog"
          aria-label={content.title}
          initial={animated ? { opacity: 0, y: -14 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={animated ? { opacity: 0, y: -10 } : { opacity: 0 }}
          transition={{ duration: animated ? 0.25 : 0 }}
        >
          <span className="staff-alert-icon">
            {content.tone === "danger" ? (
              <AlertTriangle size={18} />
            ) : (
              <HandCoins size={18} />
            )}
          </span>
          <div className="staff-alert-copy">
            <strong>{content.title}</strong>
            <p>{content.body}</p>
            {open.length > 1 && (
              <button className="staff-alert-more" onClick={onJournal}>
                +{open.length - 1} weitere im Journal
              </button>
            )}
          </div>
          <div className="staff-alert-actions">
            <Button
              detail={content.detail}
              onClick={() => decision(event.id, true)}
            >
              {content.accept}
            </Button>
            <Button secondary onClick={() => decision(event.id, false)}>
              {content.decline}
            </Button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
