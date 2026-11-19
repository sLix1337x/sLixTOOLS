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

/** 3-band EQ on the range, with short crossfades at its edges so it joins the untouched audio without clicks. */
export const equalize = (pcm: Pcm, start: number, end: number, gains: EqGains): Pcm => {
  const bands = (Object.keys(EQ_FREQS) as (keyof EqGains)[]).filter((b) => gains[b] !== 0);
  const filters = bands.map((b) => biquad(b, gains[b], pcm.sampleRate));
  const [s, e] = clamp(pcm, start, end);
  const ramp = Math.min(Math.floor((e - s) / 2), Math.round(pcm.sampleRate * 0.005));
  return {
    ...pcm,
    channels: pcm.channels.map((ch) => {
      const out = ch.slice();
      const wet = out.subarray(s, e);
      for (const [b0, b1, b2, a1, a2] of filters) {
        let x1 = 0;
        let x2 = 0;
        let y1 = 0;
        let y2 = 0;
        for (let i = 0; i < wet.length; i++) {
          const x = wet[i];
          const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
          x2 = x1;
          x1 = x;
          y2 = y1;
          y1 = y;
          wet[i] = y;
        }
      }
      for (let i = 0; i < ramp; i++) {
        const j = wet.length - 1 - i;
        wet[i] = ch[s + i] + (wet[i] - ch[s + i]) * (i / ramp);
        wet[j] = ch[s + j] + (wet[j] - ch[s + j]) * (i / ramp);
      }
      return out;
    }),
  };
};

// ---- tracks ----
// A track holds clips; a clip places a piece of audio at sample `at` of the timeline.
// Clips may overlap and gaps between them are silent. All clips share the project's sample rate.

export interface Clip {
  at: number;
  pcm: Pcm;
}
export interface Track {
  id: number;
  clips: Clip[];
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
    channels.forEach((out, c) => {
      for (let i = from; i < to; i++) out[i - start] += src[c][i - clip.at];
    });
  }
  return { sampleRate, channels };
};

/** Removes [start, end) from the clips, splitting the ones that straddle it. Nothing moves. */
export const cutClips = (clips: Clip[], start: number, end: number): Clip[] =>
  clips.flatMap((clip) => {
    if (!overlaps(clip, start, end)) return [clip];
    const parts: Clip[] = [];
    if (clip.at < start) parts.push({ at: clip.at, pcm: keepRange(clip.pcm, 0, start - clip.at) });
    if (clipEnd(clip) > end) parts.push({ at: end, pcm: keepRange(clip.pcm, end - clip.at, Infinity) });
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

/** Lifts [start, end) off track `from` and drops it on track `to` at sample `at`, leaving silence behind. */
export const moveRange = (tracks: Track[], sampleRate: number, from: number, start: number, end: number, to: number, at: number): Track[] => {
  const lifted = tracks.find((t) => t.id === from)?.clips.filter((c) => overlaps(c, start, end));
  if (!lifted?.length) return tracks;
  const part: Clip = { at: Math.max(0, Math.round(at)), pcm: renderClips(lifted, sampleRate, start, end) };
  return tracks.map((t) => {
    const clips = t.id === from ? cutClips(t.clips, start, end) : t.clips;
    return t.id === to ? { ...t, clips: [...clips, part] } : clips === t.clips ? t : { ...t, clips };
  });
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
