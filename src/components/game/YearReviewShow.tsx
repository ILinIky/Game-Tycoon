import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Star,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import type { YearReview } from "../../game/types";
import { money } from "../../game/utils";
import { Modal } from "../ui";
import Confetti from "./Confetti";
import { useCountUp } from "./useCountUp";

/** Animated summary shown on New Year's Day. */
export default function YearReviewShow({
  review,
  onClose,
  animated,
}: {
  review: YearReview;
  onClose: () => void;
  animated: boolean;
}) {
  const profit = review.revenue - review.expenses;
  const revenue = useCountUp(review.revenue, animated, 1300, 300);
  const profitAnim = useCountUp(profit, animated, 1300, 450);
  const fans = useCountUp(review.fansGained, animated, 1100, 600);
  const max = Math.max(review.revenue, review.expenses, 1);
  const item = (i: number) => ({
    initial: animated ? { opacity: 0, y: 14 } : (false as const),
    animate: { opacity: 1, y: 0 },
    transition: { delay: animated ? 0.15 + i * 0.12 : 0 },
  });
  return (
    <Modal
      title={`Jahresrückblick ${review.year}`}
      className="year-modal"
      wide
      onClose={onClose}
    >
      <div className="year-review">
        {animated && profit > 0 && <Confetti count={26} />}
        <motion.div className="year-hero" {...item(0)}>
          <span className="year-number">{review.year}</span>
          <div>
            <span className="eyebrow">DEIN JAHR IN ZAHLEN</span>
            <h2>
              {profit > 0
                ? "Ein erfolgreiches Jahr für dein Studio."
                : "Ein Jahr voller Lektionen."}
            </h2>
          </div>
        </motion.div>
        <div className="year-grid">
          <motion.div className="year-tile" {...item(1)}>
            <span>Umsatz</span>
            <strong>{money(revenue)}</strong>
            <div className="year-bars">
              <i
                className="rev"
                style={{ width: `${(review.revenue / max) * 100}%` }}
              />
              <i
                className="exp"
                style={{ width: `${(review.expenses / max) * 100}%` }}
              />
            </div>
            <small>Kosten {money(review.expenses)}</small>
          </motion.div>
          <motion.div
            className={`year-tile ${profit >= 0 ? "good" : "bad"}`}
            {...item(2)}
          >
            <span>Gewinn</span>
            <strong>
              {profit >= 0 ? (
                <TrendingUp size={16} />
              ) : (
                <TrendingDown size={16} />
              )}
              {money(profitAnim)}
            </strong>
            <small>Kapital zum Jahresende {money(review.cash)}</small>
          </motion.div>
          <motion.div className="year-tile" {...item(3)}>
            <span>Fans</span>
            <strong>
              <Users size={16} /> {fans >= 0 ? "+" : ""}
              {Math.round(fans).toLocaleString("de-DE")}
            </strong>
            <small>
              Team {review.staff} ({review.staffChange >= 0 ? "+" : ""}
              {review.staffChange}) · Ruf {review.reputation}
            </small>
          </motion.div>
          <motion.div className="year-tile" {...item(4)}>
            <span>Firmenwert</span>
            <strong>
              <Building2 size={16} /> {money(review.valuation)}
            </strong>
            <small>
              {review.released}{" "}
              {review.released === 1 ? "Release" : "Releases"}
              {review.released > 0 && ` · Ø ${review.avgScore.toFixed(1)}`}
            </small>
          </motion.div>
        </div>
        {review.best && (
          <motion.div className="year-best" {...item(5)}>
            <Star size={18} />
            <div>
              <span>Bestes Spiel des Jahres</span>
              <strong>{review.best.name}</strong>
            </div>
            <b>{review.best.score.toFixed(1)}</b>
          </motion.div>
        )}
        {review.awards.length > 0 && (
          <motion.div className="year-awards" {...item(6)}>
            {review.awards.map((a) => (
              <span key={a}>
                <Trophy size={12} /> {a}
              </span>
            ))}
          </motion.div>
        )}
        <button className="game-action" onClick={onClose}>
          Auf ins neue Jahr <ArrowRight size={16} />
        </button>
      </div>
    </Modal>
  );
}
