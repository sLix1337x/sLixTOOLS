import { describe, it, expect } from 'vitest';
import { getFrameTimes, getGifDimensions } from './gifConverter';

describe('getFrameTimes', () => {
  it('emits one frame per 1/fps step that fits before the end', () => {
    expect(getFrameTimes(0, 1, 4)).toEqual([0, 0.25, 0.5, 0.75]);
    expect(getFrameTimes(0, 1, 10)).toHaveLength(10); // float drift must not drop the last frame
    expect(getFrameTimes(2, 2.35, 10)).toHaveLength(3);
  });

  it('returns no frames for an empty or sub-frame range', () => {
    expect(getFrameTimes(5, 5, 10)).toEqual([]);
    expect(getFrameTimes(5, 4, 10)).toEqual([]);
    expect(getFrameTimes(0, 0.05, 10)).toEqual([]);
  });
});

describe('getGifDimensions', () => {
  it('uses the source size, scaled to fit 800px', () => {
    expect(getGifDimensions(640, 360)).toEqual({ width: 640, height: 360 });
    expect(getGifDimensions(1920, 1080)).toEqual({ width: 800, height: 450 });
  });

  it('derives a missing side from the aspect ratio', () => {
    expect(getGifDimensions(1920, 1080, 480)).toEqual({ width: 480, height: 270 });
    expect(getGifDimensions(1920, 1080, undefined, 270)).toEqual({ width: 480, height: 270 });
  });

  it('clamps tiny sides to 2 and treats non-positive as auto', () => {
    expect(getGifDimensions(1920, 1080, 1, 1)).toEqual({ width: 2, height: 2 });
    expect(getGifDimensions(640, 360, -100, 0)).toEqual({ width: 640, height: 360 });
  });
});
