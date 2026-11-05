import { useState, type Dispatch, type SetStateAction } from "react";
import type { ContentBlock } from "~/schemas/content-blocks";
import { useAutoScrollWhileDragging } from "./useAutoScrollWhileDragging";

export type DragState = "dragging" | "target" | null;

/**
 * Drag-and-drop ordering for the block list: which card is being dragged, which one is under
 * the pointer, and the reorder on drop. Keyboard moves (`moveAt`) live here too so every way of
 * reordering is in one place.
 */
export function useBlockDragOrder(setBlocks: Dispatch<SetStateAction<ContentBlock[]>>) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  useAutoScrollWhileDragging(draggingId !== null);

  const reset = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

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

  /** Drop the dragged block at the target's position, shifting the others. */
  const dropOn = (targetId: string) => {
    const sourceId = draggingId;
    reset();
    if (!sourceId || sourceId === targetId) return;
    setBlocks((current) => {
      const from = current.findIndex((entry) => entry.id === sourceId);
      const to = current.findIndex((entry) => entry.id === targetId);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [moving] = next.splice(from, 1);
      if (!moving) return current;
      next.splice(to, 0, moving);
      return next;
    });
  };

  const dragStateOf = (blockId: string): DragState => {
    if (draggingId === blockId) return "dragging";
    if (dropTargetId === blockId && draggingId !== null) return "target";
    return null;
  };

  return {
    moveAt,
    dropOn,
    dragStateOf,
    startDrag: setDraggingId,
    enterTarget: setDropTargetId,
    endDrag: reset,
  };
}
