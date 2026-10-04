import { IsometricPainter } from "./drawing";

export function paintSky(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
) {
  const sky = c.createLinearGradient(0, 0, w * 0.7, h);
  sky.addColorStop(0, "#192c3e");
  sky.addColorStop(0.4, "#405455");
  sky.addColorStop(0.7, "#314a4b");
  sky.addColorStop(1, "#102936");
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
  const sunX = w * 0.74 + Math.sin(t * 0.035) * w * 0.025,
    sunY = h * 0.25;
  const halo = c.createRadialGradient(
    sunX,
    sunY,
    0,
    sunX,
    sunY,
    Math.max(w, h) * 0.55,
  );
  halo.addColorStop(0, "#f6c58420");
  halo.addColorStop(0.3, "#d9ad8520");
  halo.addColorStop(1, "#d9ad8500");
  c.fillStyle = halo;
  c.fillRect(0, 0, w, h);
  // Slow, layered cloud banks and a distant city make the studio feel situated.
  for (let i = 0; i < 5; i++) {
    const x = ((i * w * 0.36 + t * (2 + i * 0.3)) % (w * 1.5)) - w * 0.25;
    const y = h * (0.16 + (i % 3) * 0.105);
    const haze = c.createRadialGradient(x, y, 0, x, y, w * 0.24);
    haze.addColorStop(0, i % 2 ? "#c9cab513" : "#abbdd80c");
    haze.addColorStop(1, "#c9cab500");
    c.save();
    c.translate(0, y);
    c.scale(1, 0.22);
    c.fillStyle = haze;
    c.fillRect(0, -h * 4, w, h * 8);
    c.restore();
  }
  const horizon = h * 0.69;
  c.save();
  c.globalAlpha = 0.17;
  for (let i = 0; i < 27; i++) {
    const bw = w / 24,
      bh = h * (0.035 + ((i * 37) % 11) * 0.009),
      x = i * bw - w * 0.03;
    c.fillStyle = i % 3 ? "#112936" : "#1b3441";
    c.fillRect(x, horizon - bh, bw * 0.8, bh);
    for (let row = 0; row < Math.floor(bh / 13); row++)
      for (let col = 0; col < 3; col++) {
        const pulse = 0.5 + Math.sin(t * 0.16 + i * 3 + row) * 0.15;
        c.fillStyle = `rgba(239,195,129,${pulse})`;
        if ((i + row * 3 + col) % 4 === 0)
          c.fillRect(x + 7 + col * bw * 0.2, horizon - bh + 8 + row * 13, 3, 4);
      }
  }
  c.restore();
  const ground = c.createLinearGradient(0, h * 0.56, 0, h);
  ground.addColorStop(0, "#18313c00");
  ground.addColorStop(0.45, "#19343d99");
  ground.addColorStop(1, "#0e2634ee");
  c.fillStyle = ground;
  c.fillRect(0, h * 0.56, w, h * 0.44);
  // Distant birds follow a smooth looping path; they never cross the main HUD.
  for (let i = 0; i < 3; i++) {
    const x = ((t * 10 + i * 28 + w * 0.34) % (w + 100)) - 50,
      y = h * 0.2 + Math.sin(t * 0.18 + i) * 12 + i * 8;
    c.beginPath();
    c.moveTo(x - 4, y + Math.sin(t * 5 + i) * 2);
    c.quadraticCurveTo(x - 2, y - 3, x, y);
    c.quadraticCurveTo(x + 2, y - 3, x + 4, y + Math.sin(t * 5 + i) * 2);
    c.strokeStyle = "#b7c7bd33";
    c.lineWidth = 1;
    c.stroke();
  }
}

export function steam(
  p: IsometricPainter,
  x: number,
  y: number,
  z: number,
  t: number,
) {
  const c = p.ctx,
    base = p.point(x, y, z);
  c.save();
  c.translate(base.x, base.y);
  c.scale(p.scale, p.scale);
  for (let i = 0; i < 3; i++) {
    const phase = (t * 0.22 + i / 3) % 1;
    c.globalAlpha = Math.sin(phase * Math.PI) * 0.3;
    c.beginPath();
    c.moveTo(Math.sin(t + i) * 2, -phase * 17);
    c.bezierCurveTo(
      -6 + Math.sin(t * 0.7 + i) * 4,
      -9 - phase * 17,
      8,
      -15 - phase * 17,
      Math.sin(t * 0.9 + i) * 5,
      -25 - phase * 17,
    );
    c.strokeStyle = "#fff2d4";
    c.lineWidth = 1.1;
    c.stroke();
  }
  c.restore();
}

export function sunbeams(p: IsometricPainter, t: number) {
  const c = p.ctx;
  for (const y of [1.6, 3.6]) {
    const a = p.point(0.06, y, 132),
      b = p.point(0.06, y + 1.2, 132),
      d = p.point(3.2, y + 1.7, 2),
      e = p.point(2.3, y - 0.15, 2);
    const gradient = c.createLinearGradient(a.x, a.y, d.x, d.y);
    gradient.addColorStop(0, "#fff2c525");
    gradient.addColorStop(0.5, "#ffe4a518");
    gradient.addColorStop(1, "#ffe4a500");
    c.save();
    c.globalAlpha = 0.8 + Math.sin(t * 0.35 + y) * 0.2;
    c.fillStyle = gradient;
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.lineTo(d.x, d.y);
    c.lineTo(e.x, e.y);
    c.closePath();
    c.fill();
    c.restore();
    p.plane(0.12, y, 2.5, 1.25, 2, "#ffdfad19");
    // The window crossbar leaves a real shadow on the floor.
    p.plane(1.05, y + 0.05, 0.07, 1.15, 3, "#725c421b");
  }
}

export function studioLamp(
  p: IsometricPainter,
  x: number,
  y: number,
  t: number,
) {
  const c = p.ctx,
    light = p.point(x, y, 95),
    base = p.point(x, y, 2);
  p.ellipse(base, 13, 7, "#253d42");
  p.line([base, p.point(x, y, 100)], "#475a59", 3);
  p.polygon(
    [
      p.point(x - 0.25, y - 0.12, 90),
      p.point(x + 0.25, y - 0.12, 90),
      p.point(x + 0.14, y - 0.12, 112),
      p.point(x - 0.14, y - 0.12, 112),
    ],
    "#ecd2a0",
  );
  p.ellipse(p.point(x, y, 90), 17, 6, "#f4dba8");
  const glow = c.createRadialGradient(
    light.x,
    light.y,
    0,
    light.x,
    light.y,
    105 * p.scale,
  );
  glow.addColorStop(0, "#ffde9944");
  glow.addColorStop(0.35, "#ffc57819");
  glow.addColorStop(1, "#ffc57800");
  c.save();
  c.globalAlpha = 0.88 + Math.sin(t * 0.65) * 0.05;
  c.fillStyle = glow;
  c.fillRect(
    light.x - 110 * p.scale,
    light.y - 110 * p.scale,
    220 * p.scale,
    220 * p.scale,
  );
  c.restore();
}

export function wallClock(p: IsometricPainter, t: number) {
  const q = p.point(3.1, 0.03, 156),
    c = p.ctx;
  c.save();
  c.translate(q.x, q.y);
  c.scale(p.scale, p.scale);
  c.beginPath();
  c.ellipse(0, 0, 10, 12, 0.2, 0, Math.PI * 2);
  c.fillStyle = "#e6d7b5";
  c.fill();
  c.strokeStyle = "#8a7d64";
  c.lineWidth = 2;
  c.stroke();
  c.strokeStyle = "#465d5e";
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(-4, -4);
  c.moveTo(0, 0);
  c.lineTo(4, -5);
  c.stroke();
  c.rotate((t * Math.PI) / 30);
  c.strokeStyle = "#bc9262";
  c.lineWidth = 0.7;
  c.beginPath();
  c.moveTo(0, 2);
  c.lineTo(0, -8);
  c.stroke();
  c.restore();
}

export function motes(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
) {
  c.save();
  for (let i = 0; i < 44; i++) {
    const x = (((i * 157.7 + t * ((i % 3) + 1) * 2.1) % w) + w) % w,
      y = (((i * 87.4 - t * 0.9 + Math.sin(t * 0.35 + i) * 22) % h) + h) % h;
    c.globalAlpha = 0.08 + (Math.sin(t * 0.5 + i) * 0.5 + 0.5) * 0.18;
    c.fillStyle = i % 4 === 0 ? "#9dcaca" : "#ffe0a2";
    c.beginPath();
    c.arc(x, y, i % 4 === 0 ? 1.6 : 0.8, 0, Math.PI * 2);
    c.fill();
    if (i % 8 === 0) {
      c.globalAlpha *= 0.2;
      c.beginPath();
      c.arc(x, y, 5, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}
