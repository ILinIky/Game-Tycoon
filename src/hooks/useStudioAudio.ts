import { useEffect, useSyncExternalStore } from "react";
import { studioAudio } from "../audio/StudioAudio";

export function useAudioState() {
  return useSyncExternalStore(studioAudio.subscribe, studioAudio.getSnapshot);
}

export function useStudioAudio(menuOpen: boolean) {
  useEffect(() => {
    const gesture = () => {
      void studioAudio.activate();
    };
    const clicked = (event: MouseEvent) => {
      const button =
        event.target instanceof Element ? event.target.closest("button") : null;
      if (button && !button.disabled && button.dataset.sound !== "none")
        studioAudio.play("click");
    };
    let previous: Element | null = null;
    const hovered = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const button =
        event.target instanceof Element ? event.target.closest("button") : null;
      if (button !== previous && button && !button.disabled)
        studioAudio.play("hover");
      previous = button;
    };
    const visibility = () => studioAudio.setHidden(document.hidden);
    document.addEventListener("pointerdown", gesture, true);
    document.addEventListener("keydown", gesture, true);
    document.addEventListener("click", clicked, true);
    document.addEventListener("pointerover", hovered, true);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("pointerdown", gesture, true);
      document.removeEventListener("keydown", gesture, true);
      document.removeEventListener("click", clicked, true);
      document.removeEventListener("pointerover", hovered, true);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    studioAudio.setMenu(menuOpen);
  }, [menuOpen]);
}
