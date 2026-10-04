import { motion } from "framer-motion";
import { Lock, Medal } from "lucide-react";
import { useGame } from "../../store/gameStore";
import {
  ACHIEVEMENTS,
  achievementsOf,
  type AchievementCategory,
} from "../../game/progress/achievements";
import { dateLabel } from "../../game/utils";
import { Card } from "../ui";
import { useStudioMotion } from "../game/GameMotion";

const CATEGORIES: AchievementCategory[] = [
  "Spiele",
  "Studio",
  "Wirtschaft",
  "Imperium",
];

export default function AchievementsView() {
  const s = useGame((store) => store.game);
  const animated = useStudioMotion();
  const unlocked = achievementsOf(s);
  const done = ACHIEVEMENTS.filter((a) => unlocked[a.id] !== undefined).length;
  return (
    <div className="achievements-view">
      <section className="achievements-hero">
        <Medal size={30} />
        <div>
          <span className="eyebrow">ERFOLGE & MEILENSTEINE</span>
          <h2>
            {done} von {ACHIEVEMENTS.length} freigeschaltet
          </h2>
          <div
            className="achievements-bar"
            role="progressbar"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={ACHIEVEMENTS.length}
          >
            <motion.i
              initial={animated ? { width: 0 } : false}
              animate={{ width: `${(done / ACHIEVEMENTS.length) * 100}%` }}
              transition={{ duration: animated ? 0.6 : 0 }}
            />
          </div>
        </div>
      </section>
      {CATEGORIES.map((category) => (
        <Card className="achievements-group" key={category}>
          <h3>{category}</h3>
          <ul>
            {ACHIEVEMENTS.filter((a) => a.category === category).map((a) => {
              const day = unlocked[a.id];
              return (
                <li key={a.id} className={day !== undefined ? "unlocked" : ""}>
                  <span className="achievement-icon">
                    {day !== undefined ? (
                      <Medal size={18} />
                    ) : (
                      <Lock size={15} />
                    )}
                  </span>
                  <div>
                    <strong>{a.name}</strong>
                    <small>{a.description}</small>
                  </div>
                  {day !== undefined && <em>{dateLabel(day)}</em>}
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </div>
  );
}
