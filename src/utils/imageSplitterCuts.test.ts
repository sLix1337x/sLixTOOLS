import { describe, expect, it } from 'vitest';
import { allCuts, insertCut, moveCut, uniformCuts } from './imageSplitterCuts';

// Tiles must tile the image exactly: strictly increasing bounds from 0 to total.
const assertTiles = (total: number, cuts: number[]) => {
  const b = allCuts(total, cuts);
  for (let i = 0; i < b.length - 1; i++) expect(b[i + 1]).toBeGreaterThan(b[i]);
  expect(b[b.length - 1]).toBe(total);
};

describe('imageSplitterCuts', () => {
  it('uniformCuts covers non-divisible sizes with no empty tiles', () => {
    expect(uniformCuts(1001, 3)).toEqual([334, 667]);
    assertTiles(1001, uniformCuts(1001, 3));
    assertTiles(3, uniformCuts(3, 20));
    expect(uniformCuts(3, 20)).toHaveLength(2);
  });

  it('insertCut keeps cuts sorted (2 -> 3 columns)', () => {
    expect(insertCut(1000, [500])).toEqual([250, 500]);
    let cuts: number[] = [];
    for (let i = 0; i < 19; i++) cuts = insertCut(1000, cuts)!;
    assertTiles(1000, cuts);
    expect(insertCut(1, [])).toBeNull();
  });

  it('moveCut never crosses neighbours, even in tiny cells', () => {
    expect(moveCut([100, 200], 0, 500, 300)).toEqual([192, 200]);
    const cuts = uniformCuts(40, 10); // 4px cells < 2 * MIN_CELL
    assertTiles(40, moveCut(cuts, 3, 1000, 40));
    assertTiles(40, moveCut(cuts, 3, -1000, 40));
  });
});
