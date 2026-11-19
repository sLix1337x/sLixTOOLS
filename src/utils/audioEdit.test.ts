import { describe, expect, it } from 'vitest';
import {
  computePeaks,
  cutClips,
  deleteTrackRange,
  editTrackRange,
  encodeWav,
  equalize,
  fade,
  gain,
  insertIntoTrack,
  keepRange,
  moveRange,
  normalize,
  pcmLength,
  renderClips,
  reverse,
  silence,
  tracksLength,
  type Clip,
  type Pcm,
  type Track,
} from './audioEdit';

const mono = (...values: number[]): Pcm => ({ sampleRate: 8000, channels: [Float32Array.from(values)] });
const values = (pcm: Pcm, c = 0) => Array.from(pcm.channels[c]);

describe('audioEdit', () => {
  it('keeps ranges, clamping out-of-bounds and reversed indices', () => {
    const pcm = mono(1, 2, 3, 4, 5);
    expect(values(keepRange(pcm, 1, 3))).toEqual([2, 3]);
    expect(values(keepRange(pcm, 4, -10))).toEqual([1, 2, 3, 4]);
    expect(values(pcm)).toEqual([1, 2, 3, 4, 5]); // input untouched
  });

  it('silences, gains with clipping, fades', () => {
    expect(values(silence(mono(1, 1, 1), 1, 2))).toEqual([1, 0, 1]);
    expect(values(gain(mono(0.25, 0.75), 0, 2, 2))).toEqual([0.5, 1]);
    expect(values(fade(mono(1, 1, 1), 0, 3, 'in'))).toEqual([0, 0.5, 1]);
    expect(values(fade(mono(1, 1, 1), 0, 3, 'out'))).toEqual([1, 0.5, 0]);
  });

  it('normalizes to the target peak and leaves silence alone', () => {
    const out = normalize(mono(0.1, -0.5), 0, 2, 1);
    expect(values(out)).toEqual([0.2, -1].map((v) => Math.fround(v)));
    const quiet = mono(0, 0);
    expect(normalize(quiet, 0, 2)).toBe(quiet);
  });

  it('reverses only the range', () => {
    expect(values(reverse(mono(1, 2, 3, 4), 1, 4))).toEqual([1, 4, 3, 2]);
  });

  it('equalizes: low shelf lifts bass, high shelf lifts treble, flat EQ changes nothing', () => {
    const n = 4000;
    const dc = mono(...Array<number>(n).fill(0.1));
    const nyquist = mono(...Array.from({ length: n }, (_, i) => (i % 2 ? -0.1 : 0.1)));
    const settled = (p: Pcm) => Math.abs(p.channels[0][n - 100]);
    const plus6 = 0.1 * 10 ** (6 / 20);
    expect(settled(equalize(dc, 0, n, { low: 6, mid: 0, high: 0 }))).toBeCloseTo(plus6, 3);
    expect(settled(equalize(dc, 0, n, { low: 0, mid: 6, high: 6 }))).toBeCloseTo(0.1, 3);
    expect(settled(equalize(nyquist, 0, n, { low: 0, mid: 0, high: 6 }))).toBeCloseTo(plus6, 3);
    expect(values(equalize(dc, 0, n, { low: 0, mid: 0, high: 0 }))).toEqual(values(dc));
  });

  describe('tracks', () => {
    const clip = (at: number, ...v: number[]): Clip => ({ at, pcm: mono(...v) });
    const flat = (t: Track) => values(renderClips(t.clips, 8000, 0, tracksLength([t])));
    const track = (...clips: Clip[]): Track => ({ id: 1, clips });

    it('renders gaps as silence, sums overlaps and upmixes mono', () => {
      expect(values(renderClips([clip(1, 1, 2), clip(2, 10)], 8000, 0, 4))).toEqual([0, 1, 12, 0]);
      const stereo: Clip = { at: 0, pcm: { sampleRate: 8000, channels: [Float32Array.from([9]), Float32Array.from([8])] } };
      const out = renderClips([stereo, clip(0, 1)], 8000, 0, 1);
      expect([values(out, 0), values(out, 1)]).toEqual([[10], [9]]);
    });

    it('cuts in place, deletes with ripple, inserts with ripple', () => {
      const t = track(clip(0, 1, 2, 3, 4), clip(6, 7));
      expect(flat({ ...t, clips: cutClips(t.clips, 1, 3) })).toEqual([1, 0, 0, 4, 0, 0, 7]);
      expect(flat(deleteTrackRange(t, 1, 3))).toEqual([1, 4, 0, 0, 7]);
      expect(flat(insertIntoTrack(t, 2, mono(9)))).toEqual([1, 2, 9, 3, 4, 0, 0, 7]);
    });

    it('edits a range as one clip and moves parts between tracks', () => {
      const t = track(clip(0, 1, 1, 1, 1));
      expect(flat(editTrackRange(t, 8000, 1, 3, (p) => silence(p, 0, 2)))).toEqual([1, 0, 0, 1]);
      expect(editTrackRange(t, 8000, 5, 6, (p) => p)).toBe(t);
      const [a, b] = moveRange([t, { id: 2, clips: [] }], 8000, 1, 1, 3, 2, 5);
      expect(flat(a)).toEqual([1, 0, 0, 1]);
      expect(values(renderClips(b.clips, 8000, 0, 7))).toEqual([0, 0, 0, 0, 0, 1, 1]);
    });
  });

  it('computes min/max peaks per bucket', () => {
    expect(Array.from(computePeaks(mono(0.5, -0.5, 0.25, 0), 0, 4, 2))).toEqual([-0.5, 0.5, 0, 0.25]);
  });

  it('encodes a 16-bit WAV with a valid header', async () => {
    const wav = encodeWav(mono(1, -1, 0));
    const view = new DataView(await wav.arrayBuffer());
    expect(wav.size).toBe(44 + 3 * 2);
    expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');
    expect(view.getUint32(24, true)).toBe(8000);
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x8000);
    expect(pcmLength(mono())).toBe(0);
  });
});
