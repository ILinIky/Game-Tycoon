import type { Award, Genre, GameState } from "../game/types";
import type { IsometricPainter, Point } from "./drawing";

// --- Tageszeit & Jahreszeit ------------------------------------------------

export type Season = "winter" | "spring" | "summer" | "autumn";
export interface Environment {
  /** 0 = night, 1 = full daylight. */
  daylight: number;
  /** 0–1 warm golden-hour tint around sunrise and sunset. */
  dusk: number;
  season: Season;
  /** December decorations. */
  festive: boolean;
}

let realtime = true;
try {
  realtime = localStorage.getItem("studio-zero-daylight") !== "off";
} catch {
  /* storage unavailable: keep default */
}
/** Lighting follows the player's local clock unless switched off. */
export const realtimeLighting = () => realtime;
export function setRealtimeLighting(on: boolean) {
  realtime = on;
  try {
    localStorage.setItem("studio-zero-daylight", on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const bump = (x: number, center: number, width: number) =>
  Math.max(0, 1 - Math.abs(x - center) / width);

export function computeEnvironment(day: number, now = new Date()): Environment {
  const month = new Date(Date.UTC(1990, 0, 1 + day)).getUTCMonth();
  const season: Season =
    month === 11 || month <= 1
      ? "winter"
      : month <= 4
        ? "spring"
        : month <= 7
          ? "summer"
          : "autumn";
  const h = now.getHours() + now.getMinutes() / 60;
  const daylight = realtime ? (h < 12 ? smooth(5.5, 8, h) : 1 - smooth(18, 21, h)) : 1;
  const dusk = realtime ? Math.max(bump(h, 7, 1.3), bump(h, 19.3, 1.7)) : 0.12;
  return { daylight, dusk, season, festive: month === 11 };
}

let current: Environment = computeEnvironment(0);
export const env = () => current;
export const setEnvironment = (e: Environment) => {
  current = e;
};

// --- Lichtquellen für die Nacht -------------------------------------------

interface Light {
  p: Point;
  r: number;
  rgb: string;
  strength: number;
}
let lights: Light[] = [];
export const beginLights = () => {
  lights = [];
};
export function addLight(p: Point, r: number, rgb: string, strength: number) {
  lights.push({ p, r, rgb, strength });
}

/** Stars, moon and dusk glow on the outside sky (drawn before the room). */
export function skyMood(c: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const e = current;
  const night = 1 - e.daylight;
  if (e.dusk > 0) {
    const g = c.createLinearGradient(0, h * 0.25, 0, h * 0.75);
    g.addColorStop(0, "rgba(255,150,90,0)");
    g.addColorStop(1, `rgba(255,150,90,${0.18 * e.dusk})`);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }
  if (night > 0.05) {
    c.save();
    for (let i = 0; i < 70; i++) {
      const x = (i * 211.7) % w;
      const y = ((i * 97.3) % (h * 0.55)) + 4;
      c.globalAlpha = night * (0.45 + Math.sin(t * 1.3 + i) * 0.35);
      c.fillStyle = "#fff6dc";
      c.fillRect(x, y, i % 5 ? 1.2 : 2, i % 5 ? 1.2 : 2);
    }
    c.globalAlpha = night;
    c.fillStyle = "#f3ead0";
    c.beginPath();
    c.arc(w * 0.82, h * 0.16, 16, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#1a2c3e";
    c.beginPath();
    c.arc(w * 0.82 + 7, h * 0.16 - 4, 14, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  if (e.season === "winter") snowfall(c, w, h, t, 60, 0.5);
}

function snowfall(c: CanvasRenderingContext2D, w: number, h: number, t: number, n: number, alpha: number) {
  c.save();
  c.fillStyle = "#ffffff";
  for (let i = 0; i < n; i++) {
    const x = (((i * 131.9 + Math.sin(t * 0.6 + i) * 18) % w) + w) % w;
    const y = (i * 71.3 + t * (14 + (i % 4) * 5)) % h;
    c.globalAlpha = alpha * (0.4 + (i % 3) * 0.25);
    c.beginPath();
    c.arc(x, y, i % 4 === 0 ? 2 : 1.2, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

/** Night darkness over the whole scene, then glowing light sources. */
export function nightPass(c: CanvasRenderingContext2D, w: number, h: number) {
  const e = current;
  const night = 1 - e.daylight;
  if (e.dusk > 0) {
    c.save();
    c.globalCompositeOperation = "soft-light";
    c.fillStyle = `rgba(255,160,90,${0.2 * e.dusk})`;
    c.fillRect(0, 0, w, h);
    c.restore();
  }
  if (night < 0.03) return;
  c.save();
  c.fillStyle = `rgba(8,18,42,${0.5 * night})`;
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = "lighter";
  for (const l of lights) {
    const g = c.createRadialGradient(l.p.x, l.p.y, 0, l.p.x, l.p.y, l.r);
    g.addColorStop(0, `rgba(${l.rgb},${0.55 * l.strength * night})`);
    g.addColorStop(1, `rgba(${l.rgb},0)`);
    c.fillStyle = g;
    c.fillRect(l.p.x - l.r, l.p.y - l.r, l.r * 2, l.r * 2);
  }
  c.restore();
}

// --- Fenster: Wetter & Saison ---------------------------------------------

/** Called inside the clipped window: night sky and seasonal particles. */
export function windowWeather(
  p: IsometricPainter,
  point: (a: number, z: number) => Point,
  wide: number,
  t: number,
) {
  const e = current;
  const c = p.ctx;
  const night = 1 - e.daylight;
  if (night > 0.03) {
    const a = point(0, 62),
      b = point(wide, 140);
    c.fillStyle = `rgba(12,24,52,${0.8 * night})`;
    c.fillRect(Math.min(a.x, b.x) - 60 * p.scale, Math.min(a.y, b.y) - 60 * p.scale, 220 * p.scale, 220 * p.scale);
    for (let i = 0; i < 6; i++) {
      const q = point((i * 0.29) % wide, 110 + ((i * 17) % 26));
      c.fillStyle = `rgba(255,246,220,${night * 0.8})`;
      c.fillRect(q.x, q.y, 1.4 * p.scale, 1.4 * p.scale);
    }
    for (let i = 0; i < 5; i++) {
      const q = point(wide * ((i + 0.5) / 5), 66 + ((i * 7) % 12));
      c.fillStyle = `rgba(240,196,120,${night * 0.7})`;
      c.fillRect(q.x, q.y, 2.5 * p.scale, 3 * p.scale);
    }
  }
  if (e.dusk > 0) {
    const a = point(0, 62),
      b = point(wide, 100);
    c.fillStyle = `rgba(255,150,90,${0.22 * e.dusk})`;
    c.fillRect(Math.min(a.x, b.x) - 60 * p.scale, Math.min(a.y, b.y) - 30 * p.scale, 220 * p.scale, 120 * p.scale);
  }
  const particles = e.season === "summer" ? 0 : 9;
  for (let i = 0; i < particles; i++) {
    const fall = (t * (e.season === "winter" ? 9 : 6) + i * 17) % 80;
    const drift = (i * 0.17 + Math.sin(t * 0.8 + i) * 0.08 + (e.season === "autumn" ? fall * 0.004 : 0)) % wide;
    const q = point(Math.max(0.08, Math.min(wide - 0.08, drift)), 140 - fall);
    if (e.season === "winter") p.ellipse(q, 1.6, 1.6, "#ffffffdd");
    else if (e.season === "autumn") p.ellipse(q, 2.6, 1.4, i % 2 ? "#d9873e" : "#c25b34");
    else p.ellipse(q, 1.8, 1.3, i % 2 ? "#f3b8c8" : "#ffe1ea");
  }
}

/** Snow on the window sill in winter. */
export function windowSill(p: IsometricPainter, point: (a: number, z: number) => Point, wide: number) {
  if (current.season !== "winter") return;
  p.line([point(0.03, 59), point(wide * 0.5, 60), point(wide - 0.03, 59)], "#f7f9fb", 4);
}

// --- Dezember-Deko ----------------------------------------------------------

export function festiveDecor(p: IsometricPainter, rw: number, rh: number, t: number) {
  if (!current.festive) return;
  const colors = ["#e85d5d", "#f2c14e", "#6fc6a0", "#7aa7e8"];
  const n = Math.floor(rw * 2.2);
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const x = 0.15 + (i / n) * (rw - 0.3);
    pts.push(p.point(x, 0.05, 166 - Math.sin((i / n) * Math.PI * 4) * 4));
  }
  p.line(pts, "#2f5a3a", 2);
  pts.forEach((q, i) => {
    if (i % 2) return;
    const on = Math.sin(t * 3 + i) > -0.2;
    const color = colors[(i / 2) % colors.length];
    p.ellipse(q, 2.4, 2.4, on ? color : "#4b5a55");
    if (on) addLight(q, 16 * p.scale, "255,210,140", 0.5);
  });
  // Small tree in the free strip at the front of the office.
  const x = 1.7,
    y = rh - 0.5;
  p.ellipse(p.point(x, y), 16, 7, "#30251c22");
  p.box(x - 0.08, y - 0.08, 0.16, 0.16, 0, 10, ["#a8774a", "#6e4a2c", "#87603a"]);
  for (let i = 0; i < 4; i++) {
    const base = p.point(x, y, 10 + i * 14);
    const r = 22 - i * 5;
    p.polygon(
      [
        { x: base.x - r * p.scale, y: base.y },
        { x: base.x + r * p.scale, y: base.y },
        { x: base.x, y: base.y - 20 * p.scale },
      ],
      i % 2 ? "#3f7a4f" : "#356b45",
    );
  }
  for (let i = 0; i < 6; i++) {
    const q = p.point(x + ((i % 3) - 1) * 0.08, y, 16 + i * 8);
    p.ellipse(q, 2, 2, Math.sin(t * 2.5 + i) > 0 ? colors[i % 4] : "#f6e7b0");
  }
  const star = p.point(x, y, 72);
  p.text("★", { x: star.x, y: star.y + 4 * p.scale }, 13, "#f2c14e");
  addLight(star, 30 * p.scale, "255,215,120", 0.9);
}

// --- Erfolge: Poster, Pokale, Spielhüllen ----------------------------------

const GENRE_HUE: Record<Genre, string> = {
  Action: "#c96a54",
  RPG: "#7d6bb0",
  Strategie: "#5d8a6a",
  Simulation: "#4f8aa8",
  Adventure: "#b08a4f",
  Sport: "#5aa07a",
  Racing: "#c4574f",
  Horror: "#6b4f6b",
  Puzzle: "#c9a24f",
};
function tint(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0");
  return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}
export const boxColors = (genre: Genre): [string, string, string] => {
  const base = GENRE_HUE[genre] ?? "#718b75";
  return [tint(base, 1.25), tint(base, 0.7), base];
};

/** Framed posters of the best own games on free wall areas. */
export function gamePosters(p: IsometricPainter, s: GameState, rw: number, rh: number) {
  const best = [...s.games].filter((g) => g.score >= 7).sort((a, b) => b.score - a.score);
  if (!best.length) return;
  const spots: ((a: number, z: number) => Point)[] = [];
  spots.push((a, z) => p.point(0.045, 0.3 + a, z));
  if (rh > 6.4) spots.push((a, z) => p.point(0.045, 5.05 + a, z));
  for (let x = 4.65; x + 0.95 < rw - 2.15; x += 1.15) {
    const x0 = x;
    spots.push((a, z) => p.point(x0 + a, 0.045, z));
  }
  spots.slice(0, best.length).forEach((at, i) => {
    const g = best[i];
    const hue = GENRE_HUE[g.genre] ?? "#718b75";
    p.polygon([at(0, 72), at(0.9, 72), at(0.9, 146), at(0, 146)], "#6e5638");
    p.polygon([at(0.05, 76), at(0.85, 76), at(0.85, 142), at(0.05, 142)], tint(hue, 0.85));
    p.polygon([at(0.05, 76), at(0.85, 76), at(0.85, 96), at(0.05, 96)], tint(hue, 0.55));
    p.polygon([at(0.1, 96), at(0.38, 122), at(0.6, 104), at(0.8, 118), at(0.8, 96)], tint(hue, 1.2));
    p.ellipse(at(0.62, 130), 5, 5, "#f6e3b0");
    const label = at(0.45, 84);
    p.text(g.name.slice(0, 12).toUpperCase(), { x: label.x, y: label.y }, 5.5, "#f6eedc");
    if (i === 0) {
      const star = at(0.82, 140);
      p.text("★", { x: star.x, y: star.y }, 9, "#f2c14e");
    }
  });
}

const TROPHY: Record<Award["kind"], [string, string]> = {
  goty: ["#f0cc6a", "#a87d2c"],
  indie: ["#dfe5e8", "#8a9399"],
  expo: ["#d8955c", "#8a5630"],
  chart: ["#9fdcb5", "#4f8a67"],
};

/** Trophy cups on the archive shelf. */
export function shelfTrophies(p: IsometricPainter, s: GameState, rh: number, t: number) {
  s.awards.slice(-5).forEach((a, i) => {
    const x = 0.83,
      y = rh - 1.0 + i * 0.14;
    const [light, dark] = TROPHY[a.kind];
    p.box(x - 0.04, y - 0.04, 0.08, 0.08, 60, 3, ["#5d4632", "#3e2f22", "#4c3a29"]);
    p.line([p.point(x, y, 63), p.point(x, y, 69)], dark, 2);
    p.ellipse(p.point(x, y, 74), 4.2, 5, light);
    p.ellipse(p.point(x - 0.035, y, 74), 1.6, 2.4, dark);
    if (Math.sin(t * 2 + i * 1.7) > 0.85) p.text("✦", p.point(x + 0.05, y, 82), 6, "#fff6d0");
  });
}

// --- Stimmung der Mitarbeiter ----------------------------------------------

export function moodBubble(p: IsometricPainter, at: Point, icon: string, life: number) {
  const c = p.ctx;
  const pop = Math.min(1, life * 4) * Math.min(1, (1 - life) * 4);
  if (pop <= 0) return;
  c.save();
  c.globalAlpha = pop;
  c.translate(at.x, at.y - (1 - pop) * 4 * p.scale);
  c.scale(p.scale * (0.85 + pop * 0.15), p.scale * (0.85 + pop * 0.15));
  c.fillStyle = "#f7f1e2";
  c.strokeStyle = "#3a4f52";
  c.lineWidth = 1;
  c.beginPath();
  c.roundRect(-11, -22, 22, 18, 6);
  c.moveTo(-3, -4);
  c.lineTo(0, 2);
  c.lineTo(3, -4);
  c.fill();
  c.stroke();
  c.font = '12px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = "#3a4f52";
  c.fillText(icon, 0, -13);
  c.restore();
}

export function stressCloud(p: IsometricPainter, at: Point, t: number) {
  const c = p.ctx;
  c.save();
  c.translate(at.x, at.y + Math.sin(t * 2) * 1.5 * p.scale);
  c.scale(p.scale, p.scale);
  c.fillStyle = "#7d8a8e";
  for (const [x, y, r] of [
    [-6, 0, 5],
    [0, -3, 6],
    [6, 0, 5],
    [0, 2, 5],
  ])
    c.beginPath(), c.arc(x, y, r, 0, Math.PI * 2), c.fill();
  if (Math.sin(t * 6) > 0) {
    c.strokeStyle = "#f2c14e";
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(1, 5);
    c.lineTo(-2, 10);
    c.lineTo(2, 10);
    c.lineTo(-1, 15);
    c.stroke();
  }
  c.restore();
}

/** Screen-space confetti over the office after a release. */
export function officeConfetti(c: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const colors = ["#edc889", "#a3d3b9", "#c19ccc", "#e9a37f", "#7aa7e8"];
  c.save();
  for (let i = 0; i < 70; i++) {
    const x = ((i * 97.3 + Math.sin(t + i) * 30) % w + w) % w;
    const y = (i * 53.1 + t * (60 + (i % 5) * 18)) % (h * 0.9);
    c.save();
    c.translate(x, y);
    c.rotate(t * 3 + i);
    c.fillStyle = colors[i % colors.length];
    c.globalAlpha = 0.85;
    c.fillRect(-3, -1.5, 6, 3);
    c.restore();
  }
  c.restore();
}
