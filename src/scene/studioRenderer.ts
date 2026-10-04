import type { Employee, GameState } from "../game/types";
import { OFFICES } from "../game/config/balance";
import { IsometricPainter, type Camera } from "./drawing";
import { isWorking } from "../game/employees/assignment";
import {
  addLight,
  beginLights,
  boxColors,
  computeEnvironment,
  env,
  festiveDecor,
  gamePosters,
  moodBubble,
  nightPass,
  officeConfetti,
  setEnvironment,
  shelfTrophies,
  skyMood,
  stressCloud,
  windowSill,
  windowWeather,
} from "./officeLife";

/** The team celebrates for a few seconds after each new release. */
let celebrating = false;
let celebrateUntil = 0;
let lastRelease: string | undefined | null = null;
import {
  paintSky,
  steam,
  sunbeams,
  studioLamp,
  wallClock,
  motes,
} from "./atmosphere";
export type SceneTarget = {
  kind: "employee" | "recruit" | "projects" | "games" | "research" | "studio";
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
};
const wood: [string, string, string] = ["#bb956a", "#795940", "#94704d"];
const cream: [string, string, string] = ["#eddec3", "#b6ac94", "#d0c6ae"];
const metal: [string, string, string] = ["#657779", "#35494d", "#465b5d"];
const roleColor: Record<Employee["role"], string> = {
  Gründer: "#758e79",
  Programmierung: "#6a91a4",
  "Game Design": "#c69c64",
  Art: "#b47c80",
  Audio: "#8484b6",
  QA: "#90a37c",
};
function hash(text: string) {
  return [...text].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
}
function plant(
  p: IsometricPainter,
  x: number,
  y: number,
  large = false,
  t = 0,
) {
  const z = large ? 26 : 15;
  p.ellipse(p.point(x, y), large ? 22 : 14, large ? 10 : 7, "#302e2620");
  p.box(x - 0.15, y - 0.15, 0.3, 0.3, 0, z, ["#d2a46f", "#a36f47", "#bb8b59"]);
  p.line([p.point(x, y, z), p.point(x, y, z + 37)], "#4d6542", 3);
  for (let i = 0; i < 6; i++) {
    const b = p.point(x, y, z + 12 + i * 6);
    const c = p.ctx;
    c.save();
    c.translate(b.x, b.y);
    c.rotate((i % 2 ? -0.9 : 0.9) + Math.sin(t * 0.7 + x + i * 0.5) * 0.09);
    p.ellipse(
      { x: 0, y: 0 },
      large ? 16 : 11,
      large ? 7 : 5,
      i % 2 ? "#8b9e5b" : "#667e43",
    );
    c.restore();
  }
}
function windowOnWall(
  p: IsometricPainter,
  x: number,
  y: number,
  wide: number,
  alongX: boolean,
  t: number,
) {
  const point = (a: number, z: number) =>
    p.point(x + (alongX ? a : 0), y + (alongX ? 0 : a), z);
  p.polygon(
    [point(0, 55), point(wide, 55), point(wide, 145), point(0, 145)],
    "#816a50",
  );
  p.polygon(
    [
      point(0.07, 62),
      point(wide - 0.07, 62),
      point(wide - 0.07, 138),
      point(0.07, 138),
    ],
    "#83a8a4",
  );
  p.polygon(
    [
      point(0.08, 88),
      point(wide - 0.08, 88),
      point(wide - 0.08, 137),
      point(0.08, 137),
    ],
    "#a8c1b0",
  );
  const c = p.ctx;
  c.save();
  c.beginPath();
  [
    point(0.08, 62),
    point(wide - 0.08, 62),
    point(wide - 0.08, 138),
    point(0.08, 138),
  ].forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
  c.closePath();
  c.clip();
  const low = point(0, 62),
    high = point(wide, 138);
  const sky = c.createLinearGradient(0, high.y, 0, low.y);
  sky.addColorStop(0, "#8eaeb6");
  sky.addColorStop(0.6, "#e1d5ad");
  sky.addColorStop(1, "#c4b28f");
  c.fillStyle = sky;
  c.fillRect(
    Math.min(low.x, high.x) - 60 * p.scale,
    Math.min(low.y, high.y) - 50 * p.scale,
    200 * p.scale,
    200 * p.scale,
  );
  for (let i = 0; i < 6; i++) {
    const a = wide * (i / 6),
      height = 14 + ((i * 7) % 4) * 7;
    p.polygon(
      [
        point(a, 62),
        point(a + wide / 7, 62),
        point(a + wide / 7, 62 + height),
        point(a, 62 + height),
      ],
      i % 2 ? "#8eaaa487" : "#71939466",
    );
  }
  const cloud = ((t * 0.016 + (x + y) * 0.1) % (wide + 1)) - 0.45;
  p.line(
    [point(cloud, 119), point(cloud + 0.35, 122), point(cloud + 0.7, 119)],
    "#fff6d580",
    7,
  );
  windowWeather(p, point, wide, t);
  c.restore();
  p.line([point(wide / 2, 58), point(wide / 2, 143)], "#e8dfc9", 4);
  p.line([point(0.02, 98), point(wide - 0.02, 98)], "#e8dfc9", 4);
  p.line([point(0, 55), point(wide, 55)], "#f1e4c6", 7);
  windowSill(p, point, wide);
  const a = point(0.1, 135),
    b = point(wide - 0.1, 135);
  p.line([a, b], "#d5ddbb", 2);
}
const SKIN = ["#e0bb98", "#b8876a", "#d3a582", "#956a50"];
const HAIR = ["#5d4635", "#2f302d", "#9b744a", "#c9a46a", "#6b3f2f"];
const PANTS = ["#34424b", "#3d4a40", "#47404a"];
/** Lightens (f > 1) or darkens (f < 1) a #rrggbb color. */
function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1, 7), 16);
  const ch = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * f)))
      .toString(16)
      .padStart(2, "0");
  return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}
/**
 * Seated employee in world coordinates, seen from behind: legs under the desk,
 * torso on the seat with a slight lean, one hand on the keyboard, one at the mouse.
 * Drawn back to front so the chair back covers the lower torso.
 */
function seated(
  p: IsometricPainter,
  x: number,
  y: number,
  e: Employee,
  t: number,
  working: boolean,
  chairBack: () => void,
) {
  const seed = hash(e.id);
  const skin = SKIN[seed % SKIN.length];
  const hair = HAIR[(seed >> 3) % HAIR.length];
  const pants = PANTS[(seed >> 5) % PANTS.length];
  const shirt = roleColor[e.role];
  const style = (seed >> 7) % 3;
  const phase = t * 0.9 + (seed % 8);
  const breathe = Math.sin(phase * 2) * 0.6;
  const lean = working ? -0.05 + Math.sin(phase * 0.6) * 0.008 : 0.015;
  const nod = working ? Math.sin(t * 1.4 + seed) * 0.5 : Math.sin(phase) * 0.8;
  const tap = working ? Math.sin(t * 9 + seed) : 0;
  // After a release the whole team jumps and cheers.
  const jump = celebrating ? Math.abs(Math.sin(t * 6 + seed)) * 5 : 0;
  const cx = x + 0.47;
  const at = (dx: number, dy: number, z: number) =>
    p.point(cx + dx, y + dy, z);

  // Legs: thighs on the seat, shins bent down under the desk.
  for (const [dx, knee] of [
    [-0.07, 0.8],
    [0.07, 0.78],
  ]) {
    const hip = at(dx, 1.14, 30);
    const k = at(dx, knee, 31);
    const ankle = at(dx, knee + 0.05, 5);
    p.line([hip, k], dx < 0 ? shade(pants, 0.85) : pants, 8.5);
    p.line([k, ankle], dx < 0 ? shade(pants, 0.78) : shade(pants, 0.92), 7);
    p.line([ankle, at(dx, knee - 0.06, 3)], "#242d33", 6);
  }

  // Far arm (keyboard hand), mostly hidden behind the torso.
  const wave = Math.sin(t * 9 + seed) * 0.03;
  const farShoulder = at(-0.16, 1.08 + lean, 65 + breathe + jump);
  const farElbow = celebrating ? at(-0.24, 1.04, 84 + jump) : at(-0.2, 0.9, 53.5);
  const farHand = celebrating
    ? at(-0.2 + wave, 1.0, 101 + jump)
    : at(0.08 + tap * 0.025, 0.64, 57.5 + Math.abs(tap) * 1.4);
  p.line([farShoulder, farElbow], shade(shirt, 0.72), 7);
  p.line([farElbow, farHand], shade(skin, 0.84), 5.5);
  p.ellipse(farHand, 3.4, 2.6, shade(skin, 0.9));

  // Torso: tapered prism leaning toward the monitor.
  const hipZ = 28 + jump,
    topZ = 68 + breathe + jump;
  const b = { x0: -0.13, x1: 0.13, y0: 1.1, y1: 1.27 };
  const u = { x0: -0.17, x1: 0.17, y0: 1.02 + lean, y1: 1.17 + lean };
  p.polygon(
    [
      at(b.x1, b.y0, hipZ),
      at(b.x1, b.y1, hipZ),
      at(u.x1, u.y1, topZ),
      at(u.x1, u.y0, topZ),
    ],
    shade(shirt, 0.8),
  );
  p.polygon(
    [
      at(b.x0, b.y1, hipZ),
      at(b.x1, b.y1, hipZ),
      at(u.x1, u.y1, topZ),
      at(u.x0, u.y1, topZ),
    ],
    shirt,
  );
  p.polygon(
    [
      at(u.x0, u.y0, topZ),
      at(u.x1, u.y0, topZ),
      at(u.x1, u.y1, topZ),
      at(u.x0, u.y1, topZ),
    ],
    shade(shirt, 1.12),
  );
  // Rounded shoulder line and a soft spine fold for readability.
  p.line(
    [at(u.x0, u.y1, topZ - 1), at(u.x1, u.y1, topZ - 1)],
    shade(shirt, 1.06),
    4,
  );
  p.line(
    [at(0, u.y1 + 0.005, topZ - 8), at(0, b.y1, hipZ + 14)],
    shade(shirt, 0.9),
    1.2,
  );

  // Neck and head (seen from behind; ear visible on the near side).
  const neckBase = at(0, 1.09 + lean, topZ);
  const head = at(0.01, 1.08 + lean * 1.3, 82 + breathe + nod + jump);
  p.line([neckBase, at(0, 1.085 + lean, topZ + 7)], shade(skin, 0.9), 6);
  p.ellipse(head, 8, 9, skin);
  const k = p.scale;
  if (style === 1) {
    p.polygon(
      [
        { x: head.x - 8 * k, y: head.y - 1 * k },
        { x: head.x + 6.5 * k, y: head.y - 1 * k },
        { x: head.x + 5.5 * k, y: head.y + 11 * k },
        { x: head.x - 7 * k, y: head.y + 11.5 * k },
      ],
      shade(hair, 0.9),
    );
  }
  p.ellipse({ x: head.x - 1.2 * k, y: head.y - 1.3 * k }, 8.1, 8.4, hair);
  p.ellipse(
    { x: head.x - 3 * k, y: head.y - 5 * k },
    3.6,
    2,
    shade(hair, 1.25),
  );
  if (style === 2) {
    p.ellipse({ x: head.x - 1.5 * k, y: head.y - 9.5 * k }, 4, 3.4, hair);
  }
  if (style !== 1)
    p.ellipse({ x: head.x + 6.6 * k, y: head.y + 1.2 * k }, 1.8, 2.6, shade(skin, 0.9));

  chairBack();

  // Near arm (mouse hand), fully visible in front of the chair back.
  const nearShoulder = at(0.17, 1.08 + lean, 65 + breathe + jump);
  const nearElbow = celebrating ? at(0.3, 1.04, 84 + jump) : at(0.27, 0.9, 53.5);
  const wiggle = working ? Math.sin(t * 2.2 + seed) * 0.012 : 0;
  const mouseHand = celebrating
    ? at(0.26 - wave, 1.0, 101 + jump)
    : at(0.39 + wiggle, 0.63, 57);
  p.line([nearShoulder, nearElbow], shade(shirt, 0.92), 7);
  p.ellipse(nearElbow, 3.4, 3, shade(shirt, 0.86));
  p.line([nearElbow, mouseHand], skin, 5.5);
  p.ellipse(mouseHand, 3.6, 2.7, shade(skin, 1.05));
  p.ellipse(nearShoulder, 4.2, 3.6, shade(shirt, 1.02));
}
/**
 * Installed facilities appear as props along the left wall, facing the room.
 * Footprint roughly 0.7 × 0.75 tiles starting at (x, y).
 */
function facilityProp(
  p: IsometricPainter,
  id: string,
  x: number,
  y: number,
  t: number,
) {
  p.ellipse(p.point(x + 0.35, y + 0.4), 30, 13, "#30251c22");
  if (id === "coffee") {
    p.box(x, y, 0.55, 0.75, 0, 40, wood);
    p.box(x + 0.08, y + 0.1, 0.32, 0.3, 40, 26, metal);
    p.box(x + 0.4, y + 0.14, 0.04, 0.2, 52, 3, ["#c9cfc0", "#7d8a83", "#9aa69c"]);
    p.box(x + 0.15, y + 0.5, 0.1, 0.1, 40, 7, cream);
    p.box(x + 0.32, y + 0.55, 0.1, 0.1, 40, 7, cream);
    p.ellipse(p.point(x + 0.42, y + 0.25, 64), 2.5, 2.5, Math.sin(t * 3) > 0 ? "#e8b86a" : "#8fbf9f");
    steam(p, x + 0.2, y + 0.55, 48, t + x);
  } else if (id === "lounge") {
    p.ellipse(p.point(x + 0.35, y + 0.95, 6), 15, 8, "#a3765c");
    p.ellipse(p.point(x + 0.35, y + 0.95, 12), 12, 6, "#bf8c6c");
    p.box(x + 0.05, y, 0.42, 0.45, 0, 64, ["#3f4d6b", "#262f45", "#323d58"]);
    p.polygon(
      [
        p.point(x + 0.47, y + 0.07, 34),
        p.point(x + 0.47, y + 0.38, 34),
        p.point(x + 0.47, y + 0.38, 54),
        p.point(x + 0.47, y + 0.07, 54),
      ],
      `hsl(${(t * 40) % 360} 55% 62%)`,
    );
    addLight(p.point(x + 0.5, y + 0.22, 44), 40 * p.scale, "190,160,240", 0.8);
    p.box(x + 0.47, y + 0.08, 0.08, 0.3, 28, 4, ["#d9b47b", "#8a7046", "#a8885a"]);
  } else if (id === "library") {
    p.box(x, y, 0.32, 0.78, 0, 66, wood);
    const colors = ["#a8604e", "#5f7f95", "#c2a35f", "#6d8a5e", "#8a6aa0"];
    for (let shelf = 0; shelf < 3; shelf++)
      for (let i = 0; i < 6; i++)
        p.line(
          [
            p.point(x + 0.33, y + 0.08 + i * 0.11, 6 + shelf * 21),
            p.point(x + 0.33, y + 0.08 + i * 0.11, 20 + shelf * 21 - ((i * 3 + shelf) % 4)),
          ],
          colors[(i + shelf * 2) % colors.length],
          4,
        );
  } else if (id === "server") {
    p.box(x, y + 0.05, 0.5, 0.62, 0, 70, ["#3b4a50", "#1e2a2f", "#2a383d"]);
    for (let row = 0; row < 6; row++) {
      p.line(
        [p.point(x + 0.505, y + 0.12, 8 + row * 10), p.point(x + 0.505, y + 0.6, 8 + row * 10)],
        "#15211f",
        1,
      );
      for (let i = 0; i < 3; i++) {
        const on = Math.sin(t * (3 + i) + row * 1.7 + i) > 0.1;
        p.ellipse(
          p.point(x + 0.51, y + 0.18 + i * 0.07, 12 + row * 10),
          1.4,
          1.4,
          on ? (i === 2 ? "#e8b86a" : "#8fe0a8") : "#2f4a40",
        );
      }
    }
  } else if (id === "sound") {
    p.box(x, y, 0.5, 0.75, 0, 34, wood);
    p.box(x + 0.05, y + 0.05, 0.4, 0.65, 34, 4, ["#3d4a4f", "#263236", "#30393e"]);
    for (let i = 0; i < 5; i++) {
      const lvl = 2 + Math.abs(Math.sin(t * 4 + i)) * 7;
      p.line(
        [p.point(x + 0.25, y + 0.15 + i * 0.11, 39), p.point(x + 0.25, y + 0.15 + i * 0.11, 39 + lvl)],
        i % 2 ? "#e8b86a" : "#8fe0a8",
        2,
      );
    }
    p.box(x + 0.05, y - 0.02, 0.22, 0.2, 38, 26, ["#2c3538", "#1b2326", "#232c2f"]);
    p.ellipse(p.point(x + 0.28, y + 0.08, 52), 4, 4, "#55666b");
  } else if (id === "testlab") {
    p.box(x, y, 0.55, 0.75, 0, 30, wood);
    p.box(x + 0.05, y + 0.12, 0.25, 0.5, 30, 28, cream);
    p.polygon(
      [
        p.point(x + 0.305, y + 0.18, 35),
        p.point(x + 0.305, y + 0.56, 35),
        p.point(x + 0.305, y + 0.56, 54),
        p.point(x + 0.305, y + 0.18, 54),
      ],
      Math.sin(t * 2) > 0 ? "#5d9d8d" : "#6aa6c0",
    );
    p.box(x + 0.38, y + 0.3, 0.12, 0.16, 30, 3, ["#5b6470", "#3a414a", "#474f59"]);
  } else if (id === "workshop") {
    p.box(x, y, 0.55, 0.78, 0, 36, ["#8d8670", "#5d574a", "#726b5b"]);
    p.box(x + 0.1, y + 0.1, 0.25, 0.25, 36, 14, ["#4b6873", "#2f434a", "#3b545d"]);
    p.ellipse(p.point(x + 0.36, y + 0.2, 46), 1.8, 1.8, Math.sin(t * 5) > 0 ? "#e86a6a" : "#8fe0a8");
    p.line([p.point(x + 0.2, y + 0.5, 37), p.point(x + 0.45, y + 0.62, 37)], "#c9cfc0", 2);
    p.line([p.point(x + 0.3, y + 0.45, 37), p.point(x + 0.3, y + 0.7, 37)], "#d9b47b", 2);
  } else if (id === "academy") {
    p.line([p.point(x + 0.3, y + 0.2, 0), p.point(x + 0.3, y + 0.38, 72)], "#5d574a", 2.5);
    p.line([p.point(x + 0.3, y + 0.56, 0), p.point(x + 0.3, y + 0.38, 72)], "#5d574a", 2.5);
    p.polygon(
      [
        p.point(x + 0.31, y + 0.14, 34),
        p.point(x + 0.31, y + 0.62, 34),
        p.point(x + 0.31, y + 0.62, 74),
        p.point(x + 0.31, y + 0.14, 74),
      ],
      "#f1ead6",
    );
    p.line(
      [p.point(x + 0.32, y + 0.2, 42), p.point(x + 0.32, y + 0.34, 55), p.point(x + 0.32, y + 0.46, 49), p.point(x + 0.32, y + 0.58, 66)],
      "#6aa08a",
      2,
    );
    p.box(x + 0.5, y + 0.15, 0.18, 0.18, 0, 18, wood);
    p.box(x + 0.5, y + 0.5, 0.18, 0.18, 0, 18, wood);
  } else if (id === "showroom") {
    p.box(x + 0.05, y + 0.1, 0.45, 0.55, 0, 30, ["#e8e2d0", "#a8a28f", "#c6c0ac"]);
    const bob = Math.sin(t * 1.5) * 1.5;
    p.box(x + 0.2, y + 0.3, 0.14, 0.14, 30, 8, ["#c9a24f", "#8a6b2c", "#a7853b"]);
    p.ellipse(p.point(x + 0.27, y + 0.37, 46 + bob), 6, 7, "#e3bd5f");
    p.ellipse(p.point(x + 0.27, y + 0.37, 47 + bob), 3, 3.5, "#f6dc95");
    p.polygon(
      [p.point(x + 0.27, y + 0.37, 120), p.point(x - 0.05, y + 0.1, 30), p.point(x + 0.55, y + 0.65, 30)],
      `rgba(255,236,190,${0.1 + Math.sin(t * 2) * 0.03})`,
    );
  } else {
    // Later facilities share a cabinet with a glowing display.
    const hue = [...id].reduce((n, c) => n + c.charCodeAt(0), 0) % 360;
    p.box(x, y, 0.5, 0.75, 0, 46, ["#4a5a60", "#2c383d", "#3a474c"]);
    p.polygon(
      [
        p.point(x + 0.505, y + 0.12, 18),
        p.point(x + 0.505, y + 0.62, 18),
        p.point(x + 0.505, y + 0.62, 40),
        p.point(x + 0.505, y + 0.12, 40),
      ],
      `hsl(${hue} 45% ${52 + Math.sin(t * 2 + hue) * 6}%)`,
    );
    p.ellipse(p.point(x + 0.25, y + 0.37, 52), 5, 5, `hsl(${hue} 55% 70%)`);
  }
}
function desk(
  p: IsometricPainter,
  x: number,
  y: number,
  employee: Employee | undefined,
  s: GameState,
  t: number,
  selected: boolean,
  walking = false,
  ambienceTime = t,
) {
  const project = s.projects.find(
    (g) => employee && g.team.includes(employee.id),
  );
  const engineDev = !!employee && !!s.engineProject?.team.includes(employee.id);
  const working = (!!project && project.progress < 100) || engineDev;
  p.ellipse(p.point(x + 0.4, y + 0.6), 49, 22, "#30251c22");
  if (selected)
    p.plane(x - 0.22, y - 0.12, 1.8, 1.5, 1, "#eabe722e", "#e4b978");
  for (const [a, b] of [
    [0, 0],
    [1.15, 0],
    [0, 0.66],
    [1.15, 0.66],
  ])
    p.box(x + a, y + b, 0.07, 0.07, 0, 43, metal);
  p.box(x - 0.08, y - 0.05, 1.4, 0.85, 43, 7, wood);
  p.plane(x + 0.14, y + 0.14, 0.8, 0.55, 51, "#80785c");
  // Original CRT housing, keyboard, floppy disk and coffee cup.
  p.box(x + 0.33, y + 0.04, 0.59, 0.27, 53, 40, cream);
  p.polygon(
    [
      p.point(x + 0.39, y + 0.322, 63),
      p.point(x + 0.84, y + 0.322, 63),
      p.point(x + 0.84, y + 0.322, 87),
      p.point(x + 0.39, y + 0.322, 87),
    ],
    "#18373b",
  );
  const glow = p.ctx.createRadialGradient(
    p.point(x + 0.62, y + 0.35, 77).x,
    p.point(x + 0.62, y + 0.35, 77).y,
    1,
    p.point(x + 0.62, y + 0.35, 77).x,
    p.point(x + 0.62, y + 0.35, 77).y,
    26 * p.scale,
  );
  glow.addColorStop(
    0,
    `rgba(145,220,197,${0.16 + Math.sin(ambienceTime * 1.6 + x) * 0.035})`,
  );
  glow.addColorStop(1, "#91cbb500");
  if (employee)
    addLight(
      p.point(x + 0.62, y + 0.35, 77),
      55 * p.scale,
      engineDev ? "235,200,130" : "140,220,195",
      working ? 0.75 : 0.35,
    );
  p.ctx.fillStyle = glow;
  p.ctx.fillRect(
    p.point(x + 0.15, y + 0.1, 104).x,
    p.point(x + 0.15, y + 0.1, 104).y,
    75 * p.scale,
    70 * p.scale,
  );
  if (engineDev) {
    // Rotating gear on the CRT while the employee builds the engine.
    const g = p.point(x + 0.615, y + 0.326, 75);
    const c = p.ctx;
    c.save();
    c.translate(g.x, g.y);
    c.scale(p.scale, p.scale * 0.82);
    c.rotate(ambienceTime * 1.4);
    c.strokeStyle = "#e3c27f";
    c.lineWidth = 2.2;
    c.beginPath();
    c.arc(0, 0, 5.5, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.beginPath();
      c.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      c.lineTo(Math.cos(a) * 8.5, Math.sin(a) * 8.5);
      c.stroke();
    }
    c.fillStyle = "#96c9b1";
    c.beginPath();
    c.arc(0, 0, 2, 0, Math.PI * 2);
    c.fill();
    c.restore();
  } else if (employee?.role === "Art") {
    p.line(
      [
        p.point(x + 0.43, y + 0.326, 68),
        p.point(x + 0.6, y + 0.326, 81),
        p.point(x + 0.78, y + 0.326, 70),
      ],
      "#d7b98b",
      2,
    );
    p.ellipse(p.point(x + 0.69, y + 0.33, 81), 3, 3, "#b8d8b7");
  } else if (project?.phase === "Qualitätssicherung") {
    for (let i = 0; i < 3; i++)
      p.line(
        [
          p.point(x + 0.43, y + 0.33, 69 + i * 6),
          p.point(x + 0.73, y + 0.33, 69 + i * 6),
        ],
        i === 0 && project.bugs > 0 ? "#eab38b" : "#8abfa7",
        2,
      );
  } else {
    for (let i = 0; i < 4; i++)
      p.line(
        [
          p.point(x + 0.43, y + 0.33, 68 + i * 5),
          p.point(x + 0.64 + (i % 2) * 0.13, y + 0.33, 68 + i * 5),
        ],
        working ? "#96c9b1" : "#669793",
        1.4,
      );
  }
  const cursorOn = Math.floor(ambienceTime * 1.5) % 2 === 0;
  if (cursorOn)
    p.line(
      [p.point(x + 0.43, y + 0.334, 65), p.point(x + 0.48, y + 0.334, 65)],
      "#b9ebc9",
      1.8,
    );
  const scan = (ambienceTime * 8) % 23;
  p.line(
    [
      p.point(x + 0.4, y + 0.335, 64 + scan),
      p.point(x + 0.82, y + 0.335, 64 + scan),
    ],
    "#b8ffdf24",
    0.7,
  );
  p.box(x + 0.29, y + 0.48, 0.58, 0.19, 51, 3, [
    "#d2d0b4",
    "#979e8a",
    "#afb59d",
  ]);
  for (let i = 0; i < 6; i++)
    p.line(
      [
        p.point(x + 0.33 + i * 0.08, y + 0.5, 55),
        p.point(x + 0.33 + i * 0.08, y + 0.61, 55),
      ],
      "#889582",
      0.6,
    );
  p.box(x + 1.05, y + 0.5, 0.14, 0.12, 51, 2, [
    "#4b6873",
    "#344850",
    "#344850",
  ]);
  p.box(x + 1.03, y + 0.08, 0.13, 0.13, 51, 12, [
    "#e9d4b2",
    "#b79f77",
    "#d7bc92",
  ]);
  steam(p, x + 1.09, y + 0.13, 65, ambienceTime + x);
  p.box(x + 0.18, y + 0.99, 0.46, 0.41, 18, 6, [
    "#637d79",
    "#354f51",
    "#476464",
  ]);
  p.line(
    [p.point(x + 0.4, y + 1.14, 18), p.point(x + 0.4, y + 1.14, 2)],
    "#3b4d4e",
    4,
  );
  p.line(
    [p.point(x + 0.15, y + 1.14, 1), p.point(x + 0.66, y + 1.14, 1)],
    "#3b4d4e",
    3,
  );
  const chairBack = () =>
    p.box(x + 0.15, y + 1.3, 0.52, 0.09, 22, 32, [
      "#627e79",
      "#435d5b",
      "#506d68",
    ]);
  if (!employee || walking) {
    chairBack();
    return;
  }
  const seed = hash(employee.id);
  seated(p, x, y, employee, t, working, chairBack);
  const c = p.ctx;
  const cycle = (t * 0.22 + (seed % 13)) % 9;
  const mood =
    employee.stress > 60
      ? null
      : celebrating
        ? "🎉"
        : employee.energy < 45
          ? "☕"
          : engineDev
            ? "⚙️"
            : working && seed % 3 === 0
              ? "💡"
              : !working
                ? "♪"
                : employee.motivation > 85
                  ? "❤️"
                  : null;
  const bubble = !!mood && cycle < 2.2;
  if (bubble) moodBubble(p, p.point(x + 0.62, y + 1.0, 112), mood!, cycle / 2.2);
  if (working && !bubble) {
    const rise = (t * 0.4 + (seed % 4)) % 3;
    const alpha = Math.max(0, 1 - rise / 3);
    c.globalAlpha = alpha * 0.8;
    p.text(
      engineDev
        ? "⚙"
        : employee.role === "Art"
          ? "✦"
          : employee.role === "QA"
            ? "✓"
            : "+",
      p.point(x + 0.4, y + 0.65, 115 + rise * 12),
      12,
      "#d6ca93",
    );
    c.globalAlpha = 1;
  }
  if (employee.stress > 60) stressCloud(p, p.point(x + 0.5, y + 1.05, 108), t + seed);
}
function strolling(
  p: IsometricPainter,
  x: number,
  y: number,
  e: Employee,
  t: number,
  selected: boolean,
) {
  const c = p.ctx,
    q = p.point(x, y, 0),
    seed = hash(e.id),
    step = Math.sin(t * 7 + seed) * 3;
  p.ellipse(q, 14 * p.scale, 6 * p.scale, selected ? "#e6bf7766" : "#142d3638");
  c.save();
  c.translate(q.x, q.y);
  c.scale(p.scale, p.scale);
  c.lineCap = "round";
  c.strokeStyle = PANTS[(seed >> 5) % PANTS.length];
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(-5, -24);
  c.lineTo(-6 + step, -3);
  c.moveTo(5, -24);
  c.lineTo(6 - step, -3);
  c.stroke();
  c.fillStyle = roleColor[e.role];
  c.beginPath();
  c.roundRect(-10, -50, 20, 29, 6);
  c.fill();
  c.fillStyle = shade(roleColor[e.role], 0.82);
  c.beginPath();
  c.roundRect(3, -50, 7, 29, [0, 6, 6, 0]);
  c.fill();
  const skin = SKIN[seed % SKIN.length];
  c.strokeStyle = skin;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(-9, -44);
  c.lineTo(-12 - step, -28);
  c.moveTo(9, -44);
  c.lineTo(15, -37);
  c.stroke();
  c.fillStyle = skin;
  c.beginPath();
  c.ellipse(0, -59, 8, 9, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = HAIR[(seed >> 3) % HAIR.length];
  c.beginPath();
  c.ellipse(0, -63, 8.6, 6, 0, Math.PI, Math.PI * 2);
  c.ellipse(-4, -61, 4.5, 5, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#e6d2aa";
  c.fillRect(13, -42, 7, 7);
  c.strokeStyle = "#d8c197";
  c.lineWidth = 2;
  c.strokeRect(18, -41, 5, 4);
  c.restore();
}
export function renderStudio(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: GameState,
  t: number,
  camera: Camera,
  selected: string | null,
  hover: string | null,
  ambienceTime = t,
): SceneTarget[] {
  c.clearRect(0, 0, w, h);
  setEnvironment(computeEnvironment(s.day));
  beginLights();
  const newest = s.games[0];
  if (lastRelease !== null && newest && newest.id !== lastRelease && s.day - newest.releasedDay <= 1)
    celebrateUntil = ambienceTime + 6;
  lastRelease = newest?.id;
  celebrating = ambienceTime < celebrateUntil;
  paintSky(c, w, h, ambienceTime);
  skyMood(c, w, h, ambienceTime);
  const glow = c.createRadialGradient(
    w * 0.46,
    h * 0.39,
    0,
    w * 0.46,
    h * 0.4,
    w * 0.57,
  );
  glow.addColorStop(0, "#b0ba8e19");
  glow.addColorStop(1, "#b0ba8e00");
  c.fillStyle = glow;
  c.fillRect(0, 0, w, h);
  const level = s.company.office;
  const cols = [2, 3, 4, 6, 8, 10, 10, 10][level] ?? 10;
  const slots = OFFICES[level].capacity;
  const rows = Math.ceil(slots / cols);
  const rw = Math.max(7, cols * 2.05 + 1),
    rh = Math.max(5.8, rows * 1.85 + 2);
  const extraDepth = Math.max(0, rw + rh - 12.8);
  const scale =
    Math.min(w / (940 + extraDepth * 60), h / (720 + extraDepth * 47)) *
    camera.zoom;
  const p = new IsometricPainter(
    c,
    { x: w * 0.5 - (rw - rh) * 29 * scale + camera.x, y: h * 0.38 + camera.y },
    scale,
  );
  const hits: SceneTarget[] = [];
  const hit = (
    kind: SceneTarget["kind"],
    id: string,
    label: string,
    x: number,
    y: number,
    z: number,
    r = 38,
  ) => {
    const q = p.point(x, y, z);
    hits.push({ kind, id, label, ...q, radius: r * scale });
  };
  // Ground, depth and floorboards.
  p.plane(-0.8, -0.8, rw + 1.6, rh + 1.6, -29, "#1b3139");
  p.box(-0.08, -0.08, rw + 0.16, rh + 0.16, -25, 25, [
    "#b99468",
    "#586267",
    "#69777a",
  ]);
  for (let i = 0; i < rw * 4; i++) {
    const x = i * 0.25;
    p.plane(
      x,
      0,
      Math.min(0.25, rw - x),
      rh,
      0,
      i % 3 === 0 ? "#bc9b71" : i % 3 === 1 ? "#b59166" : "#c4a27a",
    );
    p.line([p.point(x, 0, 1), p.point(x, rh, 1)], "#99784944", 0.65);
    for (let j = 1; j < rh; j++)
      if ((i + j) % 3 === 0)
        p.line([p.point(x, j, 1), p.point(x + 0.25, j, 1)], "#82684055", 0.65);
  }
  p.box(-0.12, -0.12, 0.13, rh + 0.25, 0, 176, [
    "#e9dfc8",
    "#bdc8b6",
    "#d6dac3",
  ]);
  p.box(-0.12, -0.12, rw + 0.25, 0.13, 0, 176, [
    "#f2e7d0",
    "#c8cdb4",
    "#b8c3b1",
  ]);
  p.line([p.point(0.02, 0, 10), p.point(rw, 0, 10)], "#afb7a0", 5);
  p.line([p.point(0, 0.02, 10), p.point(0, rh, 10)], "#b3baa4", 5);
  windowOnWall(p, 0.03, 1.6, 1.4, false, ambienceTime);
  windowOnWall(p, 0.03, 3.6, 1.25, false, ambienceTime);
  windowOnWall(p, rw - 2.05, 0.02, 1.35, true, ambienceTime);
  // Soft window light lies across the wooden floor.
  if (env().daylight > 0.25) sunbeams(p, ambienceTime);
  wallClock(p, ambienceTime);
  // Whiteboard is the physical project hub.
  p.polygon(
    [
      p.point(1.05, 0.035, 62),
      p.point(3.0, 0.035, 62),
      p.point(3, 0.035, 142),
      p.point(1.05, 0.035, 142),
    ],
    "#7b7258",
  );
  p.polygon(
    [
      p.point(1.12, 0.045, 68),
      p.point(2.93, 0.045, 68),
      p.point(2.93, 0.045, 136),
      p.point(1.12, 0.045, 136),
    ],
    "#e9e7d4",
  );
  for (let i = 0; i < 6; i++) {
    const x = 1.35 + (i % 3) * 0.5,
      z = 88 + Math.floor(i / 3) * 23;
    p.polygon(
      [
        p.point(x, 0.05, z),
        p.point(x + 0.28, 0.05, z),
        p.point(x + 0.28, 0.05, z + 15),
        p.point(x, 0.05, z + 15),
      ],
      i < 3 ? "#c3b884" : "#a8b5a0",
    );
  }
  p.line(
    [
      p.point(1.54, 0.065, 108),
      p.point(1.7, 0.065, 101),
      p.point(2.1, 0.065, 106),
    ],
    "#75836c",
    1.5,
  );
  hit("projects", "board", "Projekt-Whiteboard", 2, 0.08, 107, 60);
  // Inspirational framed artwork and released-game keepsakes.
  const poster = p.point(3.8, 0.02, 143);
  p.polygon(
    [
      p.point(3.4, 0.03, 71),
      p.point(4.45, 0.03, 71),
      p.point(4.45, 0.03, 147),
      p.point(3.4, 0.03, 147),
    ],
    "#b6986a",
  );
  p.polygon(
    [
      p.point(3.45, 0.05, 76),
      p.point(4.4, 0.05, 76),
      p.point(4.4, 0.05, 141),
      p.point(3.45, 0.05, 141),
    ],
    "#3d6060",
  );
  p.line(
    [
      p.point(3.6, 0.06, 92),
      p.point(3.95, 0.06, 123),
      p.point(4.23, 0.06, 106),
    ],
    "#d3cba4",
    3,
  );
  p.text(
    "CREATE",
    { x: poster.x + 8 * scale, y: poster.y + 38 * scale },
    9,
    "#e5dcc0",
  );
  gamePosters(p, s, rw, rh);
  p.box(0.24, rh - 1.15, 0.7, 0.8, 0, 53, wood);
  p.box(0.24, rh - 1.15, 0.7, 0.8, 53, 7, cream);
  // Game boxes take the colours of their genre; trophies stand beside them.
  for (let i = 0; i < Math.min(6, s.games.length); i++)
    p.box(
      0.32,
      rh - 1.04 + i * 0.11,
      0.35,
      0.07,
      61,
      18,
      boxColors(s.games[i].genre),
    );
  shelfTrophies(p, s, rh, ambienceTime);
  hit(
    "games",
    "shelf",
    s.games.length ? "Deine veröffentlichten Spiele" : "Spielearchiv",
    0.6,
    rh - 0.75,
    64,
    32,
  );
  // A battered couch, reading table and studio equipment.
  p.box(rw - 1.95, rh - 1.3, 1.7, 0.75, 0, 13, [
    "#657a76",
    "#3e5755",
    "#4e6662",
  ]);
  p.box(rw - 1.95, rh - 1.25, 1.7, 0.15, 13, 37, [
    "#738983",
    "#506964",
    "#607a71",
  ]);
  p.box(rw - 1.97, rh - 1.3, 0.16, 0.77, 13, 26, [
    "#81968a",
    "#49665e",
    "#648174",
  ]);
  p.box(rw - 0.4, rh - 1.3, 0.16, 0.77, 13, 26, [
    "#81968a",
    "#49665e",
    "#648174",
  ]);
  for (let i = 0; i < 2; i++)
    p.box(rw - 1.7 + i * 0.7, rh - 0.98, 0.65, 0.46, 13, 9, [
      "#839087",
      "#61756e",
      "#75897b",
    ]);
  p.box(rw - 1.55, rh - 2.05, 1.07, 0.54, 0, 22, wood);
  p.box(rw - 1.32, rh - 1.96, 0.39, 0.27, 23, 2, [
    "#e0d5b5",
    "#a49679",
    "#a49679",
  ]);
  p.line(
    [p.point(rw - 1.27, rh - 1.9, 26), p.point(rw - 1.08, rh - 1.9, 26)],
    "#6e8776",
    1,
  );
  p.box(rw - 1.1, 0.45, 0.72, 0.74, 0, 62, metal);
  for (let i = 0; i < 4; i++)
    p.box(rw - 1.05, 0.5, 0.6, 0.6, 5 + i * 13, 8, [
      "#c2c2a7",
      "#516968",
      "#607e74",
    ]);
  p.ellipse(
    p.point(rw - 0.7, 0.55, 67),
    5,
    5,
    Math.sin(ambienceTime * 2) > -0.7 ? "#dfbd80" : "#968768",
  );
  hit(
    "research",
    "research",
    "Technologie & Forschung",
    rw - 0.73,
    0.83,
    78,
    34,
  );
  plant(p, 0.7, 0.6, true, ambienceTime);
  plant(p, rw - 0.7, rh - 0.48, true, ambienceTime);
  plant(p, 0.65, rh - 1.6, false, ambienceTime);
  plant(p, rw - 0.5, 1.8, false, ambienceTime);
  studioLamp(p, rw - 0.35, rh - 1.7, ambienceTime);
  addLight(p.point(rw - 0.35, rh - 1.7, 92), 140 * scale, "255,205,140", 1);
  // The coffee corner stands behind the workstations in projection depth.
  p.box(0.28, 0.5, 0.58, 0.78, 0, 43, wood);
  p.box(0.32, 0.58, 0.24, 0.26, 44, 24, metal);
  p.ellipse(p.point(0.72, 0.68, 47), 7, 4, "#ead6b4");
  steam(p, 0.71, 0.68, 50, ambienceTime);
  p.box(0.33, 0.98, 0.35, 0.12, 44, 4, ["#cdb277", "#8a7046", "#8a7046"]);
  // Installed facilities line up along the left wall.
  s.facilities.forEach((id, i) => {
    const y = 1.45 + i * 1.0;
    if (y + 0.8 < rh - 1.75) facilityProp(p, id, 0.2, y, ambienceTime);
  });
  // Seats derive from actual office capacity; occupied seats derive from actual employees.
  const drawables = Array.from({ length: slots }, (_, i) => ({
    i,
    x: 1.4 + (i % cols) * 2.05,
    y: 1.55 + Math.floor(i / cols) * 1.75,
  }));
  drawables.sort((a, b) => a.x + a.y - (b.x + b.y));
  const walkers: { e: Employee; x: number; y: number }[] = [];
  for (const seat of drawables) {
    const e = s.employees[seat.i];
    const cycle = e ? (t + (hash(e.id) % 12)) % 34 : 0;
    const walking =
      !!e &&
      cycle > 25 &&
      !isWorking(s, e.id);
    desk(
      p,
      seat.x,
      seat.y,
      e,
      s,
      t,
      e?.id === selected || e?.id === hover,
      walking,
      ambienceTime,
    );
    if (e) {
      if (walking) {
        const shift = Math.sin(((cycle - 25) / 9) * Math.PI);
        walkers.push({
          e,
          x: seat.x + 0.45 + shift * 0.8,
          y: seat.y + 1.2 + shift * 0.2,
        });
      } else {
        hit("employee", e.id, e.name, seat.x + 0.45, seat.y + 0.95, 60, 33);
        const q = p.point(seat.x + 0.47, seat.y + 1.25, 3);
        p.ellipse(q, 17, 7, e.id === selected ? "#e8b976bb" : "#a4b6a04a");
      }
    } else
      hit(
        "recruit",
        `seat-${seat.i}`,
        "Freier Arbeitsplatz · Talente finden",
        seat.x + 0.45,
        seat.y + 0.6,
        56,
        28,
      );
  }
  walkers
    .sort((a, b) => a.x + a.y - b.x - b.y)
    .forEach(({ e, x, y }) => {
      strolling(p, x, y, e, t, e.id === selected);
      hit("employee", e.id, e.name, x, y, 43, 29);
    });
  festiveDecor(p, rw, rh, ambienceTime);
  hit("studio", "office", "Büro erweitern", rw / 2, rh + 0.03, 4, 40);
  // All world labels appear on hover; the actual playfield stays uncluttered.
  const target = hits.find((a) => a.id === hover);
  if (target) {
    p.ctx.strokeStyle = "#eed0a0";
    p.ctx.lineWidth = 1.5;
    const rr = target.radius;
    p.ctx.beginPath();
    p.ctx.ellipse(
      target.x,
      target.y + 16 * scale,
      rr,
      rr * 0.45,
      0,
      0,
      Math.PI * 2,
    );
    p.ctx.stroke();
  }
  nightPass(c, w, h);
  if (celebrating) officeConfetti(c, w, h, ambienceTime);
  motes(c, w, h, ambienceTime);
  const vignette = c.createRadialGradient(
    w / 2,
    h * 0.45,
    w * 0.2,
    w / 2,
    h * 0.45,
    w * 0.72,
  );
  vignette.addColorStop(0, "#09181f00");
  vignette.addColorStop(1, "#08192377");
  c.fillStyle = vignette;
  c.fillRect(0, 0, w, h);
  return hits;
}
