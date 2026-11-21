import { describe, expect, it } from 'vitest';
import {
  audibleRange,
  bitcrush,
  computePeaks,
  copyRange,
  cutFilter,
  cutClips,
  deleteTrackRange,
  editTrackRange,
  encodeWav,
  equalize,
  eqResponse,
  fadeCurve,
  fade,
  gain,
  glue,
  insertIntoTrack,
  keepRange,
  limit,
  loudness,
  makeLoop,
  moveClips,
  moveRange,
  noise,
  NO_FX,
  normalize,
  pitchShift,
  pan,
  pasteClips,
  pcmLength,
  processTrack,
  renderClips,
  resizeClip,
  reverb,
  reverse,
  saturate,
  silence,
  tracksLength,
  transient,
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

  it('draws the EQ curve: full gain at a moved mid band, none far from it', () => {
    const gains = { low: 0, mid: 9, high: 0 };
    const freqs = { low: 200, mid: 3000, high: 4000 };
    expect(eqResponse(gains, freqs, 0.9, 3000)).toBeCloseTo(9, 3);
    expect(Math.abs(eqResponse(gains, freqs, 0.9, 30))).toBeLessThan(0.1);
    expect(eqResponse({ low: 6, mid: 0, high: 0 }, freqs, 0.9, 20)).toBeCloseTo(6, 1);
  });

  it('pitch-shifts by semitones and keeps the length', () => {
    const n = 16000;
    const sine = mono(...Array.from({ length: n }, (_, i) => 0.5 * Math.sin((2 * Math.PI * 500 * i) / 8000)));
    // Upward zero crossings in the middle second ≈ frequency in Hz
    const hz = (p: Pcm) => {
      const x = p.channels[0];
      let count = 0;
      for (let i = 4000; i < 12000; i++) if (x[i - 1] < 0 && x[i] >= 0) count++;
      return count;
    };
    const up = pitchShift(sine, 0, n, 12);
    expect(pcmLength(up)).toBe(n);
    expect(hz(up)).toBeGreaterThan(970);
    expect(hz(up)).toBeLessThan(1030);
    const down = pitchShift(sine, 0, n, -12);
    expect(hz(down)).toBeGreaterThan(242);
    expect(hz(down)).toBeLessThan(258);
    expect(pitchShift(sine, 0, n, 0)).toBe(sine);
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
      const [a, b] = moveRange([t, { id: 2, clips: [] }], 1, 1, 3, 2, 5);
      expect(flat(a)).toEqual([1, 0, 0, 1]);
      expect(values(renderClips(b.clips, 8000, 0, 7))).toEqual([0, 0, 0, 0, 0, 1, 1]);
    });

    it('copies a range, pastes it over what was there, and copy-moves', () => {
      const t = track(clip(0, 1, 2, 3, 4));
      const parts = copyRange(t.clips, 1, 3);
      expect(values(renderClips(parts, 8000, 0, 2))).toEqual([2, 3]);
      expect(flat(pasteClips(t, parts, 2, 2))).toEqual([1, 2, 2, 3]);
      const [a] = moveRange([t], 1, 0, 2, 1, 2, true);
      expect(flat(a)).toEqual([1, 2, 4, 6]);
    });

    it('trims a clip edge and drags it back out, also after a cut', () => {
      const c = clip(2, 1, 2, 3, 4);
      const short = resizeClip(c, 'end', 4);
      expect(values(short.pcm)).toEqual([1, 2]);
      expect(values(resizeClip(short, 'end', 99).pcm)).toEqual([1, 2, 3, 4]);
      const late = resizeClip(c, 'start', 4);
      expect([late.at, ...values(late.pcm)]).toEqual([4, 3, 4]);
      expect(resizeClip(late, 'start', 0).at).toBe(2);
      const [right] = cutClips([c], 0, 4);
      expect(values(resizeClip(right, 'start', 0).pcm)).toEqual([1, 2, 3, 4]);
    });

    it('applies clip gain and pans', () => {
      expect(values(renderClips([{ ...clip(0, 0.5), gain: -6 }], 8000, 0, 1)).map((v) => Math.round(v * 100))).toEqual([25]);
      const left = pan(mono(1), -1);
      expect([values(left, 0), values(left, 1)]).toEqual([[1], [0]]);
    });

    it('moves picked clips across tracks together', () => {
      const a = clip(0, 1);
      const b = clip(3, 2);
      const { tracks, moved } = moveClips([track(a, b), { id: 2, clips: [] }], [a, b], 1, 2);
      expect(tracks[0].clips).toEqual([]);
      expect(tracks[1].clips.map((c) => c.at)).toEqual([2, 5]);
      expect(moved).toHaveLength(2);
      expect(moveClips([track(a)], [a], 0, 1, true).tracks[0].clips).toHaveLength(2);
    });

    it('runs a neutral effect chain as a no-op and applies volume', () => {
      const p = mono(0.5, -0.5);
      expect(processTrack(p, NO_FX)).toBe(p);
      expect(values(processTrack(p, { ...NO_FX, volume: -6 })).map((v) => Math.round(v * 100))).toEqual([25, -25]);
    });

    it('applies clip fades, keeps whole fades through cuts and moves, bakes cut ones', () => {
      expect([fadeCurve(0.5, 0), fadeCurve(0.5, 1), fadeCurve(0.5, -1)]).toEqual([0.5, 0.9375, 0.0625]);
      const faded: Clip = { ...clip(0, 1, 1, 1, 1, 1, 1), fadeIn: { length: 2, curve: 0 }, fadeOut: { length: 2, curve: 0 } };
      const t = track(faded);
      expect(flat(t)).toEqual([0, 0.5, 1, 1, 0.5, 0]);
      const gap = { ...t, clips: cutClips(t.clips, 3, 4) };
      expect(flat(gap)).toEqual([0, 0.5, 1, 0, 0.5, 0]);
      expect(gap.clips.map((c) => [c.fadeIn?.length, c.fadeOut?.length])).toEqual([[2, undefined], [undefined, 2]]);
      const baked = cutClips(t.clips, 1, 2);
      expect(values(renderClips(baked, 8000, 0, 6))).toEqual([0, 0, 1, 1, 0.5, 0]);
      expect(baked[0].fadeIn).toBeUndefined();
      const [, moved] = moveRange([t, { id: 2, clips: [] }], 1, 0, 6, 2, 3);
      expect(moved.clips[0]).toMatchObject({ at: 3, fadeIn: faded.fadeIn, fadeOut: faded.fadeOut });
    });
  });

  it('glue-compresses above the threshold, with makeup and dry/wet', () => {
    const loud = mono(...Array<number>(4000).fill(0.5)); // about -6 dBFS
    const settings = { threshold: -20, ratio: 4, attack: 1, release: 100, makeup: 0, mix: 1 };
    const { pcm, reduction } = glue(loud, settings);
    const less = (20 * Math.log10(0.5) + 20) * 0.75; // reduction: dB over threshold × (1 - 1/4)
    expect(reduction).toBeCloseTo(less, 2);
    expect(pcm.channels[0][3999]).toBeCloseTo(0.5 * 10 ** (-less / 20), 3);
    expect(glue(loud, { ...settings, makeup: less }).pcm.channels[0][3999]).toBeCloseTo(0.5, 3);
    expect(values(glue(loud, { ...settings, mix: 0 }).pcm)).toEqual(values(loud));
    expect(glue(loud, { ...settings, threshold: 0 }).reduction).toBe(0);
  });

  describe('sfx', () => {
    const n = 8000;
    const dc = mono(...Array<number>(n).fill(0.1));
    const nyquist = mono(...Array.from({ length: n }, (_, i) => (i % 2 ? -0.1 : 0.1)));
    const settled = (p: Pcm) => Math.abs(p.channels[0][n - 100]);
    const peak = (p: Pcm) => Math.max(...p.channels.flatMap((ch) => Array.from(ch, Math.abs)));

    it('low cut removes bass, high cut removes treble', () => {
      expect(settled(cutFilter(dc, 0, n, { lowCut: 100, highCut: 0 }))).toBeLessThan(0.001);
      expect(settled(cutFilter(nyquist, 0, n, { lowCut: 0, highCut: 1000 }))).toBeLessThan(0.001);
      expect(settled(cutFilter(dc, 0, n, { lowCut: 0, highCut: 1000 }))).toBeCloseTo(0.1, 3);
      expect(cutFilter(dc, 0, n, { lowCut: 0, highCut: 0 })).toBe(dc);
    });

    it('saturates with tanh and bitcrushes with quantize and hold', () => {
      const loud = mono(...Array<number>(400).fill(0.9));
      expect(saturate(loud, 0, 400, 12).channels[0][200]).toBeCloseTo(Math.tanh(0.9 * 10 ** (12 / 20)), 5);
      expect(saturate(loud, 0, 400, 0)).toBe(loud);
      const crushed = bitcrush(mono(...Array.from({ length: 200 }, (_, i) => (i % 2 ? 0.1 : 0.3))), 0, 200, 2, 4000);
      expect(values(crushed).slice(100, 104)).toEqual([0.5, 0.5, 0.5, 0.5]);
    });

    it('shapes transients: attack boosts the onset, sustain scales the body', () => {
      const hit = mono(...Array.from({ length: n }, (_, i) => (i < 2000 ? 0 : 0.5)));
      expect(transient(hit, 0, n, 12, 0).channels[0][2020]).toBeGreaterThan(1);
      expect(transient(hit, 0, n, 12, 0).channels[0][7000]).toBeCloseTo(0.5, 2);
      expect(transient(hit, 0, n, 0, -12).channels[0][7000]).toBeCloseTo(0.5 * 10 ** (-12 / 20), 2);
    });

    it('measures LUFS and limits to a ceiling', () => {
      const sine = (amp: number): Pcm => ({
        sampleRate: 48000,
        channels: [Float32Array.from({ length: 96000 }, (_, i) => amp * Math.sin((2 * Math.PI * 1000 * i) / 48000))],
      });
      expect(loudness(sine(1))).toBeCloseTo(-3.01, 1);
      expect(loudness(sine(0.5))).toBeCloseTo(-9.03, 1);
      expect(loudness(mono(0, 0, 0))).toBe(-Infinity);
      const mixed = mono(...Array.from({ length: 4000 }, (_, i) => (i < 2000 ? 0.1 : i % 2 ? -0.9 : 0.9)));
      const limited = limit(mixed, -1, 6);
      expect(peak(limited)).toBeLessThanOrEqual(10 ** (-1 / 20) + 1e-6);
      expect(limited.channels[0][1000]).toBeCloseTo(0.1 * 10 ** (6 / 20), 4);
    });

    it('finds the audible range, generates noise, loops seamlessly', () => {
      expect(audibleRange(mono(0, 0, 0.5, 0, 0.2, 0, 0))).toEqual([2, 5]);
      expect(audibleRange(mono(0, 0))).toEqual([0, 0]);
      for (const color of ['white', 'pink', 'brown'] as const) {
        const burst = noise(8000, 0.1, color);
        expect(pcmLength(burst)).toBe(800);
        expect(peak(burst)).toBeCloseTo(0.9, 5);
      }
      const loop = makeLoop(mono(0, 1, 2, 3, 4, 5, 6, 7, 8, 9), 3);
      expect(values(loop)).toHaveLength(7);
      expect(loop.channels[0][0]).toBeCloseTo(7, 5); // the start continues the dropped end
      expect(values(loop).slice(3)).toEqual([3, 4, 5, 6]);
    });

    it('adds a decaying reverb tail', () => {
      const impulse = mono(1, ...Array<number>(799).fill(0));
      const wet = reverb(impulse, 0.5, 0.5);
      expect(pcmLength(wet)).toBe(800 + 4000);
      expect(wet.channels[0][0]).toBe(1);
      const energy = (from: number, to: number) => values(wet).slice(from, to).reduce((a, v) => a + v * v, 0);
      expect(energy(800, 1800)).toBeGreaterThan(10 * energy(3800, 4800));
      expect(energy(3800, 4800)).toBeGreaterThan(0);
      expect(reverb(impulse, 0.5, 0)).toBe(impulse);
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
