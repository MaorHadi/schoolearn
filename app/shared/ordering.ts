// Shared (client-safe). Reordering helpers for sortOrder lists.

export type MoveDirection = "up" | "down";

/**
 * Swap the row with its neighbour in the given direction. Returns the new order (the caller
 * rewrites sortOrder as 1..n, which also repairs duplicates), or null when already at the edge.
 */
export function swapWithNeighbour<Row extends { id: number }>(
  rows: Row[],
  id: number,
  direction: MoveDirection,
): Row[] | null {
  const index = rows.findIndex((row) => row.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= rows.length) return null;
  const reordered = [...rows];
  const current = reordered[index];
  const neighbour = reordered[target];
  if (!current || !neighbour) return null;
  reordered[index] = neighbour;
  reordered[target] = current;
  return reordered;
}

/**
 * Move the row to the position the target row holds, shifting the rows in between (a drag and
 * drop). Returns the new order, or null when either row is missing or they are the same row.
 */
export function moveToPositionOf<Id, Row extends { id: Id }>(
  rows: Row[],
  id: Id,
  targetId: Id,
): Row[] | null {
  const from = rows.findIndex((row) => row.id === id);
  const to = rows.findIndex((row) => row.id === targetId);
  if (from === -1 || to === -1 || from === to) return null;
  const reordered = [...rows];
  const [moving] = reordered.splice(from, 1);
  if (!moving) return null;
  reordered.splice(to, 0, moving);
  return reordered;
}
