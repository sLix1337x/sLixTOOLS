/** Minimum tile size (px) kept on each side when dragging a cut line. */
export const MIN_CELL = 8;

/** Evenly spaced cuts splitting `total` px into `n` parts (capped at `total` so no tile is 0 px). */
export const uniformCuts = (total: number, n: number): number[] => {
  const count = Math.min(n, total);
  return Array.from({ length: Math.max(count - 1, 0) }, (_, i) =>
    Math.round((total * (i + 1)) / count)
  );
};

export const allCuts = (total: number, cuts: number[]): number[] => [0, ...cuts, total];

/** Add a cut in the middle of the widest gap, keeping cuts sorted. Null when no gap can take one. */
export const insertCut = (total: number, cuts: number[]): number[] | null => {
  const bounds = allCuts(total, cuts);
  let gapIdx = 0;
  let gapSize = -1;
  for (let i = 0; i < bounds.length - 1; i++) {
    const g = bounds[i + 1] - bounds[i];
    if (g > gapSize) {
      gapSize = g;
      gapIdx = i;
    }
  }
  if (gapSize < 2) return null;
  const mid = Math.round((bounds[gapIdx] + bounds[gapIdx + 1]) / 2);
  return [...cuts.slice(0, gapIdx), mid, ...cuts.slice(gapIdx)];
};

/** Move cut `idx` to `pos`, clamped between its neighbours (up to MIN_CELL px margin). */
export const moveCut = (cuts: number[], idx: number, pos: number, total: number): number[] => {
  const lo = idx > 0 ? cuts[idx - 1] : 0;
  const hi = idx < cuts.length - 1 ? cuts[idx + 1] : total;
  const margin = Math.min(MIN_CELL, Math.floor((hi - lo) / 2));
  const next = [...cuts];
  next[idx] = Math.min(Math.max(Math.round(pos), lo + margin), hi - margin);
  return next;
};
