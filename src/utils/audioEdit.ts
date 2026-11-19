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

const concat = (parts: Float32Array<ArrayBuffer>[]) => {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
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

export const deleteRange = (pcm: Pcm, start: number, end: number): Pcm => {
  const [s, e] = clamp(pcm, start, end);
  return { ...pcm, channels: pcm.channels.map((ch) => concat([ch.subarray(0, s), ch.subarray(e)])) };
};

/** Inserts other at sample position at. Both must share the sample rate. */
export const insertAt = (pcm: Pcm, other: Pcm, at: number): Pcm => {
  if (other.sampleRate !== pcm.sampleRate) throw new Error('Sample rates differ');
  const count = Math.max(pcm.channels.length, other.channels.length);
  const a = withChannels(pcm, count);
  const b = withChannels(other, count);
  const [pos] = clamp(a, at, at);
  return { ...a, channels: a.channels.map((ch, c) => concat([ch.subarray(0, pos), b.channels[c], ch.subarray(pos)])) };
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
