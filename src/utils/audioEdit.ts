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

/** All channels averaged into one: how a game plays a sound it places in 3D. */
export const toMono = (pcm: Pcm): Pcm => {
  if (pcm.channels.length < 2) return pcm;
  const out = new Float32Array(pcmLength(pcm));
  for (const ch of pcm.channels) for (let i = 0; i < out.length; i++) out[i] += ch[i] / pcm.channels.length;
  return { ...pcm, channels: [out] };
};

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

/** Default width of the mid band */
export const EQ_Q = 0.9;

/** RBJ cookbook biquad for a band and gain in dB, normalized to [b0, b1, b2, a1, a2]. q only shapes the mid band. */
const biquad = (band: keyof EqGains, db: number, sampleRate: number, freq = EQ_FREQS[band], q = EQ_Q) => {
  const A = 10 ** (db / 40);
  const w = (2 * Math.PI * Math.min(freq, sampleRate * 0.45)) / sampleRate;
  const cos = Math.cos(w);
  const sin = Math.sin(w);
  if (band === 'mid') {
    const alpha = sin / (2 * q);
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

export interface PitchEnvSettings {
  /** semitones the sound starts away from its pitch; 0 = off */
  amount: number;
  /** ms until it is back at its pitch */
  time: number;
}

/**
 * Pitch envelope: the sound starts `amount` semitones off and glides back, fast at first, by playing its start faster
 * or slower. Begins at the first audible sample. A start above the pitch makes the audio shorter, one below longer.
 */
export const pitchEnvelope = (pcm: Pcm, o: PitchEnvSettings): Pcm => {
  const n = pcmLength(pcm);
  const span = (o.time / 1000) * pcm.sampleRate;
  const [from, to] = audibleRange(pcm);
  if (!o.amount || span < 1 || to <= from) return pcm;
  // Where in the source every output sample reads. The glide lasts `span` output samples, so that is the most it adds
  const pos = new Float64Array(n + Math.ceil(span) + 1);
  let length = 0;
  for (let p = 0; p <= n - 1; length++) {
    pos[length] = p;
    const t = (length - from) / span;
    p += t < 0 || t >= 1 ? 1 : 2 ** ((o.amount * (1 - t) ** 2) / 12);
  }
  return {
    ...pcm,
    channels: pcm.channels.map((ch) => {
      const out = new Float32Array(length);
      for (let j = 0; j < length; j++) {
        const i = Math.floor(pos[j]);
        out[j] = ch[i] + ((ch[i + 1] ?? ch[i]) - ch[i]) * (pos[j] - i);
      }
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
export const equalize = (
  pcm: Pcm,
  start: number,
  end: number,
  gains: EqGains,
  freqs: EqGains = EQ_FREQS,
  q = EQ_Q
): Pcm => {
  const bands = (Object.keys(EQ_FREQS) as (keyof EqGains)[]).filter((b) => gains[b] !== 0);
  const filters = bands.map((b) => biquad(b, gains[b], pcm.sampleRate, freqs[b], q));
  return processRange(pcm, start, end, (wet) => filters.forEach((f) => runBiquad(wet, f)));
};

/** The EQ's total boost or cut at freq Hz, in dB, for drawing its curve. */
export const eqResponse = (gains: EqGains, freqs: EqGains, q: number, freq: number, sampleRate = 48000) => {
  const w = (2 * Math.PI * freq) / sampleRate;
  const [c1, s1, c2, s2] = [Math.cos(w), Math.sin(w), Math.cos(2 * w), Math.sin(2 * w)];
  const mag = (x0: number, x1: number, x2: number) => Math.hypot(x0 + x1 * c1 + x2 * c2, x1 * s1 + x2 * s2);
  let db = 0;
  for (const b of Object.keys(EQ_FREQS) as (keyof EqGains)[]) {
    if (!gains[b]) continue;
    const [b0, b1, b2, a1, a2] = biquad(b, gains[b], sampleRate, freqs[b], q);
    db += 20 * Math.log10(mag(b0, b1, b2) / mag(1, a1, a2));
  }
  return db;
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

/** Filter steepness in dB per octave */
export type Slope = 12 | 24 | 48;

export interface CutSettings {
  /** high-pass cutoff in Hz, 0 = off */
  lowCut: number;
  /** low-pass cutoff in Hz, 0 = off */
  highCut: number;
  /** default 24 */
  lowSlope?: Slope;
  highSlope?: Slope;
  /** resonance: dB of boost at the cutoff, default 0 */
  lowRes?: number;
  highRes?: number;
}

/** Butterworth cascade, one biquad per 12 dB/octave. Resonance raises the Q of the sharpest section. */
const cutStages = (type: 'high' | 'low', freq: number, sampleRate: number, slope: Slope = 24, res = 0) => {
  const count = slope / 12;
  return Array.from({ length: count }, (_, k) => {
    const q = 1 / (2 * Math.sin(((2 * k + 1) * Math.PI) / (4 * count)));
    return passFilter(type, freq, sampleRate, k ? q : q * 10 ** (res / 20));
  });
};

/** Low cut and high cut: Butterworth at 12, 24 or 48 dB/octave, each with optional resonance. */
export const cutFilter = (pcm: Pcm, start: number, end: number, o: CutSettings): Pcm => {
  const filters = [
    ...(o.lowCut > 0 ? cutStages('high', o.lowCut, pcm.sampleRate, o.lowSlope, o.lowRes) : []),
    ...(o.highCut > 0 ? cutStages('low', o.highCut, pcm.sampleRate, o.highSlope, o.highRes) : []),
  ];
  if (!filters.length) return pcm;
  return processRange(pcm, start, end, (wet) => filters.forEach((f) => runBiquad(wet, f)));
};

/** The cut filters' total gain at freq Hz, in dB, for drawing their curve. */
export const cutResponse = (o: CutSettings, freq: number, sampleRate = 48000) => {
  const w = (2 * Math.PI * freq) / sampleRate;
  const [c1, s1, c2, s2] = [Math.cos(w), Math.sin(w), Math.cos(2 * w), Math.sin(2 * w)];
  const mag = (x0: number, x1: number, x2: number) => Math.hypot(x0 + x1 * c1 + x2 * c2, x1 * s1 + x2 * s2);
  return [
    ...(o.lowCut > 0 ? cutStages('high', o.lowCut, sampleRate, o.lowSlope, o.lowRes) : []),
    ...(o.highCut > 0 ? cutStages('low', o.highCut, sampleRate, o.highSlope, o.highRes) : []),
  ].reduce((db, [b0, b1, b2, a1, a2]) => db + 20 * Math.log10(mag(b0, b1, b2) / mag(1, a1, a2) + 1e-9), 0);
};

/** Soft-clips with tanh after driveDb of gain: rounds off peaks and thickens the sound. */
export const saturate = (pcm: Pcm, start: number, end: number, driveDb: number): Pcm => {
  if (driveDb <= 0) return pcm;
  const g = 10 ** (driveDb / 20);
  return processRange(pcm, start, end, (wet) => wet.forEach((v, i) => (wet[i] = Math.tanh(g * v))));
};

export interface ClipperSettings {
  /** dB of gain into the clipper */
  drive: number;
  /** dBFS no sample gets past, 0 or below; 0 with no drive = off */
  ceiling: number;
}

/** Hard clipper: gain, then everything past the ceiling is cut flat. Louder and harsher than saturation. */
export const hardClip = (pcm: Pcm, o: ClipperSettings): Pcm => {
  if (o.drive <= 0 && o.ceiling >= 0) return pcm;
  const g = 10 ** (o.drive / 20);
  const top = 10 ** (Math.min(0, o.ceiling) / 20);
  return { ...pcm, channels: pcm.channels.map((ch) => ch.map((v) => Math.max(-top, Math.min(top, v * g)))) };
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

export interface GateSettings {
  /** dBFS the sound must pass to open the gate; GATE_OFF switches it off */
  threshold: number;
  /** ms to open; the gate looks this far ahead, so hits keep their full onset */
  attack: number;
  /** ms the gate stays open after the level drops */
  hold: number;
  /** ms to close */
  release: number;
  /** dB the closed gate turns the sound down */
  range: number;
}
export const GATE_OFF = -80;

/** Volume gate: mutes (by range dB) everything quieter than the threshold. Stereo-linked, 3 dB hysteresis against chatter. */
export const gate = (pcm: Pcm, o: GateSettings): Pcm => {
  const n = pcmLength(pcm);
  if (o.threshold <= GATE_OFF || o.range <= 0 || !n) return pcm;
  const sr = pcm.sampleRate;
  const open = 10 ** (o.threshold / 20);
  const close = open * 10 ** (-3 / 20);
  const floor = 10 ** (-o.range / 20);
  const level = envelope(pcm.channels, sr, 0, 5);
  const look = Math.round((o.attack / 1000) * sr);
  const hold = Math.round((o.hold / 1000) * sr) + look;
  const up = (1 - floor) / Math.max(1, look);
  const release = Math.exp(-1 / Math.max(1, (o.release / 1000) * sr));
  const gains = new Float32Array(n);
  // A sound that starts right at the beginning has no room to fade in: start open
  let g = level.subarray(0, look + 1).some((v) => v > open) ? 1 : floor;
  let isOpen = false;
  let held = 0;
  for (let i = 0; i < n; i++) {
    const l = level[Math.min(n - 1, i + look)];
    if (l > open || (isOpen && l > close)) {
      isOpen = true;
      held = hold;
    } else if (held > 0) held--;
    else isOpen = false;
    g = isOpen ? Math.min(1, g + up) : floor + (g - floor) * release;
    gains[i] = g;
  }
  return { ...pcm, channels: pcm.channels.map((ch) => ch.map((v, i) => v * gains[i])) };
};

export interface OverdriveSettings {
  /** dry/wet 0..1; 0 = off */
  mix: number;
  /** dB of gain into the clipper */
  drive: number;
  /** Hz: center of the band that gets driven */
  freq: number;
  /** width of that band in octaves */
  width: number;
  /** -1 dark .. 1 bright, after the clipper */
  tone: number;
  /** 0..1: 0 keeps the clipper's squashed level, 1 gives the sound its own dynamics back */
  dynamics: number;
}

/** Overdrive: band-pass, drive into a soft clipper, tone shelf, dynamics restore. The wet is matched to the dry peak. */
export const overdrive = (pcm: Pcm, o: OverdriveSettings): Pcm => {
  const n = pcmLength(pcm);
  if (o.mix <= 0 || !n) return pcm;
  const sr = pcm.sampleRate;
  const w = (2 * Math.PI * Math.min(o.freq, sr * 0.45)) / sr;
  const alpha = (Math.sin(w) * (2 ** o.width - 1)) / (2 * Math.sqrt(2 ** o.width)); // sin / 2Q, Q from octaves
  const band = [alpha, 0, -alpha, -2 * Math.cos(w), 1 - alpha].map((v) => v / (1 + alpha));
  const shelf = biquad('high', 12 * o.tone, sr, 2000);
  const g = 10 ** (o.drive / 20);
  const wets = pcm.channels.map((ch) => {
    const x = ch.slice();
    runBiquad(x, band);
    for (let i = 0; i < n; i++) x[i] = Math.tanh(g * x[i]);
    if (o.tone) runBiquad(x, shelf);
    return x;
  });
  if (o.dynamics > 0) {
    const before = envelope(pcm.channels, sr, 1, 50);
    const after = envelope(wets, sr, 1, 50);
    for (const x of wets) for (let i = 0; i < n; i++) if (after[i] > 1e-6) x[i] *= Math.min(1, before[i] / after[i]) ** o.dynamics;
  }
  const wetPeak = Math.max(...wets.map((x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
  const k = wetPeak > 0 ? (o.mix * peakLevel(pcm, 0, n)) / wetPeak : 0;
  return { ...pcm, channels: pcm.channels.map((ch, c) => ch.map((v, i) => v * (1 - o.mix) + wets[c][i] * k)) };
};

export interface LpgSettings {
  /** 0..1: how far the filter and the level follow the sound's envelope; 0 = off */
  amount: number;
  /** ms the gate takes to close after a hit */
  decay: number;
  /** Hz the filter closes down to */
  floor: number;
  /** 0..1 */
  resonance: number;
}

/**
 * Low pass gate: the sound's own envelope opens a resonant 12 dB/octave low-pass and a VCA, so a hit starts
 * bright and loud and its tail turns dark and quiet as it dies. The envelope is relative to the loudest moment.
 */
export const lowPassGate = (pcm: Pcm, o: LpgSettings): Pcm => {
  const n = pcmLength(pcm);
  if (o.amount <= 0 || !n) return pcm;
  const sr = pcm.sampleRate;
  const env = envelope(pcm.channels, sr, 0, o.decay);
  const peak = env.reduce((m, v) => Math.max(m, v), 0);
  if (!peak) return pcm;
  const top = Math.min(20000, sr * 0.45);
  const span = Math.min(1, o.floor / top);
  const k = Math.SQRT2 * (1 - 0.9 * o.resonance);
  // Per sample: the filter's tan(pi * cutoff / rate) and the VCA gain
  const gs = new Float32Array(n);
  const vca = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const closed = o.amount * (1 - env[i] / peak);
    gs[i] = Math.tan((Math.PI * top * span ** closed) / sr);
    vca[i] = (1 - closed) ** 0.5;
  }
  return {
    ...pcm,
    channels: pcm.channels.map((ch) => {
      // Trapezoidal state-variable filter: stays stable while its cutoff moves
      const out = new Float32Array(n);
      let s1 = 0;
      let s2 = 0;
      for (let i = 0; i < n; i++) {
        const g = gs[i];
        const a1 = 1 / (1 + g * (g + k));
        const v3 = ch[i] - s2;
        const v1 = a1 * (s1 + g * v3);
        const v2 = s2 + g * v1;
        s1 = 2 * v1 - s1;
        s2 = 2 * v2 - s2;
        out[i] = v2 * vca[i];
      }
      return out;
    }),
  };
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

/** Mono sine peaking at 0.9 that glides from `from` to `to` Hz, by the same ratio every instant: the low thump under a hit. */
export const sweep = (sampleRate: number, seconds: number, from: number, to: number): Pcm => {
  const n = Math.max(1, Math.round(seconds * sampleRate));
  const rate = Math.log(to / from);
  const x = Float32Array.from({ length: n }, (_, i) => {
    const t = i / n;
    // Cycles so far: the frequency from * (to / from) ** t, summed up
    const cycles = (n / sampleRate) * from * (rate ? (Math.exp(rate * t) - 1) / rate : t);
    return 0.9 * Math.sin(2 * Math.PI * cycles);
  });
  return { sampleRate, channels: [x] };
};

// ---- seams: finding where two stretches of audio match, and crossfading them ----

/** Mono mix at `count` points from `from` on, each summing `step` samples: cheap material for match searches. */
const probe = (pcm: Pcm, from: number, count: number, step: number) => {
  const out = new Float32Array(Math.max(0, count));
  for (const ch of pcm.channels)
    for (let i = 0; i < out.length; i++) {
      const k = from + i * step;
      let s = 0;
      for (let j = 0; j < step; j++) s += ch[k + j] ?? 0;
      out[i] += s;
    }
  return out;
};

const correlation = (dot: number, ea: number, eb: number) => (ea > 1e-12 && eb > 1e-12 ? dot / Math.sqrt(ea * eb) : 0);
/** Correlation weighed by how close the two levels are: a quiet stretch that matches in shape is still a jump */
const matchScore = (dot: number, ea: number, eb: number) =>
  correlation(dot, ea, eb) * Math.sqrt(Math.min(ea, eb) / Math.max(ea, eb, 1e-12));

/** Samples compared in the sample-exact pass: enough to pin the phase of a low hum */
const REFINE_LEN = 2048;

interface Search {
  a: Pcm;
  aFrom: number;
  b: Pcm;
  bFrom: number;
  len: number;
  lo: number;
  hi: number;
}

/** Shifts that keep a's window inside a; null when none do */
const searchRange = (a: Pcm, aFrom: number, b: Pcm, bFrom: number, len: number, lo: number, hi: number): Search | null => {
  lo = Math.max(Math.round(lo), -aFrom);
  hi = Math.min(Math.round(hi), pcmLength(a) - len - aFrom);
  return len < 1 || hi < lo ? null : { a, aFrom, b, bFrom, len, lo, hi };
};

/** Best shift on a decimated mono mix, stepping one probe at a time */
const coarseMatch = ({ a, aFrom, b, bFrom, len, lo, hi }: Search) => {
  const step = Math.max(1, Math.ceil(len / 256));
  const m = Math.floor(len / step);
  const count = Math.floor((hi - lo) / step) + 1;
  const pa = probe(a, aFrom + lo, count - 1 + m, step);
  const pb = probe(b, bFrom, m, step);
  let eb = 0;
  let ea = 0;
  for (let i = 0; i < m; i++) {
    eb += pb[i] * pb[i];
    ea += pa[i] * pa[i];
  }
  let score = -Infinity;
  let lag = lo;
  for (let j = 0; j < count; j++) {
    if (j) ea = Math.max(0, ea + pa[j + m - 1] ** 2 - pa[j - 1] ** 2);
    let dot = 0;
    for (let i = 0; i < m; i++) dot += pa[j + i] * pb[i];
    const s = matchScore(dot, ea, eb);
    if (s > score) [score, lag] = [s, lo + j * step];
  }
  return { lag, score, step };
};

/** Sample-exact best shift within `step` of a coarse one, and its correlation */
const refineMatch = ({ a, aFrom, b, bFrom, len, lo, hi }: Search, coarse: number, step: number) => {
  const n = Math.min(len, REFINE_LEN);
  const from = Math.max(lo, coarse - step);
  const to = Math.min(hi, coarse + step);
  const ma = probe(a, aFrom + from, to - from + n, 1);
  const mb = probe(b, bFrom, n, 1);
  let eb = 0;
  for (let i = 0; i < n; i++) eb += mb[i] * mb[i];
  let best = -Infinity;
  let result = { lag: coarse, r: 0 };
  for (let s = from; s <= to; s++) {
    let dot = 0;
    let e = 0;
    for (let i = 0, k = s - from; i < n; i++, k++) {
      dot += ma[k] * mb[i];
      e += ma[k] * ma[k];
    }
    const score = matchScore(dot, e, eb);
    if (score > best) [best, result] = [score, { lag: s, r: correlation(dot, e, eb) }];
  }
  return result;
};

/**
 * The shift in [lo, hi] at which a's `len` samples from aFrom + shift look most like b's from bFrom,
 * and their correlation there (1 = same waveform, 0 = unrelated). Coarse on a decimated mono mix, then
 * sample-exact around the winner. Shifts that would leave a are skipped.
 */
export const bestMatch = (a: Pcm, aFrom: number, b: Pcm, bFrom: number, len: number, lo: number, hi: number) => {
  const search = searchRange(a, aFrom, b, bFrom, len, lo, hi);
  if (!search) return { lag: 0, r: 0 };
  const { lag, step } = coarseMatch(search);
  return refineMatch(search, lag, step);
};

/**
 * Crossfade gains [in, out] at t in [0, 1] for two signals with correlation r: linear when they match
 * (r = 1, the amplitudes add up), equal power when unrelated (r ≤ 0, the powers add up). No bump, no dip.
 */
export const crossfadeGains = (t: number, r: number): [number, number] => {
  const c = Math.max(0, Math.min(1, r));
  const d = Math.sqrt(t * t + (1 - t) * (1 - t) + 2 * c * t * (1 - t));
  return [t / d, (1 - t) / d];
};

/** Seamless loop: the last xf samples are crossfaded into the start and dropped, so the end runs into the start. */
export const makeLoop = (pcm: Pcm, xf: number): Pcm => {
  const n = pcmLength(pcm);
  const x = Math.max(0, Math.min(Math.floor(n / 2), Math.round(xf)));
  if (!x) return pcm;
  const { r } = bestMatch(pcm, n - x, pcm, 0, x, 0, 0);
  const gains = Array.from({ length: x }, (_, i) => crossfadeGains(i / x, r));
  return {
    ...pcm,
    channels: pcm.channels.map((ch) => {
      const out = ch.slice(0, n - x);
      for (let i = 0; i < x; i++) out[i] = ch[i] * gains[i][0] + ch[n - x + i] * gains[i][1];
      return out;
    }),
  };
};

/**
 * Where a loop of pcm from sample 0 should end so its last xf samples crossfade best into its first:
 * searched between half the length and the end. match is the seam's correlation (1 = inaudible).
 */
export const findLoopEnd = (pcm: Pcm, xf: number) => {
  const n = pcmLength(pcm);
  const x = Math.max(1, Math.min(Math.floor(n / 2), Math.round(xf)));
  const { lag, r } = bestMatch(pcm, 0, pcm, 0, x, Math.max(x, Math.ceil(n / 2) - x), n - x);
  return { end: lag + x, match: r };
};

/**
 * Repeats the best loop of pcm until it lasts at least `length` samples, in whole cycles. The real start
 * and end stay, so the result joins whatever was around it.
 */
export const extendLoop = (pcm: Pcm, xf: number, length: number) => {
  const n = pcmLength(pcm);
  if (length <= n || n < 4) return { pcm, match: 1 };
  const { end, match } = findLoopEnd(pcm, xf);
  const x = Math.max(1, Math.min(Math.floor(n / 2), Math.round(xf)));
  const body = makeLoop(keepRange(pcm, 0, end), x);
  const cycle = end - x;
  const k = Math.ceil((length - n) / cycle);
  return {
    match,
    pcm: {
      ...pcm,
      channels: pcm.channels.map((ch, c) => {
        // start … body × k … end: every join continues the sample before it
        const out = new Float32Array(n + k * cycle);
        out.set(ch.subarray(0, cycle));
        for (let j = 0; j < k; j++) out.set(body.channels[c], cycle * (j + 1));
        out.set(ch.subarray(cycle), cycle * (k + 1));
        return out;
      }),
    },
  };
};

/** Random places tried for each grain; the best-matching one wins */
const GRAIN_TRIES = 4;

/**
 * Rebuilds pcm about `length` samples long from `grain`-long pieces taken at random places. Each piece is
 * nudged (up to 25 ms) to where it continues the one before in phase, then crossfaded over half its length,
 * so a steady sound (hum, fan, wind) runs on without a repeating pattern. The real start and end stay.
 * match is the mean seam correlation.
 */
export const texture = (pcm: Pcm, length: number, grain: number, random = Math.random) => {
  const n = pcmLength(pcm);
  const g = Math.min(Math.floor(n / 3), Math.round(grain));
  if (length <= n || g < 64) return { pcm, match: 1 };
  const o = Math.floor(g / 2);
  const hop = g - o;
  const tol = Math.min(o, Math.round(pcm.sampleRate * 0.025));
  const out = pcm.channels.map((ch) => {
    const buf = new Float32Array(length + tol + 1);
    buf.set(ch.subarray(0, g));
    return buf;
  });
  /** Crossfades source from q into out at `at`: o samples blended, then `rest` more copied */
  const place = (q: number, at: number, r: number, rest: number) =>
    pcm.channels.forEach((ch, c) => {
      const buf = out[c];
      for (let i = 0; i < o; i++) {
        const [gi, go] = crossfadeGains((i + 0.5) / o, r);
        buf[at + i] = buf[at + i] * go + ch[q + i] * gi;
      }
      buf.set(ch.subarray(q + o, q + o + rest), at + o);
    });
  let src = 0;
  let at = 0;
  let sum = 0;
  let seams = 0;
  for (;;) {
    const next = at + hop;
    // The source that would continue the current grain: each candidate is matched against it
    const want = src + hop;
    if (length - next <= 2 * g) {
      // Last piece: the source's own ending, nudged to fit
      const { lag, r } = bestMatch(pcm, n - (length - next), pcm, want, o, -tol, tol);
      const q = n - (length - next) + lag;
      place(q, next, r, n - q - o);
      sum += r;
      seams++;
      return {
        pcm: { ...pcm, channels: out.map((buf) => buf.slice(0, next + n - q)) },
        match: sum / seams,
      };
    }
    // Candidates compete on the cheap coarse match; only the winner gets the sample-exact pass
    let pick: { search: Search; lag: number; step: number; score: number } | null = null;
    for (let t = 0; t < GRAIN_TRIES; t++) {
      const p = tol + Math.floor(random() * (n - g - 2 * tol));
      const search = searchRange(pcm, p, pcm, want, o, -tol, tol);
      const c = search && coarseMatch(search);
      if (search && c && (!pick || c.score > pick.score)) pick = { search, ...c };
    }
    if (!pick) return { pcm, match: 1 }; // only when the source is too short to search
    const { lag, r } = refineMatch(pick.search, pick.lag, pick.step);
    const q = pick.search.aFrom + lag;
    place(q, next, r, g - o);
    sum += r;
    seams++;
    src = q;
    at = next;
  }
};

export interface DelaySettings {
  /** wet level 0..1; 0 = off */
  mix: number;
  /** delay time in ms: a few ms flanges, tens to hundreds echo */
  time: number;
  /** -0.95..0.95; negative flips the phase for a hollow flange */
  feedback: number;
  /** ms the LFO sweeps the delay time upward; 0 = a fixed delay */
  depth: number;
  /** LFO speed in Hz */
  rate: number;
  /** 0..1: how much darker every repeat gets */
  damp: number;
}

/**
 * Modulated feedback delay. Short and swept by the LFO it is a flanger, long and fixed an echo.
 * The result is longer by its ringing (until the repeats are 60 dB down, 5 s at most).
 */
export const delay = (pcm: Pcm, o: DelaySettings): Pcm => {
  const n = pcmLength(pcm);
  if (o.mix <= 0 || !n) return pcm;
  const sr = pcm.sampleRate;
  const base = (o.time / 1000) * sr;
  const sweep = (o.depth / 1000) * sr;
  const fb = Math.max(-0.95, Math.min(0.95, o.feedback));
  const repeats = fb ? Math.log(0.001) / Math.log(Math.abs(fb)) : 1;
  const length = n + Math.min(5 * sr, Math.ceil((base + sweep) * repeats));
  const size = Math.ceil(base + sweep) + 3;
  return {
    ...pcm,
    channels: pcm.channels.map((ch, c) => {
      const buf = new Float32Array(size);
      const out = new Float32Array(length);
      const phase = (c * Math.PI) / 2; // the right channel sweeps a quarter turn ahead: stereo movement
      let wet = 0;
      for (let i = 0, w = 0; i < length; i++, w = (w + 1) % size) {
        const lfo = sweep ? (1 - Math.cos((2 * Math.PI * o.rate * i) / sr + phase)) / 2 : 0;
        const r = (w - Math.max(1, base + sweep * lfo) + size) % size;
        const j = Math.floor(r);
        const y = buf[j] + (buf[(j + 1) % size] - buf[j]) * (r - j);
        wet = y + o.damp * (wet - y);
        const x = i < n ? ch[i] : 0;
        buf[w] = x + wet * fb;
        out[i] = x + wet * o.mix;
      }
      return out;
    }),
  };
};

export interface ReverbSettings {
  /** wet level against the dry peak, 0..1; 0 = off */
  mix: number;
  /** seconds the tail takes to fall 60 dB */
  decay: number;
  /** ms of silence before the reverb answers: distance to the nearest wall */
  preDelay: number;
  /** room size, 1 = medium: scales the reflection times and the tail's echo density */
  size: number;
  /** level of the early reflections (the first distinct echoes off the walls), 0..1 */
  early: number;
  /** level of the diffuse tail, 0..1 */
  tail: number;
  /** 0..1: how much faster the highs die than the lows */
  damping: number;
  /** 0..1: 0 leaves grainy single echoes, 1 smears them into a smooth wash */
  diffusion: number;
  /** Hz, 0 = off: filters on the reverb only */
  lowCut: number;
  highCut: number;
  /** 0 mono .. 1 wide; above 0 a mono track comes out stereo */
  width: number;
}

const COMBS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const ALLPASSES = [556, 441, 341, 225];
/** Early reflections in a medium room: ms after the direct sound. Each is quieter the later it arrives. */
const REFLECTIONS = [5, 9, 14, 19, 26, 31, 39, 47, 58, 67, 79, 89];

/**
 * Reverb: pre-delay, then early reflections (a tapped delay) next to a Freeverb-style tail (damped combs into
 * allpass diffusers), filtered and narrowed or widened. The result is longer by the pre-delay and the decay.
 */
export const reverb = (pcm: Pcm, o: ReverbSettings): Pcm => {
  const n = pcmLength(pcm);
  const sr = pcm.sampleRate;
  if (o.mix <= 0 || o.decay <= 0 || (o.early <= 0 && o.tail <= 0) || !n) return pcm;
  const pre = Math.round((o.preDelay / 1000) * sr);
  const taps = REFLECTIONS.map((ms) => ({ at: pre + Math.round((ms / 1000) * o.size * sr), gain: 1 / (1 + ms / 25) }));
  const length = n + pre + Math.ceil(Math.max(o.decay, 0.09 * o.size) * sr);
  const scale = (o.size * sr) / 44100;
  const input = new Float32Array(length);
  for (const ch of pcm.channels) for (let i = 0; i < n; i++) input[pre + i] += ch[i] / pcm.channels.length;
  const count = Math.max(pcm.channels.length, o.width > 0 ? 2 : 1);
  const diffuse = 0.75 * o.diffusion;

  const tails = Array.from({ length: o.tail > 0 ? count : 0 }, (_, c) => {
    const spread = c % 2 ? 23 : 0;
    const out = new Float32Array(length);
    for (const d of COMBS) {
      const size = Math.max(1, Math.round((d + spread) * scale));
      const g = Math.min(0.995, 10 ** ((-3 * size) / (o.decay * sr)));
      const buf = new Float32Array(size);
      let filt = 0;
      for (let i = pre, k = 0; i < length; i++, k = (k + 1) % size) {
        const y = buf[k];
        filt = y + o.damping * (filt - y);
        buf[k] = input[i] + filt * g;
        out[i] += y;
      }
    }
    for (const d of ALLPASSES) {
      const size = Math.max(1, Math.round((d + spread) * scale));
      const buf = new Float32Array(size);
      for (let i = pre, k = 0; i < length; i++, k = (k + 1) % size) {
        const y = buf[k] - diffuse * out[i];
        buf[k] = out[i] + diffuse * y;
        out[i] = y;
      }
    }
    return out;
  });
  const dryPeak = peakLevel(pcm, 0, n);
  const tailPeak = Math.max(0, ...tails.map((w) => w.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
  const tailGain = tailPeak > 0 ? (o.tail * dryPeak) / tailPeak : 0;

  const wets = Array.from({ length: count }, (_, c) => {
    const wet = tails[c] ?? new Float32Array(length);
    for (let i = 0; i < length; i++) wet[i] *= tailGain;
    // Reflections alternate sides, so a stereo room has walls left and right
    if (o.early > 0)
      taps.forEach(({ at, gain }, t) => {
        const g = o.early * gain * (count > 1 && t % 2 !== c % 2 ? 0.4 : 1);
        for (let i = 0; i < n; i++) wet[at + i] += input[pre + i] * g;
      });
    if (o.lowCut > 0) runBiquad(wet, passFilter('high', o.lowCut, sr));
    if (o.highCut > 0) runBiquad(wet, passFilter('low', o.highCut, sr));
    return wet;
  });
  if (count > 1 && o.width < 1) {
    const [l, r] = wets;
    for (let i = 0; i < length; i++) {
      const mid = (l[i] + r[i]) / 2;
      const side = ((l[i] - r[i]) / 2) * o.width;
      l[i] = mid + side;
      r[i] = mid - side;
    }
  }
  return {
    ...pcm,
    channels: wets.map((wet, c) => {
      const dry = pcm.channels[Math.min(c, pcm.channels.length - 1)];
      for (let i = 0; i < length; i++) wet[i] = wet[i] * o.mix + (i < n ? dry[i] : 0);
      return wet;
    }),
  };
};

/**
 * The sound heard from further away, `amount` from 0 (as it is) to 1 (far): the air takes the highs, the attack
 * softens and the surroundings answer more. Longer by the reverb's tail; a mono sound stays mono.
 */
export const distance = (pcm: Pcm, amount: number): Pcm => {
  if (amount <= 0) return pcm;
  const n = pcmLength(pcm);
  const highCut = Math.min(20000 * 0.11 ** amount, 0.45 * pcm.sampleRate);
  const dull = cutFilter(pcm, 0, n, { lowCut: 0, highCut, highSlope: 12 });
  return reverb(transient(dull, 0, n, -6 * amount, 0), {
    ...NO_FX.reverb,
    mix: 0.4 * amount,
    decay: 1 + amount,
    size: 2,
    early: 0.2,
    damping: 0.5,
    width: pcm.channels.length > 1 ? 1 : 0,
  });
};

// ---- tracks ----
// A track holds clips; a clip places a piece of audio at sample `at` of the timeline.
// Clips may overlap and gaps between them are silent. All clips share the project's sample rate.

/** A clip fade: length in samples, curve -1..1 (0 linear, above 0 rises early, below 0 rises late). */
export interface Fade {
  length: number;
  curve: number;
  /** made by autoCrossfade, which keeps it matched to the overlap; editing it by hand makes it the user's */
  auto?: boolean;
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
  /** shown instead of "Track 1" */
  name?: string;
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

/** Fade curve of an automatic crossfade between unrelated clips: close to equal power (k = 2) */
const XF_CURVE = 1 / 3;
/** Overlap compared to tell matching clips (linear crossfade) from unrelated ones */
const XF_PROBE = 8192;

/**
 * Turns every partial overlap between a track's clips into a crossfade: the earlier clip fades out across
 * it, the later one fades in, linear when the two match in phase and near equal power when they don't.
 * Fades it made (auto) follow the overlaps and go when they do; hand-made fades are left alone.
 * Returns the same array, and untouched clips, when nothing changes.
 */
export const autoCrossfade = (clips: Clip[]): Clip[] => {
  const ins = clips.map(() => ({ len: 0, other: -1 }));
  const outs = clips.map(() => ({ len: 0, other: -1 }));
  clips.forEach((a, i) =>
    clips.forEach((b, j) => {
      const len = clipEnd(a) - b.at;
      if (a.at >= b.at || len <= 0 || clipEnd(a) >= clipEnd(b)) return;
      if (len > outs[i].len) outs[i] = { len, other: j };
      if (len > ins[j].len) ins[j] = { len, other: i };
    })
  );
  const curve = (a: Clip, b: Clip, len: number) => {
    const n = Math.min(len, XF_PROBE);
    return bestMatch(a.pcm, b.at - a.at, b.pcm, 0, n, 0, 0).r >= 0.5 ? 0 : XF_CURVE;
  };
  const fit = (own: Fade | undefined, len: number, make: () => number): Fade | undefined => {
    if (own && !own.auto) return own;
    if (len <= 0) return undefined;
    return own?.length === len ? own : { length: len, curve: make(), auto: true };
  };
  let changed = false;
  const next = clips.map((c, i) => {
    const fadeIn = fit(c.fadeIn, ins[i].len, () => curve(clips[ins[i].other], c, ins[i].len));
    const room = pcmLength(c.pcm) - (fadeIn?.length ?? 0);
    const fadeOut = fit(c.fadeOut, Math.min(room, outs[i].len), () => curve(c, clips[outs[i].other], outs[i].len));
    if (fadeIn === c.fadeIn && fadeOut === c.fadeOut) return c;
    changed = true;
    const out: Clip = { ...c, ...(fadeIn && { fadeIn }), ...(fadeOut && { fadeOut }) };
    if (!fadeIn) delete out.fadeIn;
    if (!fadeOut) delete out.fadeOut;
    return out;
  });
  return changed ? next : clips;
};

/**
 * How far (within ±maxShift samples) to move clips[i] so it lines up in phase with the clip it overlaps at
 * its start, so their crossfade doesn't hollow out a hum. 0 when there's no such overlap or nothing matches.
 */
export const alignOverlap = (clips: Clip[], i: number, maxShift: number) => {
  const b = clips[i];
  let a: Clip | undefined;
  for (const c of clips) if (c !== b && c.at < b.at && clipEnd(c) > b.at && (!a || clipEnd(c) > clipEnd(a))) a = c;
  if (!a) return 0;
  const half = Math.floor(Math.min(clipEnd(a) - b.at, pcmLength(b.pcm)) / 2);
  const len = Math.min(half, XF_PROBE);
  if (len < 32) return 0;
  const shift = Math.min(maxShift, half);
  const { lag, r } = bestMatch(a.pcm, b.at - a.at, b.pcm, 0, len, Math.max(-shift, -b.at), shift);
  return r >= 0.5 ? lag : 0;
};

/** `shots` in a row at `rpm` rounds per minute, each one a random take, tails ringing over the next shot: full auto as a game plays it. */
export const autoFire = (takes: Pcm[], rpm: number, shots: number, random = Math.random): Pcm => {
  const { sampleRate } = takes[0];
  const step = Math.round((60 / rpm) * sampleRate);
  const clips = Array.from({ length: shots }, (_, i) => ({
    at: i * step,
    pcm: takes[Math.floor(random() * takes.length)],
  }));
  return renderClips(clips, sampleRate, 0, Math.max(...clips.map(clipEnd)));
};

/** Cuts at the sample positions and trims the silence around every part. Parts with nothing audible are dropped. */
export const splitAt = (pcm: Pcm, cuts: number[], thresholdDb = -60): Pcm[] => {
  const edges = [0, ...cuts, pcmLength(pcm)];
  return edges.slice(1).flatMap((end, i) => {
    const part = keepRange(pcm, edges[i], end);
    const [s, e] = audibleRange(part, thresholdDb);
    return e > s ? [keepRange(part, s, e)] : [];
  });
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
  /** dB per octave */
  lowSlope: Slope;
  highSlope: Slope;
  /** dB of boost at the cutoff */
  lowRes: number;
  highRes: number;
  eq: EqGains;
  /** Hz per band */
  eqFreq: EqGains;
  /** mid band width */
  eqQ: number;
  pitchEnv: PitchEnvSettings;
  gate: GateSettings;
  overdrive: OverdriveSettings;
  clipper: ClipperSettings;
  lpg: LpgSettings;
  flanger: DelaySettings;
  delay: DelaySettings;
  reverb: ReverbSettings;
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
  lowSlope: 24,
  highSlope: 24,
  lowRes: 0,
  highRes: 0,
  eq: { low: 0, mid: 0, high: 0 },
  eqFreq: EQ_FREQS,
  eqQ: EQ_Q,
  pitchEnv: { amount: 0, time: 80 },
  gate: { threshold: GATE_OFF, attack: 1, hold: 20, release: 80, range: 80 },
  overdrive: { mix: 0, drive: 18, freq: 1200, width: 4, tone: 0, dynamics: 0.5 },
  clipper: { drive: 0, ceiling: 0 },
  lpg: { amount: 0, decay: 150, floor: 200, resonance: 0 },
  flanger: { mix: 0, time: 2, feedback: 0.5, depth: 3, rate: 0.5, damp: 0 },
  delay: { mix: 0, time: 120, feedback: 0.3, depth: 0, rate: 0, damp: 0.3 },
  reverb: {
    mix: 0,
    decay: 1,
    preDelay: 0,
    size: 1,
    early: 0.5,
    tail: 1,
    damping: 0.25,
    diffusion: 0.65,
    lowCut: 0,
    highCut: 0,
    width: 1,
  },
};
export const fxActive = (fx: TrackFx) =>
  Boolean(
    fx.volume ||
      fx.pan ||
      fx.semitones ||
      fx.pitchEnv.amount ||
      fx.clipper.drive ||
      fx.clipper.ceiling < 0 ||
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
      fx.gate.threshold > GATE_OFF ||
      fx.overdrive.mix ||
      fx.lpg.amount ||
      fx.flanger.mix ||
      fx.delay.mix ||
      fx.reverb.mix
  );

/** A saved chain laid over the defaults, group by group, so one saved before an effect existed still loads. */
export const withFxDefaults = (saved: Partial<TrackFx>): TrackFx =>
  Object.fromEntries(
    Object.entries(NO_FX).map(([key, neutral]) => {
      const value = (saved as Record<string, unknown>)[key];
      return [key, typeof neutral === 'object' ? { ...neutral, ...(value as object) } : (value ?? neutral)];
    })
  ) as unknown as TrackFx;

/**
 * Runs the effect chain over a whole track's audio. Flanger, delay and reverb make it longer by their tails, the
 * pitch envelope a little longer or shorter.
 */
export const processTrack = (pcm: Pcm, fx: TrackFx): Pcm => {
  let p = fx.semitones ? pitchShift(pcm, 0, pcmLength(pcm), fx.semitones) : pcm;
  p = pitchEnvelope(p, fx.pitchEnv);
  const n = pcmLength(p);
  p = gate(p, fx.gate);
  if (fx.attack || fx.sustain) p = transient(p, 0, n, fx.attack, fx.sustain);
  if (fx.drive) p = saturate(p, 0, n, fx.drive);
  p = overdrive(p, fx.overdrive);
  if (fx.bits < 16 || fx.rate) p = bitcrush(p, 0, n, fx.bits, fx.rate || p.sampleRate);
  p = cutFilter(p, 0, n, fx);
  if (fx.eq.low || fx.eq.mid || fx.eq.high) p = equalize(p, 0, n, fx.eq, fx.eqFreq, fx.eqQ);
  p = hardClip(p, fx.clipper);
  p = lowPassGate(p, fx.lpg);
  p = delay(p, fx.flanger);
  p = delay(p, fx.delay);
  p = reverb(p, fx.reverb);
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
