import { useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw, Move, Scan } from "lucide-react";
import { useGame } from "../../store/gameStore";
import { renderStudio, type SceneTarget } from "../../scene/studioRenderer";
import type { Camera } from "../../scene/drawing";
import { AnimatePresence, motion } from "framer-motion";
export default function StudioWorld({
  onSelect,
  selected,
  animated,
  blocked,
  titleScreen = false,
}: {
  onSelect: (target: SceneTarget) => void;
  selected: string | null;
  animated: boolean;
  blocked: boolean;
  titleScreen?: boolean;
}) {
  const game = useGame((s) => s.game);
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const current = useRef({ game, selected, animated, blocked, titleScreen });
  current.current = { game, selected, animated, blocked, titleScreen };
  const camera = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const hits = useRef<SceneTarget[]>([]);
  const hover = useRef<string | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const [tip, setTip] = useState<{
    label: string;
    x: number;
    y: number;
  } | null>(null);
  useEffect(() => {
    const el = canvas.current,
      container = host.current;
    if (!el || !container) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    let w = 0,
      h = 0,
      frame = 0,
      last = 0,
      time = 0,
      ambienceTime = 0,
      lastPaint = 0;
    let painted: {
      game: typeof game;
      selected: string | null;
      hover: string | null;
      x: number;
      y: number;
      zoom: number;
      titleScreen: boolean;
    } | null = null;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      painted = null;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const draw = (stamp: number) => {
      const data = current.current;
      const moving = data.animated && !document.hidden;
      if (last && moving) {
        const delta = Math.min(0.05, (stamp - last) / 1000);
        ambienceTime += delta;
        if (!data.blocked && (data.game.speed > 0 || data.titleScreen))
          time += delta;
      }
      last = stamp;
      const cam = camera.current;
      const changed =
        !painted ||
        painted.game !== data.game ||
        painted.selected !== data.selected ||
        painted.hover !== hover.current ||
        painted.x !== cam.x ||
        painted.y !== cam.y ||
        painted.zoom !== cam.zoom ||
        painted.titleScreen !== data.titleScreen;
      if (changed || (moving && stamp - lastPaint >= (w < 720 ? 33 : 16))) {
        const viewCamera = {
          ...cam,
          zoom: cam.zoom * (data.titleScreen || w < 720 ? 1 : 0.84),
          x: cam.x + (data.titleScreen ? 0 : w * 0.035),
          y: cam.y - (data.titleScreen ? 0 : h * 0.035),
        };
        hits.current = renderStudio(
          ctx,
          w,
          h,
          data.game,
          time,
          viewCamera,
          data.selected,
          hover.current,
          ambienceTime,
        );
        lastPaint = stamp;
        painted = {
          game: data.game,
          selected: data.selected,
          hover: hover.current,
          ...cam,
          titleScreen: data.titleScreen,
        };
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const wheel = (e: WheelEvent) => {
      if (current.current.blocked || current.current.titleScreen) return;
      e.preventDefault();
      camera.current.zoom = Math.max(
        0.65,
        Math.min(1.7, camera.current.zoom - e.deltaY * 0.001),
      );
    };
    container.addEventListener("wheel", wheel, { passive: false });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      container.removeEventListener("wheel", wheel);
    };
  }, []);
  const find = (x: number, y: number) =>
    [...hits.current]
      .reverse()
      .find((t) => Math.hypot(t.x - x, (t.y - y) * 1.1) < t.radius);
  function fullScreen() {
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  }
  return (
    <div className="studio-world" ref={host} data-title={titleScreen}>
      <canvas
        ref={canvas}
        aria-label="Dein lebendiges isometrisches Spiele-Studio. Mitarbeiter, Projekt-Whiteboard, Forschung und Spielearchiv sind über die Spielbedienung erreichbar."
        onPointerDown={(e) => {
          if (blocked || titleScreen) return;
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            startX: e.clientX,
            startY: e.clientY,
            moved: false,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (blocked || titleScreen) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left,
            y = e.clientY - rect.top;
          if (drag.current && e.buttons) {
            const d = drag.current;
            if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 5)
              d.moved = true;
            if (d.moved) {
              camera.current.x = Math.max(
                -450,
                Math.min(450, camera.current.x + e.clientX - d.x),
              );
              camera.current.y = Math.max(
                -300,
                Math.min(300, camera.current.y + e.clientY - d.y),
              );
            }
            d.x = e.clientX;
            d.y = e.clientY;
            setTip(null);
            return;
          }
          const t = find(x, y);
          hover.current = t?.id ?? null;
          e.currentTarget.style.cursor = t ? "pointer" : "grab";
          setTip(
            t
              ? {
                  label: t.label,
                  x: Math.min(x, rect.width - 250),
                  y: Math.max(85, y - 70),
                }
              : null,
          );
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d || d.moved || blocked) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const t = find(e.clientX - rect.left, e.clientY - rect.top);
          if (t) onSelect(t);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          hover.current = null;
          setTip(null);
        }}
      />
      <AnimatePresence>
        {tip && !blocked && (
          <motion.div
            initial={animated ? { opacity: 0, y: 5 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: animated ? 0.13 : 0 }}
            className="world-tooltip"
            style={{ left: Math.max(80, tip.x), top: tip.y }}
          >
            {tip.label}
            <small>Anklicken zum Öffnen</small>
          </motion.div>
        )}
      </AnimatePresence>
      {!titleScreen && (
        <div className="camera-controls">
          <span>
            <Move size={13} />
            Ziehen zum Bewegen
          </span>
          <button
            aria-label="Verkleinern"
            onClick={() => {
              camera.current.zoom = Math.max(0.65, camera.current.zoom - 0.1);
            }}
          >
            <Minus size={16} />
          </button>
          <button
            aria-label="Vergrößern"
            onClick={() => {
              camera.current.zoom = Math.min(1.7, camera.current.zoom + 0.1);
            }}
          >
            <Plus size={16} />
          </button>
          <button
            aria-label="Kamera zurücksetzen"
            onClick={() => {
              camera.current = { x: 0, y: 0, zoom: 1 };
            }}
          >
            <RotateCcw size={14} />
          </button>
          <button aria-label="Vollbild umschalten" onClick={fullScreen}>
            <Scan size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
