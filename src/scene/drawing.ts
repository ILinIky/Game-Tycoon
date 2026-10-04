export interface Point {
  x: number;
  y: number;
}
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}
export class IsometricPainter {
  constructor(
    public ctx: CanvasRenderingContext2D,
    public origin: Point,
    public scale: number,
  ) {}
  point(x: number, y: number, z = 0): Point {
    return {
      x: this.origin.x + (x - y) * 58 * this.scale,
      y: this.origin.y + (x + y) * 29 * this.scale - z * this.scale,
    };
  }
  polygon(points: Point[], color: string, stroke?: string) {
    const c = this.ctx;
    c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath();
    c.fillStyle = color;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = this.scale;
      c.stroke();
    }
  }
  plane(
    x: number,
    y: number,
    w: number,
    d: number,
    z: number,
    color: string,
    stroke?: string,
  ) {
    this.polygon(
      [
        this.point(x, y, z),
        this.point(x + w, y, z),
        this.point(x + w, y + d, z),
        this.point(x, y + d, z),
      ],
      color,
      stroke,
    );
  }
  box(
    x: number,
    y: number,
    w: number,
    d: number,
    z: number,
    height: number,
    colors: [string, string, string],
  ) {
    this.polygon(
      [
        this.point(x, y + d, z),
        this.point(x + w, y + d, z),
        this.point(x + w, y + d, z + height),
        this.point(x, y + d, z + height),
      ],
      colors[1],
    );
    this.polygon(
      [
        this.point(x + w, y, z),
        this.point(x + w, y + d, z),
        this.point(x + w, y + d, z + height),
        this.point(x + w, y, z + height),
      ],
      colors[2],
    );
    this.plane(x, y, w, d, z + height, colors[0]);
  }
  line(points: Point[], color: string, width = 1) {
    this.ctx.beginPath();
    points.forEach((p, i) =>
      i ? this.ctx.lineTo(p.x, p.y) : this.ctx.moveTo(p.x, p.y),
    );
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width * this.scale;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.stroke();
  }
  ellipse(p: Point, rx: number, ry: number, color: string) {
    this.ctx.beginPath();
    this.ctx.ellipse(
      p.x,
      p.y,
      rx * this.scale,
      ry * this.scale,
      0,
      0,
      Math.PI * 2,
    );
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }
  text(
    text: string,
    p: Point,
    size: number,
    color: string,
    align: CanvasTextAlign = "center",
  ) {
    this.ctx.font = `${size * this.scale}px "Oxanium Variable", "Segoe UI", sans-serif`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = align;
    this.ctx.fillText(text, p.x, p.y);
  }
}
