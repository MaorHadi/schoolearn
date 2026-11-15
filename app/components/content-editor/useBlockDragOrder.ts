import type { Dispatch, SetStateAction } from "react";
import type { ContentBlock } from "~/schemas/content-blocks";
import { moveToPositionOf } from "~/shared/ordering";
import { useDragOrder } from "./useDragOrder";

export type { DragState } from "./useDragOrder";

/**
 * Drag-and-drop ordering for the block list: the dragged block takes the position of the card
 * it is dropped on. Keyboard moves (`moveAt`) live here too so every way of reordering is in
 * one place.
 */
export function useBlockDragOrder(setBlocks: Dispatch<SetStateAction<ContentBlock[]>>) {
  const drag = useDragOrder<string>((sourceId, targetId) =>
    setBlocks((current) => moveToPositionOf(current, sourceId, targetId) ?? current),
  );

  /** Swap the block at `index` with its neighbour; no-op at the edges. */
  const moveAt = (index: number, offset: -1 | 1) =>
    setBlocks((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const moving = next[index];
      const other = next[target];
      if (!moving || !other) return current;
      next[index] = other;
      next[target] = moving;
      return next;
    });

  return {
    moveAt,
    dropOn: drag.dropOn,
    dragStateOf: drag.dragStateOf,
    startDrag: drag.startDrag,
    enterTarget: drag.enterTarget,
    endDrag: drag.endDrag,
  };
}
