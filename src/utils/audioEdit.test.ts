import { describe, expect, it } from 'vitest';
import {
  audibleRange,
  autoFire,
  bitcrush,
  computePeaks,
  copyRange,
  cutFilter,
  cutResponse,
  cutClips,
  delay,
  deleteTrackRange,
  distance,
  editTrackRange,
  encodeWav,
  equalize,
  eqResponse,
  fadeCurve,
  fade,
  fxActive,
  gain,
  gate,
  GATE_OFF,
  glue,
  hardClip,
  insertIntoTrack,
  keepRange,
  limit,
  loudness,
  lowPassGate,
  makeLoop,
  moveClips,
  moveRange,
  noise,
  NO_FX,
  normalize,
  overdrive,
  pitchEnvelope,
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
  splitAt,
  sweep,
  toMono,
  tracksLength,
  transient,
  withFxDefaults,
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

    it('sweeps a sine down, fires takes in a row and splits at cuts', () => {
      const sr = 48000;
      const thump = sweep(sr, 1, 200, 50);
      const x = thump.channels[0];
      const crossings = (from: number, to: number) => {
        let c = 0;
        for (let i = from + 1; i < to; i++) if (x[i - 1] < 0 !== x[i] < 0) c++;
        return c;
      };
      expect(x).toHaveLength(sr);
      expect(Math.abs(x[0])).toBe(0); // starts on a zero crossing, so no click
      expect(peak(thump)).toBeCloseTo(0.9, 3);
      // 200 Hz falls to 100 Hz in the first half and on to 50 Hz in the second: half the cycles
      expect(Math.abs(crossings(0, sr / 2) - 144)).toBeLessThanOrEqual(2);
      expect(Math.abs(crossings(sr / 2, sr) - 72)).toBeLessThanOrEqual(2);
      const steady = sweep(8000, 1, 2000, 2000).channels[0];
      expect([steady[1], steady[3]].map((v) => Math.round(v * 10) / 10)).toEqual([0.9, -0.9]);

      // 60 000 rounds per minute at 8 kHz: a shot every 8 samples
      const picks = [0, 0.9, 0];
      const fired = autoFire([mono(1, 0.5), mono(0.25)], 60000, 3, () => picks.shift() ?? 0);
      expect(values(fired)).toEqual([1, 0.5, 0, 0, 0, 0, 0, 0, 0.25, 0, 0, 0, 0, 0, 0, 0, 1, 0.5]);
      expect(values(autoFire([mono(1, 0.5)], 480000, 2))).toEqual([1, 1.5, 0.5]); // tails add up

      const parts = splitAt(mono(0, 0.5, 0.5, 0, 0, 0, 0.25, 0, 0, 0), [4, 8]);
      expect(parts.map((p) => values(p))).toEqual([[0.5, 0.5], [0.25]]); // trimmed, the silent part dropped
      expect(splitAt(mono(0.5, 0.5), []).map((p) => values(p))).toEqual([[0.5, 0.5]]);
    });

    it('downmixes to mono and clips hard at a ceiling', () => {
      const stereo: Pcm = { sampleRate: 8000, channels: [Float32Array.of(1, 0, -0.5), Float32Array.of(0, 1, -0.5)] };
      expect(values(toMono(stereo))).toEqual([0.5, 0.5, -0.5]);
      const one = mono(1, 2);
      expect(toMono(one)).toBe(one);

      // 6.02 dB doubles; a ceiling of -6.02 dB is 0.5
      const clipped = hardClip(mono(0.1, -0.2, 0.9, -0.9), { drive: 6.0206, ceiling: -6.0206 });
      expect(values(clipped).map((v) => Math.round(v * 1000) / 1000)).toEqual([0.2, -0.4, 0.5, -0.5]);
      expect(hardClip(one, NO_FX.clipper)).toBe(one);
      expect(fxActive({ ...NO_FX, clipper: { drive: 0, ceiling: -3 } })).toBe(true);
      const chain = processTrack(mono(0.9, -0.9, 0.1), { ...NO_FX, clipper: { drive: 0, ceiling: -6.0206 } });
      expect(values(chain).map((v) => Math.round(v * 1000) / 1000)).toEqual([0.5, -0.5, 0.1]);
    });

    it('glides the pitch back from a start above or below', () => {
      // A ramp: the step between two output samples is the playback speed
      const ramp = mono(...Array.from({ length: 400 }, (_, i) => 0.5 + i / 10000));
      const speed = (pcm: Pcm, i: number) => (pcm.channels[0][i + 1] - pcm.channels[0][i]) * 10000;
      const down = pitchEnvelope(ramp, { amount: 12, time: 25 }); // 200 samples of glide
      expect(speed(down, 0)).toBeCloseTo(2, 1); // an octave up plays twice as fast
      expect(speed(down, 100)).toBeGreaterThan(1.05);
      expect(speed(down, 100)).toBeLessThan(1.5); // most of the way back at half time
      expect(speed(down, 250)).toBeCloseTo(1, 3);
      expect(pcmLength(down)).toBeLessThan(400);
      expect(pcmLength(down)).toBeGreaterThan(300);
      const up = pitchEnvelope(ramp, { amount: -12, time: 25 });
      expect(speed(up, 0)).toBeCloseTo(0.5, 1);
      expect(pcmLength(up)).toBeGreaterThan(400);
      expect(pcmLength(up)).toBeLessThanOrEqual(600);
      expect(peak(up)).toBeLessThanOrEqual(peak(ramp) + 1e-6); // reads nothing past the end

      // Waits for the sound: the silence in front keeps its length
      const late = pitchEnvelope(mono(...Array<number>(50).fill(0), ...values(ramp)), { amount: 12, time: 25 });
      expect(values(late).slice(0, 50)).toEqual(Array<number>(50).fill(0));
      expect(speed(late, 50)).toBeCloseTo(2, 1);

      expect(pitchEnvelope(ramp, NO_FX.pitchEnv)).toBe(ramp);
      const quiet = mono(0, 0, 0);
      expect(pitchEnvelope(quiet, { amount: 12, time: 25 })).toBe(quiet);
      expect(fxActive({ ...NO_FX, pitchEnv: { amount: -5, time: 80 } })).toBe(true);
      expect(pcmLength(processTrack(ramp, { ...NO_FX, pitchEnv: { amount: 12, time: 25 } }))).toBe(pcmLength(down));
    });

    it('moves a sound away: duller, softer, with more room', () => {
      const sr = 16000;
      const tone = (hz: number): Pcm => ({
        sampleRate: sr,
        channels: [Float32Array.from({ length: sr / 10 }, (_, i) => 0.5 * Math.sin((2 * Math.PI * hz * i) / sr))],
      });
      const rms = (pcm: Pcm, to: number) => Math.hypot(...pcm.channels[0].subarray(0, to)) / Math.sqrt(to);
      const high = tone(7000);
      const far = distance(high, 1);
      expect(far.channels).toHaveLength(1); // mono stays mono
      expect(pcmLength(far)).toBeGreaterThan(pcmLength(high) + sr); // the reverb rings on
      expect(rms(far, sr / 10)).toBeLessThan(rms(high, sr / 10) / 2); // the highs are gone
      const mid = distance(high, 0.5);
      expect(rms(mid, sr / 10)).toBeGreaterThan(rms(far, sr / 10));
      expect(rms(mid, sr / 10)).toBeLessThan(rms(high, sr / 10));
      const low = tone(200);
      expect(rms(distance(low, 1), sr / 10)).toBeGreaterThan(rms(low, sr / 10) / 2); // the lows carry
      expect(distance(high, 0)).toBe(high);
      const stereo = { ...high, channels: [high.channels[0], high.channels[0]] };
      expect(distance(stereo, 1).channels).toHaveLength(2);
    });

    it('fills a saved effect chain up with the defaults', () => {
      expect(withFxDefaults({})).toEqual(NO_FX);
      // Saved before the clipper existed, and with a reverb that had fewer settings
      const old = { volume: -3, lowSlope: 48, reverb: { mix: 0.5, decay: 2 } } as unknown as Partial<typeof NO_FX>;
      const loaded = withFxDefaults(old);
      expect(loaded.volume).toBe(-3);
      expect(loaded.lowSlope).toBe(48);
      expect(loaded.reverb).toEqual({ ...NO_FX.reverb, mix: 0.5, decay: 2 });
      expect(loaded.clipper).toEqual(NO_FX.clipper);
      expect(loaded.clipper).not.toBe(NO_FX.clipper); // a copy: editing a loaded chain leaves the defaults alone
      expect(pcmLength(processTrack(mono(0.5, 0.25), loaded))).toBeGreaterThan(2);
    });

    it('adds a decaying reverb tail', () => {
      const impulse = mono(1, ...Array<number>(799).fill(0));
      const settings = { ...NO_FX.reverb, mix: 0.5, decay: 0.5, width: 0 };
      const wet = reverb(impulse, settings);
      expect(pcmLength(wet)).toBe(800 + 4000);
      expect(wet.channels).toHaveLength(1);
      expect(wet.channels[0][0]).toBe(1);
      const energy = (from: number, to: number) => values(wet).slice(from, to).reduce((a, v) => a + v * v, 0);
      expect(energy(800, 1800)).toBeGreaterThan(10 * energy(3800, 4800));
      expect(energy(3800, 4800)).toBeGreaterThan(0);
      expect(reverb(impulse, { ...settings, mix: 0 })).toBe(impulse);
    });

    it('places early reflections by pre-delay and room size, and widens mono to stereo', () => {
      const impulse = mono(1, ...Array<number>(799).fill(0));
      const early = { ...NO_FX.reverb, mix: 1, early: 1, tail: 0, width: 0 };
      const at = (p: Pcm) => values(p).findIndex((v, i) => i > 0 && v !== 0);
      expect(at(reverb(impulse, early))).toBe(40); // the 5 ms reflection
      expect(reverb(impulse, early).channels[0][40]).toBeCloseTo(1 / (1 + 5 / 25), 5);
      expect(at(reverb(impulse, { ...early, preDelay: 10 }))).toBe(120);
      expect(at(reverb(impulse, { ...early, size: 2 }))).toBe(80);
      expect(pcmLength(reverb(impulse, { ...early, preDelay: 10 }))).toBe(800 + 80 + 8000);
      const wide = reverb(impulse, { ...NO_FX.reverb, mix: 1, width: 1 });
      expect(wide.channels).toHaveLength(2);
      expect(values(wide, 0)).not.toEqual(values(wide, 1));
      expect(wide.channels[1][0]).toBe(1);
      const stereo = { ...impulse, channels: [impulse.channels[0], impulse.channels[0]] };
      const narrow = reverb(stereo, { ...NO_FX.reverb, mix: 1, width: 0 });
      expect(values(narrow, 0)).toEqual(values(narrow, 1));
    });

    describe('tones', () => {
      const sr = 48000;
      const tone = (hz: number, amp: (i: number) => number, length = sr / 2): Pcm => ({
        sampleRate: sr,
        channels: [Float32Array.from({ length }, (_, i) => amp(i) * Math.sin((2 * Math.PI * hz * i) / sr))],
      });
      const amp = (p: Pcm, from: number, to: number) => values(p).slice(from, to).reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      const db = (v: number) => 20 * Math.log10(v);

      it('cuts by slope and resonance, as its curve says', () => {
        expect(cutResponse({ lowCut: 0, highCut: 1000 }, 1000)).toBeCloseTo(-3.01, 1);
        expect(cutResponse({ lowCut: 1000, highCut: 0, lowRes: 12 }, 1000)).toBeCloseTo(8.99, 1);
        expect(cutResponse({ lowCut: 0, highCut: 0 }, 1000)).toBe(0);
        const sine = tone(2000, () => 0.5);
        for (const highSlope of [12, 24, 48] as const) {
          const o = { lowCut: 0, highCut: 1000, highSlope };
          const out = cutFilter(sine, 0, sr / 2, o);
          expect(db(amp(out, 12000, 20000) / 0.5)).toBeCloseTo(cutResponse(o, 2000), 1);
          expect(cutResponse(o, 2000)).toBeLessThan(-highSlope + 1); // one octave above the cutoff
        }
      });

      it('gates quiet parts, opens ahead of a hit and holds', () => {
        const x = mono(...Array.from({ length: n }, (_, i) => (i >= 2000 && i < 4000 ? 0.5 : 0.01)));
        const settings = { threshold: -20, attack: 2, hold: 10, release: 20, range: 60 };
        const out = gate(x, settings).channels[0];
        expect(out[1000]).toBeCloseTo(0.01 * 0.001, 6);
        expect(out[2000]).toBeCloseTo(0.5, 5);
        expect(out[3999]).toBeCloseTo(0.5, 5);
        expect(out[4050]).toBeCloseTo(0.01, 5); // still held open
        expect(out[7000]).toBeLessThan(0.0001);
        expect(gate(mono(0.5, 0.5, 0.5), settings).channels[0][0]).toBe(0.5); // no room to fade in: starts open
        expect(gate(x, { ...settings, threshold: GATE_OFF })).toBe(x);
      });

      it('low pass gate keeps the hit and darkens and quiets the tail', () => {
        const x = tone(4000, (i) => (i < 4800 ? 0.8 : 0.08));
        const settings = { amount: 1, decay: 20, floor: 100, resonance: 0 };
        const out = lowPassGate(x, settings);
        expect(amp(out, 2400, 4800)).toBeGreaterThan(0.7);
        expect(amp(out, 20000, 24000)).toBeLessThan(0.08 / 100);
        expect(amp(lowPassGate(x, { ...settings, amount: 0.3 }), 20000, 24000)).toBeGreaterThan(0.08 / 10);
        expect(lowPassGate(x, { ...settings, amount: 0 })).toBe(x);
      });

      it('overdrives into a squarer wave at the dry peak, dynamics bring the quiet parts back', () => {
        const settings = { mix: 1, drive: 30, freq: 1000, width: 4, tone: 0, dynamics: 0 };
        const od = overdrive(tone(1000, () => 0.2), settings);
        const rms = Math.sqrt(values(od).reduce((a, v) => a + v * v, 0) / pcmLength(od));
        expect(amp(od, 0, sr / 2)).toBeCloseTo(0.2, 5);
        expect(rms / 0.2).toBeGreaterThan(0.85); // a sine has 0.707
        const steps = tone(1000, (i) => (i < 12000 ? 0.5 : 0.05));
        const tail = (dynamics: number) => {
          const out = overdrive(steps, { ...settings, dynamics });
          return amp(out, 18000, 24000) / amp(out, 6000, 12000);
        };
        expect(tail(0)).toBeGreaterThan(0.5);
        expect(tail(1)).toBeLessThan(0.2);
        expect(overdrive(steps, { ...settings, mix: 0 })).toBe(steps);
      });

      it('echoes with feedback, and flanges when the delay is swept', () => {
        const impulse = mono(1, ...Array<number>(799).fill(0));
        const settings = { mix: 1, time: 10, feedback: 0.5, depth: 0, rate: 0, damp: 0 };
        const echo = delay(impulse, settings);
        expect([0, 80, 160, 240, 81].map((i) => echo.channels[0][i])).toEqual([1, 1, 0.5, 0.25, 0]);
        expect(pcmLength(echo)).toBe(800 + 798); // ten halvings to -60 dB
        expect(Math.abs(delay(impulse, { ...settings, damp: 0.5 }).channels[0][160])).toBeLessThan(0.5);
        expect(delay(impulse, { ...settings, mix: 0 })).toBe(impulse);
        // 1 kHz against itself 1 to 2 ms late: in phase, then cancelled, as the delay sweeps
        const flanged = delay(tone(1000, () => 0.5, sr), { mix: 1, time: 1, feedback: 0, depth: 1, rate: 1, damp: 0 });
        const windows = Array.from({ length: 40 }, (_, w) => amp(flanged, 1000 + w * 1000, 2000 + w * 1000));
        expect(Math.max(...windows)).toBeGreaterThan(0.95);
        expect(Math.min(...windows)).toBeLessThan(0.2);
      });
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
