import { describe, expect, it } from "vitest";
import { moveToPositionOf, swapWithNeighbour } from "~/shared/ordering";

const rows = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
const ids = (ordered: { id: number }[] | null) => ordered?.map((row) => row.id) ?? null;

describe("swapWithNeighbour", () => {
  it("swaps with the neighbour and stops at the edges", () => {
    expect(ids(swapWithNeighbour(rows, 2, "down"))).toEqual([1, 3, 2, 4]);
    expect(ids(swapWithNeighbour(rows, 2, "up"))).toEqual([2, 1, 3, 4]);
    expect(swapWithNeighbour(rows, 1, "up")).toBeNull();
    expect(swapWithNeighbour(rows, 4, "down")).toBeNull();
    expect(swapWithNeighbour(rows, 9, "up")).toBeNull();
  });
});

describe("moveToPositionOf", () => {
  it("puts the row where the target is, shifting the rows in between", () => {
    expect(ids(moveToPositionOf(rows, 1, 3))).toEqual([2, 3, 1, 4]);
    expect(ids(moveToPositionOf(rows, 4, 2))).toEqual([1, 4, 2, 3]);
  });

  it("returns null for the same row or a row that is not in the list", () => {
    expect(moveToPositionOf(rows, 2, 2)).toBeNull();
    expect(moveToPositionOf(rows, 2, 9)).toBeNull();
    expect(moveToPositionOf(rows, 9, 2)).toBeNull();
  });
});
