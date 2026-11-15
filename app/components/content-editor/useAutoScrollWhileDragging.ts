import { useEffect } from "react";

/** Pixels from the viewport edge where dragging starts to scroll, and the top speed per frame. */
const AUTO_SCROLL_EDGE = 96;
const AUTO_SCROLL_MAX_STEP = 24;

/**
 * Native drag and drop blocks wheel scrolling, so while a row is dragged the page scrolls
 * itself when the pointer nears the top or bottom edge, faster the closer it gets.
 */
export function useAutoScrollWhileDragging(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let pointerY: number | null = null;
    let frame = 0;
    const tick = () => {
      if (pointerY !== null) {
        const viewportHeight = window.innerHeight;
        let step = 0;
        if (pointerY < AUTO_SCROLL_EDGE) {
          step = -((AUTO_SCROLL_EDGE - pointerY) / AUTO_SCROLL_EDGE) * AUTO_SCROLL_MAX_STEP;
        } else if (pointerY > viewportHeight - AUTO_SCROLL_EDGE) {
          step =
            ((pointerY - (viewportHeight - AUTO_SCROLL_EDGE)) / AUTO_SCROLL_EDGE) *
            AUTO_SCROLL_MAX_STEP;
        }
        if (step !== 0) window.scrollBy(0, step);
      }
      frame = window.requestAnimationFrame(tick);
    };
    const track = (event: DragEvent) => {
      pointerY = event.clientY;
    };
    document.addEventListener("dragover", track);
    frame = window.requestAnimationFrame(tick);
    return () => {
      document.removeEventListener("dragover", track);
      window.cancelAnimationFrame(frame);
    };
  }, [active]);
}
