import type { GameProject } from "../../game/types";

/** Original vector game art. The development preview reveals art as the build advances. */
export default function GameArtwork({
  project,
  preview = false,
}: {
  project: Pick<GameProject, "theme" | "genre" | "progress">;
  preview?: boolean;
}) {
  const space = ["Weltraum", "Sci-Fi", "Cyberpunk"].includes(project.theme);
  const dark = ["Crime", "Zombies"].includes(project.theme);
  const progress = preview ? project.progress : 100;
  return (
    <svg
      className={`game-artwork ${preview && progress < 30 ? "prototype" : ""}`}
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${preview ? "Entwicklungsillustration" : "Spielillustration"}: ${project.theme}`}
    >
      <rect
        width="320"
        height="180"
        fill={space ? "#153848" : dark ? "#353544" : "#53686c"}
      />
      {space ? (
        <>
          {Array.from({ length: 24 }, (_, i) => (
            <circle
              key={i}
              cx={(i * 73 + 17) % 320}
              cy={(i * 37 + 7) % 180}
              r={i % 4 === 0 ? 1.6 : 0.8}
              fill="#d9ddc0"
              opacity=".6"
            />
          ))}
          <circle cx="240" cy="60" r="39" fill="#799a9a" />
          <path
            d="M208 38Q247 48 272 79M206 58Q232 63 258 96"
            fill="none"
            stroke="#acc1ac"
            strokeWidth="7"
            opacity=".5"
          />
          <ellipse
            cx="240"
            cy="65"
            rx="61"
            ry="13"
            fill="none"
            stroke="#dbc8a1"
            strokeWidth="7"
            transform="rotate(-25 240 65)"
          />
          {progress > 30 && (
            <g className={preview ? "preview-ship" : ""}>
              <path d="M95 88l25 29-25 11-17-12z" fill="#e1d6ba" />
              <path d="M95 88l-11 39 25-15z" fill="#7e9697" />
              <path d="M81 122l-13 25 23-18" fill="#eab577" />
              <rect x="93" y="108" width="7" height="9" rx="3" fill="#487780" />
            </g>
          )}
          {progress > 65 && (
            <path
              d="M145 119h18m12-8h11m-7 29h19"
              stroke="#b6d8ab"
              strokeWidth="2"
              className={preview ? "preview-lasers" : ""}
            />
          )}
        </>
      ) : dark ? (
        <>
          <circle cx="240" cy="42" r="22" fill="#d4c7b0" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <g key={i}>
              <rect
                x={i * 49 - 10}
                y={78 - (i % 3) * 16}
                width="42"
                height="110"
                fill={i % 2 ? "#202e39" : "#253441"}
              />
              <path
                d={`M${i * 49 + 3} 90v5m12 7v6m-12 7v5m12 7v5`}
                stroke="#c5ac70"
                strokeWidth="5"
              />
            </g>
          ))}
          {progress > 30 && (
            <g className={preview ? "preview-hero" : ""}>
              <ellipse cx="126" cy="159" rx="20" ry="4" fill="#131e28" />
              <circle cx="126" cy="112" r="7" fill="#d5b797" />
              <path d="M119 122h14l6 28h-28z" fill="#be9368" />
              <path
                d="M120 147l-4 12m16-12l4 12"
                stroke="#263a44"
                strokeWidth="5"
              />
            </g>
          )}
          <path d="M0 170h320" stroke="#799b99" strokeWidth="2" />
        </>
      ) : (
        <>
          <circle cx="245" cy="44" r="26" fill="#d6ce9e" />
          <path
            d="M0 119L55 60l56 59 45-62 80 74 37-35 47 37v47H0"
            fill="#819487"
          />
          <path d="M0 147l82-61 67 69 67-52 104 37v40H0" fill="#405f5b" />
          <path d="M0 156Q100 122 180 156T320 153V180H0z" fill="#7c9d7d" />
          {progress > 30 && (
            <g>
              <path d="M208 129v-32h11v-15h10v15h11v32" fill="#c7c1a6" />
              <path d="M203 99h42l-21-18z" fill="#876761" />
              <rect x="220" y="111" width="9" height="18" fill="#3d5758" />
            </g>
          )}
          {progress > 55 && (
            <g className={preview ? "preview-hero" : ""}>
              <circle cx="106" cy="137" r="5" fill="#d8b894" />
              <path d="M101 143h10l4 16H97z" fill="#c3a76a" />
              <path
                d="M102 157l-3 10m9-10l4 10"
                stroke="#3b555a"
                strokeWidth="4"
              />
              <path d="M114 146l10-10" stroke="#d7d7bd" strokeWidth="3" />
            </g>
          )}
          {[25, 58, 280, 302].map((x, i) => (
            <path
              key={x}
              d={`M${x} ${142 - i * 4}l-12 25h24z`}
              fill="#375951"
            />
          ))}
        </>
      )}
      {preview && progress < 30 && (
        <g stroke="#b5cec1" opacity=".35" fill="none">
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M${i * 40} 0v180M0 ${i * 30}h320`} />
          ))}
        </g>
      )}
    </svg>
  );
}
