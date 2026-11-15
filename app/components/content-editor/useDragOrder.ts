import { useState, type DragEvent } from "react";
import { useAutoScrollWhileDragging } from "./useAutoScrollWhileDragging";

export type DragState = "dragging" | "target" | null;

/**
 * Drag-and-drop ordering for one list: which row is being dragged, which one is under the
 * pointer, and `onReorder(sourceId, targetId)` on drop. Shared by the block editor and the
 * admin structure tree. `handleProps` go on the drag handle and `targetProps` on the row; rows
 * ignore drags that belong to another list, so lists can be nested.
 */
export function useDragOrder<Id extends string | number>(
  onReorder: (sourceId: Id, targetId: Id) => void,
) {
  const [draggingId, setDraggingId] = useState<Id | null>(null);
  const [dropTargetId, setDropTargetId] = useState<Id | null>(null);
  useAutoScrollWhileDragging(draggingId !== null);

  const reset = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  const dropOn = (targetId: Id) => {
    const sourceId = draggingId;
    reset();
    if (sourceId === null || sourceId === targetId) return;
    onReorder(sourceId, targetId);
  };

  const dragStateOf = (id: Id): DragState => {
    if (draggingId === id) return "dragging";
    if (dropTargetId === id && draggingId !== null) return "target";
    return null;
  };

  /** The handle is the only draggable part so text selection inside the row keeps working. */
  const handleProps = (id: Id) => ({
    draggable: true,
    onDragStart: (event: DragEvent<HTMLElement>) => {
      event.dataTransfer?.setData("text/plain", String(id));
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      setDraggingId(id);
    },
    onDragEnd: reset,
  });

  const targetProps = (id: Id) => ({
    "data-drag": dragStateOf(id) ?? undefined,
    onDragEnter: () => {
      if (draggingId !== null) setDropTargetId(id);
    },
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (draggingId === null) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      if (draggingId === null) return;
      event.preventDefault();
      dropOn(id);
    },
  });

  return {
    dropOn,
    dragStateOf,
    handleProps,
    targetProps,
    startDrag: setDraggingId,
    enterTarget: setDropTargetId,
    endDrag: reset,
  };
}
