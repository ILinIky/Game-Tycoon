import type { CSSProperties } from "react";

/** Falling confetti, reusing the release-show animation. */
export default function Confetti({ count = 28 }: { count?: number }) {
  return (
    <div className="release-confetti" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          style={
            {
              "--x": `${(i * 37) % 100}%`,
              "--color": ["#edc889", "#a3d3b9", "#c19ccc", "#e9a37f"][i % 4],
              "--duration": `${3.5 + (i % 5) * 0.4}s`,
              "--delay": `${0.2 + (i % 7) * 0.12}s`,
              "--drift": `${(i % 2 ? 1 : -1) * (20 + ((i * 11) % 90))}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
