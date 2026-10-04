import { motion } from "framer-motion";
import { ArrowRight, Award, Flame, Users } from "lucide-react";
import type { ExpoResult } from "../../game/types";
import { BOOTHS } from "../../game/marketing/expo";
import { Modal } from "../ui";
import Confetti from "./Confetti";
import { useCountUp } from "./useCountUp";

/** Animated recap of the player's GameExpo appearance. */
export default function ExpoShow({
  result,
  onClose,
  animated,
}: {
  result: ExpoResult;
  onClose: () => void;
  animated: boolean;
}) {
  const hype = useCountUp(result.hype, animated, 900, 400);
  const fans = useCountUp(result.fans, animated, 1200, 500);
  return (
    <Modal
      title={`GameExpo ${result.year}`}
      className="expo-modal"
      wide
      onClose={onClose}
    >
      <div className={`expo-show ${animated ? "animated" : ""}`}>
        <div className="expo-stage">
          <span className="expo-beam left" />
          <span className="expo-beam right" />
          <div className="expo-booth">
            <span className="expo-banner">
              {BOOTHS[result.booth].name.toUpperCase()}
            </span>
            <div className="expo-screens">
              {result.projects.map((name, i) => (
                <motion.span
                  key={name}
                  initial={animated ? { opacity: 0, scale: 0.8 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: animated ? 0.3 + i * 0.2 : 0 }}
                >
                  {name}
                </motion.span>
              ))}
            </div>
          </div>
          <div className="expo-crowd" aria-hidden>
            {Array.from({ length: 18 }, (_, i) => (
              <i
                key={i}
                style={{
                  animationDelay: `${(i % 6) * 0.15}s`,
                  left: `${3 + i * 5.4}%`,
                }}
              />
            ))}
          </div>
          {result.award && animated && <Confetti count={34} />}
        </div>
        <div className="expo-summary">
          <span className="eyebrow">DEIN MESSEAUFTRITT</span>
          {result.award ? (
            <motion.div
              className="expo-award"
              initial={animated ? { opacity: 0, y: 14, scale: 0.9 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: animated ? 0.9 : 0,
                type: "spring",
                stiffness: 160,
              }}
            >
              <Award size={26} />
              <div>
                <strong>Best of Show</strong>
                <small>{result.award}</small>
              </div>
            </motion.div>
          ) : (
            <h2>Die Presse kennt jetzt deinen Namen.</h2>
          )}
          <div className="expo-stats">
            <div>
              <Flame size={16} />
              <strong>+{Math.round(hype)}</strong>
              <span>Hype pro Spiel</span>
            </div>
            <div>
              <Users size={16} />
              <strong>+{Math.round(fans).toLocaleString("de-DE")}</strong>
              <span>neue Fans</span>
            </div>
          </div>
          <div className="expo-quotes">
            {result.reactions.map((r, i) => (
              <motion.p
                key={r}
                initial={animated ? { opacity: 0, x: 14 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: animated ? 0.6 + i * 0.25 : 0 }}
              >
                {r}
              </motion.p>
            ))}
          </div>
          <button className="game-action" onClick={onClose}>
            Zurück ins Studio <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
