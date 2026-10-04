import { useEffect, useState } from "react";
import { useStudioMotion } from "./GameMotion";
export default function ClickFeedback() {
  const animated = useStudioMotion();
  const [rings, setRings] = useState<{ id: number; x: number; y: number }[]>(
    [],
  );
  useEffect(() => {
    if (!animated) {
      setRings([]);
      return;
    }
    let id = 0;
    const handler = (event: PointerEvent) => {
      const button =
        event.target instanceof Element ? event.target.closest("button") : null;
      if (!button || button.disabled) return;
      const ring = { id: ++id, x: event.clientX, y: event.clientY };
      setRings((previous) => [...previous.slice(-5), ring]);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [animated]);
  return (
    <div className="click-feedback" aria-hidden="true">
      {rings.map((ring) => (
        <span
          key={ring.id}
          style={{ left: ring.x, top: ring.y }}
          onAnimationEnd={() =>
            setRings((previous) => previous.filter((r) => r.id !== ring.id))
          }
        >
          <i />
          <b />
        </span>
      ))}
    </div>
  );
}
