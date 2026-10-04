import { motion } from "framer-motion";
import { Rocket, ArrowRight, Star } from "lucide-react";
import type { ReleasedGame } from "../../game/types";
import { Modal } from "../ui";
import GameArtwork from "./GameArtwork";
import type { CSSProperties } from "react";

export default function ReleaseShow({
  game,
  onClose,
  onArchive,
  animated,
}: {
  game: ReleasedGame;
  onClose: () => void;
  onArchive: () => void;
  animated: boolean;
}) {
  return (
    <Modal title="Der Release" className="release-modal" wide onClose={onClose}>
      <div className="release-show">
        <div className="release-spotlight">
          <div className="release-orbit" />
          {animated && (
            <div className="release-confetti" aria-hidden="true">
              {Array.from({ length: 28 }, (_, i) => (
                <i
                  key={i}
                  style={
                    {
                      "--x": `${(i * 37) % 100}%`,
                      "--color": ["#edc889", "#a3d3b9", "#c19ccc"][i % 3],
                      "--duration": `${3.5 + (i % 5) * 0.4}s`,
                      "--delay": `${0.2 + (i % 7) * 0.12}s`,
                      "--drift": `${(i % 2 ? 1 : -1) * (20 + ((i * 11) % 90))}px`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}
          <motion.div
            className="release-box"
            initial={animated ? { y: 40, rotate: -8, opacity: 0 } : false}
            animate={{ y: 0, rotate: -8, opacity: 1 }}
            transition={{ type: "spring", stiffness: 90 }}
          >
            <GameArtwork project={game} />
            <span>
              {game.genre} / {game.theme}
            </span>
            <h1>{game.name}</h1>
            <small>DEIN STUDIO PRÄSENTIERT</small>
          </motion.div>
          <span className="release-stamp">
            <Rocket size={14} />
            JETZT VERÖFFENTLICHT
          </span>
        </div>
        <div className="release-verdict">
          <span className="eyebrow">DEINE IDEE IST JETZT EIN SPIEL</span>
          <h2>{game.name}</h2>
          <div className="release-rating">
            <Star size={20} />
            <strong>{game.score.toFixed(1)}</strong>
            <span>
              / 10<small>Gesamtwertung</small>
            </span>
          </div>
          <p>Die ersten Kritiken sind da. Ab morgen starten die Verkäufe.</p>
          <div className="release-reviews">
            {game.reviews.map((review, i) => (
              <motion.div
                key={review.magazine}
                initial={animated ? { opacity: 0, x: 16 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: animated ? 0.35 + i * 0.23 : 0 }}
              >
                <span>
                  {review.magazine}
                  <b>{review.score.toFixed(1)}</b>
                </span>
                <p>„{review.text}“</p>
              </motion.div>
            ))}
          </div>
          <div className="button-row">
            <button className="game-action" onClick={onClose}>
              Zurück ins Studio <ArrowRight size={16} />
            </button>
            <button className="game-action secondary" onClick={onArchive}>
              Spielearchiv
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
