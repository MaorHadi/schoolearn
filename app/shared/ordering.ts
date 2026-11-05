// Shared (client-safe). Reordering helper for sortOrder lists.

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
