import { describe, expect, it } from 'vitest';
import {
  computePeaks,
  deleteRange,
  encodeWav,
  fade,
  gain,
  insertAt,
  keepRange,
  normalize,
  pcmLength,
  reverse,
  silence,
  type Pcm,
} from './audioEdit';

const mono = (...values: number[]): Pcm => ({ sampleRate: 8000, channels: [Float32Array.from(values)] });
const values = (pcm: Pcm, c = 0) => Array.from(pcm.channels[c]);

describe('audioEdit', () => {
  it('keeps and deletes ranges, clamping out-of-bounds and reversed indices', () => {
    const pcm = mono(1, 2, 3, 4, 5);
    expect(values(keepRange(pcm, 1, 3))).toEqual([2, 3]);
    expect(values(keepRange(pcm, 4, -10))).toEqual([1, 2, 3, 4]);
    expect(values(deleteRange(pcm, 1, 3))).toEqual([1, 4, 5]);
    expect(values(deleteRange(pcm, 0, 99))).toEqual([]);
    expect(values(pcm)).toEqual([1, 2, 3, 4, 5]); // input untouched
  });

  it('inserts with channel upmix', () => {
    const stereo: Pcm = { sampleRate: 8000, channels: [Float32Array.from([9]), Float32Array.from([8])] };
    const out = insertAt(mono(1, 2), stereo, 1);
    expect(out.channels).toHaveLength(2);
    expect(values(out, 0)).toEqual([1, 9, 2]);
    expect(values(out, 1)).toEqual([1, 8, 2]);
    expect(() => insertAt(mono(1), { ...mono(1), sampleRate: 44100 }, 0)).toThrow();
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
