/**
 * Immutable PCM edits for the audio editor. Ranges are sample indices [start, end).
 * Every edit returns a new Pcm and leaves its input untouched (undo history keeps old states).
 */
export interface Pcm {
  sampleRate: number;
  channels: Float32Array<ArrayBuffer>[];
}

export const pcmLength = (pcm: Pcm) => pcm.channels[0]?.length ?? 0;
export const pcmDuration = (pcm: Pcm) => pcmLength(pcm) / pcm.sampleRate;

export const fromAudioBuffer = (buffer: AudioBuffer): Pcm => ({
  sampleRate: buffer.sampleRate,
  channels: Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c).slice()),
});

const clamp = (pcm: Pcm, start: number, end: number): [number, number] => {
  const len = pcmLength(pcm);
  const s = Math.max(0, Math.min(len, Math.round(Math.min(start, end))));
  const e = Math.max(s, Math.min(len, Math.round(Math.max(start, end))));
  return [s, e];
};

/** Upmixes by repeating the last channel (mono → stereo duplicates it). */
const withChannels = (pcm: Pcm, count: number): Pcm =>
  pcm.channels.length >= count
    ? pcm
    : { ...pcm, channels: Array.from({ length: count }, (_, c) => pcm.channels[Math.min(c, pcm.channels.length - 1)]) };

export const keepRange = (pcm: Pcm, start: number, end: number): Pcm => {
  const [s, e] = clamp(pcm, start, end);
  return { ...pcm, channels: pcm.channels.map((ch) => ch.slice(s, e)) };
};

/** Applies fn(sample, indexInRange, rangeLength) to every sample in the range. */
const mapRange = (pcm: Pcm, start: number, end: number, fn: (v: number, i: number, n: number) => number): Pcm => {
  const [s, e] = clamp(pcm, start, end);
  const n = e - s;
  return {
    ...pcm,
    channels: pcm.channels.map((ch) => {
      const out = ch.slice();
      for (let i = 0; i < n; i++) out[s + i] = fn(ch[s + i], i, n);
      return out;
    }),
  };
};

export const silence = (pcm: Pcm, start: number, end: number) => mapRange(pcm, start, end, () => 0);

export const gain = (pcm: Pcm, start: number, end: number, factor: number) =>
  mapRange(pcm, start, end, (v) => Math.max(-1, Math.min(1, v * factor)));

export const fade = (pcm: Pcm, start: number, end: number, direction: 'in' | 'out') =>
  mapRange(pcm, start, end, (v, i, n) => {
    const t = n > 1 ? i / (n - 1) : 1;
    return v * (direction === 'in' ? t : 1 - t);
  });

export const peakLevel = (pcm: Pcm, start: number, end: number) => {
  const [s, e] = clamp(pcm, start, end);
  let peak = 0;
  for (const ch of pcm.channels) for (let i = s; i < e; i++) peak = Math.max(peak, Math.abs(ch[i]));
  return peak;
};

/** Scales the range so its loudest sample reaches target (0..1). Silent ranges are left alone. */
export const normalize = (pcm: Pcm, start: number, end: number, target = 0.98) => {
  const peak = peakLevel(pcm, start, end);
  return peak > 0 ? gain(pcm, start, end, target / peak) : pcm;
};

export const reverse = (pcm: Pcm, start: number, end: number): Pcm => {
  const [s, e] = clamp(pcm, start, end);
  return {
    ...pcm,
    channels: pcm.channels.map((ch) => {
      const out = ch.slice();
      out.subarray(s, e).reverse();
      return out;
    }),
  };
};

export interface EqGains {
  low: number;
  mid: number;
  high: number;
}
/** Band frequencies in Hz: low shelf, peaking mid, high shelf */
export const EQ_FREQS: EqGains = { low: 200, mid: 1000, high: 4000 };

/** RBJ cookbook biquad for a band and gain in dB, normalized to [b0, b1, b2, a1, a2]. */
const biquad = (band: keyof EqGains, db: number, sampleRate: number) => {
  const A = 10 ** (db / 40);
  const w = (2 * Math.PI * Math.min(EQ_FREQS[band], sampleRate * 0.45)) / sampleRate;
  const cos = Math.cos(w);
  const sin = Math.sin(w);
  if (band === 'mid') {
    const alpha = sin / 1.8; // Q 0.9
    const a0 = 1 + alpha / A;
    return [(1 + alpha * A) / a0, (-2 * cos) / a0, (1 - alpha * A) / a0, (-2 * cos) / a0, (1 - alpha / A) / a0];
  }
  // Shelf slope 1. The high shelf is the low shelf mirrored around Nyquist: cos negated, odd coefficients flipped.
  const c = band === 'low' ? cos : -cos;
  const sign = band === 'low' ? 1 : -1;
  const k = Math.sqrt(2 * A) * sin;
  const a0 = A + 1 + (A - 1) * c + k;
  return [
    (A * (A + 1 - (A - 1) * c + k)) / a0,
    (sign * 2 * A * (A - 1 - (A + 1) * c)) / a0,
    (A * (A + 1 - (A - 1) * c - k)) / a0,
    (sign * -2 * (A - 1 + (A + 1) * c)) / a0,
    (A + 1 + (A - 1) * c - k) / a0,
  ];
};

/** Crossfades the first and last 5 ms of out[s, e) from dry, so an edited range joins the untouched audio without clicks. */
const blendEdges = (dry: Float32Array, out: Float32Array, s: number, e: number, sampleRate: number) => {
  const ramp = Math.min(Math.floor((e - s) / 2), Math.round(sampleRate * 0.005));
  for (let i = 0; i < ramp; i++) {
    const a = s + i;
    const b = e - 1 - i;
    out[a] = dry[a] + (out[a] - dry[a]) * (i / ramp);
    out[b] = dry[b] + (out[b] - dry[b]) * (i / ramp);
  }
};

/**
 * WSOLA time-stretch: output is about factor times longer, pitch unchanged. Frame offsets are picked on the
 * guide signal (a mono mix) and applied to every channel so stereo stays aligned.
 */
const stretch = (channels: Float32Array[], guide: Float32Array, factor: number, sampleRate: number) => {
  const frame = 2 * Math.round(sampleRate * 0.02); // 40 ms, 50% overlap
  const hop = frame / 2;
  const tolerance = Math.round(sampleRate * 0.008);
  const n = guide.length;
  const length = Math.ceil(n * factor);
  const window = Float32Array.from({ length: frame }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / frame));
  const out = channels.map(() => new Float32Array(length + frame));
  const weight = new Float32Array(length + frame);
  const at = (x: Float32Array, i: number) => (i >= 0 && i < n ? x[i] : 0);
  // How well a frame read at p continues the previous one (sparse dot product over the overlap)
  const similarity = (p: number, target: number) => {
    let sum = 0;
    for (let i = 0; i < hop; i += 4) sum += at(guide, target + i) * at(guide, p + i);
    return sum;
  };
  let prev = 0;
  for (let k = 0; k * hop < length; k++) {
    const nominal = Math.round((k * hop) / factor);
    let best = nominal;
    if (k > 0) {
      const target = prev + hop;
      let bestScore = similarity(nominal, target);
      for (let d = -tolerance; d <= tolerance; d += 2) {
        const score = similarity(nominal + d, target);
        if (score > bestScore) {
          bestScore = score;
          best = nominal + d;
        }
      }
    }
    prev = best;
    const o = k * hop;
    for (let i = 0; i < frame; i++) weight[o + i] += window[i];
    channels.forEach((x, c) => {
      for (let i = 0; i < frame; i++) out[c][o + i] += window[i] * at(x, best + i);
    });
  }
  return out.map((ch) => {
    for (let i = 0; i < length; i++) ch[i] = weight[i] > 1e-3 ? ch[i] / weight[i] : 0;
    return ch.subarray(0, length);
  });
};

/** Shifts the range's pitch by semitones without changing its length: time-stretch, then resample back. */
export const pitchShift = (pcm: Pcm, start: number, end: number, semitones: number): Pcm => {
  const [s, e] = clamp(pcm, start, end);
  const n = e - s;
  const ratio = 2 ** (semitones / 12);
  if (n < 2 || ratio === 1) return pcm;
  const parts = pcm.channels.map((ch) => ch.subarray(s, e));
  const guide = new Float32Array(n);
  for (const part of parts) for (let i = 0; i < n; i++) guide[i] += part[i] / parts.length;
  const stretched = stretch(parts, guide, ratio, pcm.sampleRate);
  return {
    ...pcm,
    channels: pcm.channels.map((ch, c) => {
      const out = ch.slice();
      const x = stretched[c];
      for (let j = 0; j < n; j++) {
        const t = j * ratio;
        const i = Math.floor(t);
        out[s + j] = (x[i] ?? 0) + ((x[i + 1] ?? 0) - (x[i] ?? 0)) * (t - i);
      }
      blendEdges(ch, out, s, e, pcm.sampleRate);
      return out;
    }),
  };
};

/** Runs fn on a copy of each channel's range, then crossfades the range edges back into the dry audio. */
const processRange = (pcm: Pcm, start: number, end: number, fn: (wet: Float32Array, c: number) => void): Pcm => {
  const [s, e] = clamp(pcm, start, end);
  return {
    ...pcm,
    channels: pcm.channels.map((ch, c) => {
      const out = ch.slice();
      fn(out.subarray(s, e), c);
      blendEdges(ch, out, s, e, pcm.sampleRate);
      return out;
    }),
  };
};

/** Runs a normalized biquad [b0, b1, b2, a1, a2] over x in place. */
const runBiquad = (x: Float32Array, [b0, b1, b2, a1, a2]: number[]) => {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    const y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = v;
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
};

/** 3-band EQ on the range, with short crossfades at its edges so it joins the untouched audio without clicks. */
export const equalize = (pcm: Pcm, start: number, end: number, gains: EqGains): Pcm => {
  const bands = (Object.keys(EQ_FREQS) as (keyof EqGains)[]).filter((b) => gains[b] !== 0);
  const filters = bands.map((b) => biquad(b, gains[b], pcm.sampleRate));
  return processRange(pcm, start, end, (wet) => filters.forEach((f) => runBiquad(wet, f)));
};

/** RBJ high- or low-pass biquad. */
const passFilter = (type: 'high' | 'low', freq: number, sampleRate: number, q = Math.SQRT1_2) => {
  const w = (2 * Math.PI * Math.min(freq, sampleRate * 0.45)) / sampleRate;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  const a0 = 1 + alpha;
  const b0 = (type === 'low' ? 1 - cos : 1 + cos) / 2;
  const b1 = type === 'low' ? 1 - cos : -(1 + cos);
  return [b0 / a0, b1 / a0, b0 / a0, (-2 * cos) / a0, (1 - alpha) / a0];
};

export interface CutSettings {
  /** high-pass cutoff in Hz, 0 = off */
  lowCut: number;
  /** low-pass cutoff in Hz, 0 = off */
  highCut: number;
}

/** Low cut and high cut at 24 dB/octave (two cascaded Butterworth biquads each). */
export const cutFilter = (pcm: Pcm, start: number, end: number, { lowCut, highCut }: CutSettings): Pcm => {
  const filters = [
    ...(lowCut > 0 ? [passFilter('high', lowCut, pcm.sampleRate)] : []),
    ...(highCut > 0 ? [passFilter('low', highCut, pcm.sampleRate)] : []),
  ];
  if (!filters.length) return pcm;
  return processRange(pcm, start, end, (wet) =>
    filters.forEach((f) => {
      runBiquad(wet, f);
      runBiquad(wet, f);
    }),
  );
};

/** Soft-clips with tanh after driveDb of gain: rounds off peaks and thickens the sound. */
export const saturate = (pcm: Pcm, start: number, end: number, driveDb: number): Pcm => {
  if (driveDb <= 0) return pcm;
  const g = 10 ** (driveDb / 20);
  return processRange(pcm, start, end, (wet) => wet.forEach((v, i) => (wet[i] = Math.tanh(g * v))));
};

/** Lo-fi: quantizes to `bits` and holds each sample for sampleRate / rate samples. */
export const bitcrush = (pcm: Pcm, start: number, end: number, bits: number, rate: number): Pcm => {
  const hold = Math.max(1, Math.round(pcm.sampleRate / rate));
  if (bits >= 16 && hold === 1) return pcm;
  const step = 1 / 2 ** (bits - 1);
  return processRange(pcm, start, end, (wet) => {
    let held = 0;
    for (let i = 0; i < wet.length; i++) {
      if (i % hold === 0) held = Math.round(wet[i] / step) * step;
      wet[i] = held;
    }
  });
};

/** Peak envelope of all channels (max abs), one-pole attack and release in ms. */
const envelope = (channels: Float32Array[], sampleRate: number, attackMs: number, releaseMs: number) => {
  const coef = (ms: number) => Math.exp(-1 / Math.max(1, (ms / 1000) * sampleRate));
  const attack = coef(attackMs);
  const release = coef(releaseMs);
  const out = new Float32Array(channels[0]?.length ?? 0);
  let env = 0;
  for (let i = 0; i < out.length; i++) {
    let peak = 0;
    for (const ch of channels) peak = Math.max(peak, Math.abs(ch[i]));
    env = peak + (peak > env ? attack : release) * (env - peak);
    out[i] = env;
  }
  return out;
};

/** Transient shaper: boosts or cuts the attack and the sustain (dB) independently of level. */
export const transient = (pcm: Pcm, start: number, end: number, attackDb: number, sustainDb: number): Pcm => {
  if (!attackDb && !sustainDb) return pcm;
  const [s, e] = clamp(pcm, start, end);
  const parts = pcm.channels.map((ch) => ch.subarray(s, e));
  const fast = envelope(parts, pcm.sampleRate, 0.5, 30);
  const slow = envelope(parts, pcm.sampleRate, 20, 30);
  const gains = fast.map((f, i) => {
    const a = Math.max(0, Math.min(1, (20 * Math.log10((f + 1e-9) / (slow[i] + 1e-9))) / 12));
    return 10 ** ((attackDb * a + sustainDb * (1 - a)) / 20);
  });
  return processRange(pcm, s, e, (wet) => wet.forEach((v, i) => (wet[i] = v * gains[i])));
};

/** BS.1770 K-weighting filters (shelf, then high-pass) for any sample rate, as derived in libebur128. */
const kWeighting = (sampleRate: number) => {
  let K = Math.tan((Math.PI * 1681.974450955533) / sampleRate);
  let Q = 0.7071752369554196;
  const Vh = 10 ** (3.999843853973347 / 20);
  const Vb = Vh ** 0.4996667741545416;
  let a0 = 1 + K / Q + K * K;
  const shelf = [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0];
  K = Math.tan((Math.PI * 38.13547087602444) / sampleRate);
  Q = 0.5003270373238773;
  a0 = 1 + K / Q + K * K;
  return [shelf, [1, -2, 1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0]];
};

/** Integrated loudness in LUFS (ITU-R BS.1770: K-weighting, 400 ms blocks, absolute and relative gates). -Infinity for silence. */
export const loudness = (pcm: Pcm) => {
  const n = pcmLength(pcm);
  const sr = pcm.sampleRate;
  const filters = kWeighting(sr);
  const squares = new Float64Array(n);
  for (const ch of pcm.channels) {
    const x = ch.slice();
    filters.forEach((f) => runBiquad(x, f));
    for (let i = 0; i < n; i++) squares[i] += x[i] * x[i];
  }
  const sum = new Float64Array(n + 1); // prefix sums of the channel-summed squares
  for (let i = 0; i < n; i++) sum[i + 1] = sum[i] + squares[i];
  const block = Math.min(n, Math.round(sr * 0.4));
  const hop = Math.max(1, Math.round(sr * 0.1));
  const blocks: number[] = [];
  for (let s = 0; block > 0 && s + block <= n; s += hop) blocks.push((sum[s + block] - sum[s]) / block);
  const lufs = (z: number) => -0.691 + 10 * Math.log10(z);
  const mean = (zs: number[]) => zs.reduce((a, b) => a + b, 0) / zs.length;
  const loud = blocks.filter((z) => lufs(z) > -70);
  if (!loud.length) return -Infinity;
  const gate = lufs(mean(loud)) - 10;
  return lufs(mean(loud.filter((z) => lufs(z) > gate)));
};

/** Brickwall limiter: applies gainDb, then keeps peaks under ceilingDb with 5 ms lookahead and 50 ms release. */
export const limit = (pcm: Pcm, ceilingDb: number, gainDb = 0): Pcm => {
  const n = pcmLength(pcm);
  const ceiling = 10 ** (ceilingDb / 20);
  const pre = 10 ** (gainDb / 20);
  const look = Math.max(1, Math.round(pcm.sampleRate * 0.005));
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let peak = 0;
    for (const ch of pcm.channels) peak = Math.max(peak, Math.abs(ch[i]) * pre);
    need[i] = peak > ceiling ? ceiling / peak : 1;
  }
  // Minimum over [i, i + look), then averaged over the last look samples: every averaged term is ≤ need[i], so the ramp lands in time
  const ahead = new Float32Array(n);
  const queue: number[] = [];
  let head = 0;
  for (let j = n - 1; j >= 0; j--) {
    while (queue.length > head && need[queue[queue.length - 1]] >= need[j]) queue.pop();
    queue.push(j);
    while (queue[head] >= j + look) head++;
    ahead[j] = need[queue[head]];
  }
  const release = Math.exp(-1 / (pcm.sampleRate * 0.05));
  const gains = new Float32Array(n);
  let sum = 0;
  let env = 1;
  for (let i = 0; i < n; i++) {
    sum += ahead[i] - (i >= look ? ahead[i - look] : 0);
    const smooth = sum / Math.min(i + 1, look);
    env = smooth < env ? smooth : smooth + release * (env - smooth);
    gains[i] = env * pre;
  }
  return { ...pcm, channels: pcm.channels.map((ch) => ch.map((v, i) => v * gains[i])) };
};

/** [first, last + 1) sample louder than thresholdDb on any channel; [0, 0] when everything is quieter. */
export const audibleRange = (pcm: Pcm, thresholdDb = -60): [number, number] => {
  const t = 10 ** (thresholdDb / 20);
  const loud = (i: number) => pcm.channels.some((ch) => Math.abs(ch[i]) > t);
  const n = pcmLength(pcm);
  let s = 0;
  while (s < n && !loud(s)) s++;
  if (s === n) return [0, 0];
  let e = n;
  while (!loud(e - 1)) e--;
  return [s, e];
};

export type NoiseColor = 'white' | 'pink' | 'brown';

/** Mono noise peaking at 0.9. Pink: Paul Kellet's filter; brown: leaky integrated white. */
export const noise = (sampleRate: number, seconds: number, color: NoiseColor, random = Math.random): Pcm => {
  const x = new Float32Array(Math.max(1, Math.round(seconds * sampleRate)));
  const b = [0, 0, 0, 0, 0, 0, 0];
  let brown = 0;
  for (let i = 0; i < x.length; i++) {
    const w = random() * 2 - 1;
    if (color === 'white') x[i] = w;
    else if (color === 'brown') x[i] = brown = (brown + 0.02 * w) / 1.02;
    else {
      b[0] = 0.99886 * b[0] + w * 0.0555179;
      b[1] = 0.99332 * b[1] + w * 0.0750759;
      b[2] = 0.969 * b[2] + w * 0.153852;
      b[3] = 0.8665 * b[3] + w * 0.3104856;
      b[4] = 0.55 * b[4] + w * 0.5329522;
      b[5] = -0.7616 * b[5] - w * 0.016898;
      x[i] = b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + w * 0.5362;
      b[6] = w * 0.115926;
    }
  }
  return normalize({ sampleRate, channels: [x] }, 0, x.length, 0.9);
};

/** Seamless loop: the last xf samples are crossfaded (equal power) into the start and dropped, so the end runs into the start. */
export const makeLoop = (pcm: Pcm, xf: number): Pcm => {
  const n = pcmLength(pcm);
  const x = Math.max(0, Math.min(Math.floor(n / 2), Math.round(xf)));
  if (!x) return pcm;
  return {
    ...pcm,
    channels: pcm.channels.map((ch) => {
      const out = ch.slice(0, n - x);
      for (let i = 0; i < x; i++) {
        const t = ((i / x) * Math.PI) / 2;
        out[i] = ch[i] * Math.sin(t) + ch[n - x + i] * Math.cos(t);
      }
      return out;
    }),
  };
};

const COMBS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const ALLPASSES = [556, 441, 341, 225];

/** Freeverb-style reverb. The result is decay seconds longer; amount sets the tail's peak relative to the dry peak. */
export const reverb = (pcm: Pcm, decay: number, amount: number): Pcm => {
  const n = pcmLength(pcm);
  const sr = pcm.sampleRate;
  if (amount <= 0 || decay <= 0 || !n) return pcm;
  const length = n + Math.round(decay * sr);
  const scale = sr / 44100;
  const input = new Float32Array(length);
  for (const ch of pcm.channels) for (let i = 0; i < n; i++) input[i] += ch[i] / pcm.channels.length;
  const wets = pcm.channels.map((_, c) => {
    const spread = c % 2 ? 23 : 0;
    const out = new Float32Array(length);
    for (const d of COMBS) {
      const size = Math.max(1, Math.round((d + spread) * scale));
      const g = Math.min(0.98, 10 ** ((-3 * size) / (decay * sr)));
      const buf = new Float32Array(size);
      let filt = 0;
      for (let i = 0, k = 0; i < length; i++, k = (k + 1) % size) {
        const y = buf[k];
        filt = y * 0.75 + filt * 0.25; // damping
        buf[k] = input[i] + filt * g;
        out[i] += y;
      }
    }
    for (const d of ALLPASSES) {
      const size = Math.max(1, Math.round((d + spread) * scale));
      const buf = new Float32Array(size);
      for (let i = 0, k = 0; i < length; i++, k = (k + 1) % size) {
        const b = buf[k];
        buf[k] = out[i] + b * 0.5;
        out[i] = b - out[i];
      }
    }
    return out;
  });
  const dryPeak = peakLevel(pcm, 0, n);
  const wetPeak = Math.max(...wets.map((w) => w.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
  const k = wetPeak > 0 ? (amount * dryPeak) / wetPeak : 0;
  return {
    ...pcm,
    channels: wets.map((wet, c) => {
      for (let i = 0; i < length; i++) wet[i] = wet[i] * k + (i < n ? pcm.channels[c][i] : 0);
      return wet;
    }),
  };
};

// ---- tracks ----
// A track holds clips; a clip places a piece of audio at sample `at` of the timeline.
// Clips may overlap and gaps between them are silent. All clips share the project's sample rate.

/** A clip fade: length in samples, curve -1..1 (0 linear, above 0 rises early, below 0 rises late). */
export interface Fade {
  length: number;
  curve: number;
}
export interface Clip {
  at: number;
  pcm: Pcm;
  fadeIn?: Fade;
  fadeOut?: Fade;
  /** clip gain, dB */
  gain?: number;
  /** The untrimmed audio pcm is a window of, starting `offset` samples in; lets a trimmed edge be dragged back out */
  src?: Pcm;
  offset?: number;
}

/** Rising fade gain at t in [0, 1]; fade-outs use it mirrored. */
export const fadeCurve = (t: number, curve: number) => {
  const k = 1 + 3 * Math.abs(curve);
  return curve >= 0 ? 1 - (1 - t) ** k : t ** k;
};

/** Fade gain at sample i of a clip n samples long. */
const fadeGain = (n: number, i: number, fadeIn: Fade | undefined, fadeOut: Fade | undefined) => {
  let g = 1;
  if (fadeIn && i < fadeIn.length) g *= fadeCurve(i / fadeIn.length, fadeIn.curve);
  if (fadeOut && i >= n - fadeOut.length) g *= fadeCurve((n - 1 - i) / fadeOut.length, fadeOut.curve);
  return g;
};

/** Clip-local samples [from, to) as a clip. A fade that survives whole stays editable; one that is cut gets baked into the audio. */
const sliceClip = (clip: Clip, from: number, to: number): Clip => {
  const n = pcmLength(clip.pcm);
  const keepIn = from === 0 && (clip.fadeIn?.length ?? 0) <= to;
  const keepOut = to === n && n - (clip.fadeOut?.length ?? 0) >= from;
  const bakeIn = keepIn ? undefined : clip.fadeIn;
  const bakeOut = keepOut ? undefined : clip.fadeOut;
  const baked = Boolean(bakeIn || bakeOut);
  // Unbaked parts stay windows into the source, so their edges can be dragged back out
  const channels = clip.pcm.channels.map((ch) => {
    if (!baked) return ch.subarray(from, to);
    const out = ch.slice(from, to);
    for (let i = 0; i < out.length; i++) out[i] *= fadeGain(n, from + i, bakeIn, bakeOut);
    return out;
  });
  return {
    at: clip.at + from,
    pcm: { ...clip.pcm, channels },
    ...(keepIn && clip.fadeIn && { fadeIn: clip.fadeIn }),
    ...(keepOut && clip.fadeOut && { fadeOut: clip.fadeOut }),
    ...(clip.gain && { gain: clip.gain }),
    ...(!baked && { src: clip.src ?? clip.pcm, offset: (clip.offset ?? 0) + from }),
  };
};

/** Moves one edge of a clip to timeline sample `to`: inward trims, outward brings back trimmed audio up to the source's end. */
export const resizeClip = (clip: Clip, edge: 'start' | 'end', to: number): Clip => {
  const src = clip.src ?? clip.pcm;
  const zero = clip.at - (clip.offset ?? 0); // where the source's first sample sits
  let a = clip.at;
  let b = clipEnd(clip);
  if (edge === 'start') a = Math.max(0, zero, Math.min(b - 1, Math.round(to)));
  else b = Math.min(zero + pcmLength(src), Math.max(a + 1, Math.round(to)));
  const len = b - a;
  const fadeIn = clip.fadeIn && { ...clip.fadeIn, length: Math.min(len, clip.fadeIn.length) };
  const fadeOut = clip.fadeOut && { ...clip.fadeOut, length: Math.min(len - (fadeIn?.length ?? 0), clip.fadeOut.length) };
  return {
    ...clip,
    at: a,
    pcm: { ...src, channels: src.channels.map((ch) => ch.subarray(a - zero, b - zero)) },
    src,
    offset: a - zero,
    ...(fadeIn && { fadeIn }),
    ...(fadeOut && { fadeOut }),
  };
};

export interface Track {
  id: number;
  clips: Clip[];
  /** live effect chain */
  fx?: TrackFx;
}

export const clipEnd = (clip: Clip) => clip.at + pcmLength(clip.pcm);
export const trackStart = (track: Track) => (track.clips.length ? Math.min(...track.clips.map((c) => c.at)) : 0);
export const trackEnd = (track: Track) => Math.max(0, ...track.clips.map(clipEnd));
export const tracksLength = (tracks: Track[]) => Math.max(0, ...tracks.map(trackEnd));
const overlaps = (clip: Clip, start: number, end: number) => clip.at < end && clipEnd(clip) > start;

/** Sums the clips into one buffer covering timeline samples [start, end), upmixed to the widest clip. */
export const renderClips = (clips: Clip[], sampleRate: number, start: number, end: number): Pcm => {
  const count = Math.max(1, ...clips.map((c) => c.pcm.channels.length));
  const channels = Array.from({ length: count }, () => new Float32Array(Math.max(0, end - start)));
  for (const clip of clips) {
    const from = Math.max(start, clip.at);
    const to = Math.min(end, clipEnd(clip));
    if (to <= from) continue;
    const src = withChannels(clip.pcm, count).channels;
    const n = pcmLength(clip.pcm);
    const faded = clip.fadeIn || clip.fadeOut;
    const g = clip.gain ? 10 ** (clip.gain / 20) : 1;
    channels.forEach((out, c) => {
      for (let i = from; i < to; i++) {
        const k = i - clip.at;
        out[i - start] += (faded ? src[c][k] * fadeGain(n, k, clip.fadeIn, clip.fadeOut) : src[c][k]) * g;
      }
    });
  }
  return { sampleRate, channels };
};

/** Removes [start, end) from the clips, splitting the ones that straddle it. Nothing moves. */
export const cutClips = (clips: Clip[], start: number, end: number): Clip[] =>
  clips.flatMap((clip) => {
    if (!overlaps(clip, start, end)) return [clip];
    const parts: Clip[] = [];
    if (clip.at < start) parts.push(sliceClip(clip, 0, start - clip.at));
    if (clipEnd(clip) > end) parts.push(sliceClip(clip, end - clip.at, pcmLength(clip.pcm)));
    return parts;
  });

/** Replaces [start, end) of the track with fn applied to its mixed content, as one clip. Empty ranges are left alone. */
export const editTrackRange = (track: Track, sampleRate: number, start: number, end: number, fn: (pcm: Pcm) => Pcm): Track => {
  const hit = track.clips.filter((c) => overlaps(c, start, end));
  if (!hit.length) return track;
  return { ...track, clips: [...cutClips(track.clips, start, end), { at: start, pcm: fn(renderClips(hit, sampleRate, start, end)) }] };
};

/** Cuts [start, end) out of the track and closes the gap. */
export const deleteTrackRange = (track: Track, start: number, end: number): Track => ({
  ...track,
  clips: cutClips(track.clips, start, end).map((c) => (c.at >= end ? { ...c, at: c.at - (end - start) } : c)),
});

/** Inserts pcm at sample `at`, pushing everything after it later. */
export const insertIntoTrack = (track: Track, at: number, pcm: Pcm): Track => {
  const n = pcmLength(pcm);
  return { ...track, clips: [...cutClips(track.clips, at, at).map((c) => (c.at >= at ? { ...c, at: c.at + n } : c)), { at, pcm }] };
};

/** The parts of the clips inside [start, end), shifted so `start` lands at 0. */
export const copyRange = (clips: Clip[], start: number, end: number): Clip[] =>
  clips
    .filter((c) => overlaps(c, start, end))
    .map((c) => {
      const part = sliceClip(c, Math.max(0, start - c.at), Math.min(pcmLength(c.pcm), end - c.at));
      return { ...part, at: part.at - start };
    });

/** Puts copied clips (from copyRange, `length` samples long) at sample `at`, replacing what was there. */
export const pasteClips = (track: Track, parts: Clip[], length: number, at: number): Track => ({
  ...track,
  clips: [...cutClips(track.clips, at, at + length), ...parts.map((c) => ({ ...c, at: c.at + at }))],
});

/** Lifts [start, end) off track `from` and drops it on track `to` at sample `at`, leaving silence behind (or the original, with copy). */
export const moveRange = (tracks: Track[], from: number, start: number, end: number, to: number, at: number, copy = false): Track[] => {
  const parts = copyRange(tracks.find((t) => t.id === from)?.clips ?? [], start, end);
  if (!parts.length) return tracks;
  const shift = Math.max(0, Math.round(at));
  return tracks.map((t) => {
    const clips = t.id === from && !copy ? cutClips(t.clips, start, end) : t.clips;
    return t.id === to ? { ...t, clips: [...clips, ...parts.map((c) => ({ ...c, at: c.at + shift }))] } : clips === t.clips ? t : { ...t, clips };
  });
};

/** Moves (or copies) the picked clips `lanes` tracks down and `shift` samples later; callers keep both in range. */
export const moveClips = (tracks: Track[], picked: Clip[], lanes: number, shift: number, copy = false): { tracks: Track[]; moved: Clip[] } => {
  const pick = new Set(picked);
  const moved: Clip[] = [];
  const adds = tracks.map((): Clip[] => []);
  tracks.forEach((t, i) =>
    t.clips.forEach((c) => {
      if (!pick.has(c)) return;
      const m = { ...c, at: c.at + shift };
      adds[Math.max(0, Math.min(tracks.length - 1, i + lanes))].push(m);
      moved.push(m);
    })
  );
  return {
    tracks: tracks.map((t, i) => {
      const keep = copy ? t.clips : t.clips.filter((c) => !pick.has(c));
      return keep.length === t.clips.length && !adds[i].length ? t : { ...t, clips: [...keep, ...adds[i]] };
    }),
    moved,
  };
};

/** Balance: -1 hard left, 1 hard right; the output is stereo. */
export const pan = (pcm: Pcm, amount: number): Pcm => {
  const [l, r = l] = pcm.channels;
  return { ...pcm, channels: [l.map((v) => v * Math.min(1, 1 - amount)), r.map((v) => v * Math.min(1, 1 + amount))] };
};

/** A track's live effect chain. Every stage at its neutral value is skipped. */
export interface TrackFx {
  /** dB */
  volume: number;
  /** -1 left .. 1 right */
  pan: number;
  semitones: number;
  /** transient shaper, dB */
  attack: number;
  sustain: number;
  /** saturation drive, dB; 0 = off */
  drive: number;
  /** 16 bits with rate 0 = off */
  bits: number;
  /** Hz; 0 = full rate */
  rate: number;
  /** Hz; 0 = off */
  lowCut: number;
  highCut: number;
  eq: EqGains;
  /** reverb tail, seconds */
  decay: number;
  /** reverb wet amount 0..1; 0 = off */
  reverb: number;
}
export const NO_FX: TrackFx = {
  volume: 0,
  pan: 0,
  semitones: 0,
  attack: 0,
  sustain: 0,
  drive: 0,
  bits: 16,
  rate: 0,
  lowCut: 0,
  highCut: 0,
  eq: { low: 0, mid: 0, high: 0 },
  decay: 1,
  reverb: 0,
};
export const fxActive = (fx: TrackFx) =>
  Boolean(
    fx.volume ||
      fx.pan ||
      fx.semitones ||
      fx.attack ||
      fx.sustain ||
      fx.drive ||
      fx.bits < 16 ||
      fx.rate ||
      fx.lowCut ||
      fx.highCut ||
      fx.eq.low ||
      fx.eq.mid ||
      fx.eq.high ||
      fx.reverb
  );

/** Runs the effect chain over a whole track's audio; a reverb makes it longer by its tail. */
export const processTrack = (pcm: Pcm, fx: TrackFx): Pcm => {
  const n = pcmLength(pcm);
  let p = pcm;
  if (fx.semitones) p = pitchShift(p, 0, n, fx.semitones);
  if (fx.attack || fx.sustain) p = transient(p, 0, n, fx.attack, fx.sustain);
  if (fx.drive) p = saturate(p, 0, n, fx.drive);
  if (fx.bits < 16 || fx.rate) p = bitcrush(p, 0, n, fx.bits, fx.rate || p.sampleRate);
  if (fx.lowCut || fx.highCut) p = cutFilter(p, 0, n, { lowCut: fx.lowCut, highCut: fx.highCut });
  if (fx.eq.low || fx.eq.mid || fx.eq.high) p = equalize(p, 0, n, fx.eq);
  if (fx.reverb) p = reverb(p, fx.decay, fx.reverb);
  if (fx.volume) p = gain(p, 0, pcmLength(p), 10 ** (fx.volume / 20));
  if (fx.pan) p = pan(p, fx.pan);
  return p;
};

export interface GlueSettings {
  /** dBFS */
  threshold: number;
  ratio: number;
  /** ms */
  attack: number;
  /** ms */
  release: number;
  /** dB */
  makeup: number;
  /** wet share, 0..1 */
  mix: number;
}

/** Bus compressor that glues layers together: stereo-linked, 6 dB soft knee. Returns the audio and its deepest gain reduction in dB. */
export const glue = (pcm: Pcm, o: GlueSettings): { pcm: Pcm; reduction: number } => {
  const KNEE = 6;
  const n = pcmLength(pcm);
  const coef = (ms: number) => Math.exp(-1 / Math.max(1, (ms / 1000) * pcm.sampleRate));
  const attack = coef(o.attack);
  const release = coef(o.release);
  const slope = 1 - 1 / o.ratio;
  const makeup = 10 ** (o.makeup / 20);
  const src = pcm.channels;
  const channels = src.map(() => new Float32Array(n));
  let env = 0;
  let reduction = 0;
  for (let i = 0; i < n; i++) {
    let peak = 0;
    for (const ch of src) peak = Math.max(peak, Math.abs(ch[i]));
    const over = 20 * Math.log10(peak + 1e-9) - o.threshold;
    const target = over <= -KNEE / 2 ? 0 : over >= KNEE / 2 ? over * slope : (slope * (over + KNEE / 2) ** 2) / (2 * KNEE);
    env = target + (target > env ? attack : release) * (env - target);
    reduction = Math.max(reduction, env);
    const g = o.mix * makeup * 10 ** (-env / 20) + 1 - o.mix;
    for (let c = 0; c < src.length; c++) channels[c][i] = src[c][i] * g;
  }
  return { pcm: { ...pcm, channels }, reduction };
};

/** Min/max per bucket across all channels, for drawing a waveform: [min0, max0, min1, max1, ...]. */
export const computePeaks = (pcm: Pcm, start: number, end: number, buckets: number): Float32Array => {
  const [s, e] = clamp(pcm, start, end);
  const out = new Float32Array(Math.max(0, buckets) * 2);
  const per = (e - s) / buckets;
  for (let b = 0; b < buckets; b++) {
    const from = s + Math.floor(b * per);
    const to = Math.max(from + 1, Math.min(e, s + Math.floor((b + 1) * per)));
    let min = 0;
    let max = 0;
    for (const ch of pcm.channels) {
      for (let i = from; i < to && i < e; i++) {
        const v = ch[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    out[b * 2] = min;
    out[b * 2 + 1] = max;
  }
  return out;
};

/** 16-bit PCM WAV. */
export const encodeWav = (pcm: Pcm): Blob => {
  const channels = pcm.channels.length;
  const frames = pcmLength(pcm);
  const dataSize = frames * channels * 2;
  const view = new DataView(new ArrayBuffer(44 + dataSize));
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, pcm.sampleRate, true);
  view.setUint32(28, pcm.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const v = Math.max(-1, Math.min(1, pcm.channels[c][i]));
      view.setInt16(offset, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([view.buffer], { type: 'audio/wav' });
};
