import { GripVertical } from "lucide-react";
import type { ComponentProps, KeyboardEvent } from "react";
import { IconButton } from "~/components/IconButton";
import type { MoveDirection } from "~/shared/ordering";

/**
 * Grip that drags its row (spread `useDragOrder`'s `handleProps` onto it); the arrow keys move
 * the row one step for keyboard users.
 */
export function DragHandle({
  label,
  onMove,
  ...dragProps
}: {
  label: string;
  onMove: (direction: MoveDirection) => void;
} & ComponentProps<"button">) {
  const handleKeys = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onMove("up");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      onMove("down");
    }
  };
  return (
    <IconButton
      label={label}
      icon={<GripVertical size={16} aria-hidden="true" />}
      className="drag-handle"
      onKeyDown={handleKeys}
      {...dragProps}
    />
  );
}
