/**
 * FFmpeg argument builder for the video editor: trims each clip, normalizes size/fps/audio
 * so differently shaped clips can be concatenated, then applies speed, rotation and fades.
 */
import { audioCodecArgs, videoCodecArgs } from './ffmpeg';

export interface EditClip {
  /** Name inside the FFmpeg filesystem */
  inputName: string;
  start: number;
  end: number;
  width: number;
  height: number;
  hasAudio: boolean;
  muted: boolean;
  /** 1 = unchanged */
  volume: number;
}

export interface EditSettings {
  format: 'mp4' | 'webm';
  crf: number;
  /** Output height; 0 keeps the first clip's size */
  height: number;
  fps: number;
  speed: number;
  rotate: 0 | 90 | 180 | 270;
  flip: boolean;
  fadeIn: number;
  fadeOut: number;
  removeAudio: boolean;
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

export const clipLength = (clip: Pick<EditClip, 'start' | 'end'>) => Math.max(0, clip.end - clip.start);

export const outputDuration = (clips: Pick<EditClip, 'start' | 'end'>[], speed: number) =>
  clips.reduce((sum, c) => sum + clipLength(c), 0) / speed;

/** Output frame size: the first clip (after rotation), scaled to settings.height. */
export const outputSize = (clips: Pick<EditClip, 'width' | 'height'>[], settings: Pick<EditSettings, 'height' | 'rotate'>) => {
  const first = clips[0] ?? { width: 1280, height: 720 };
  const sideways = settings.rotate === 90 || settings.rotate === 270;
  const w = sideways ? first.height : first.width;
  const h = sideways ? first.width : first.height;
  if (!settings.height || !w || !h) return { width: even(w || 1280), height: even(h || 720) };
  return { width: even((w / h) * settings.height), height: even(settings.height) };
};

const ROTATE: Record<EditSettings['rotate'], string[]> = {
  0: [],
  90: ['transpose=1'],
  180: ['hflip', 'vflip'],
  270: ['transpose=2'],
};

/**
 * Full argument list (without the leading -hide_banner/-stats_period the session adds).
 * audioOnly exports just the soundtrack as MP3 and skips all video work.
 */
export const buildEditArgs = (clips: EditClip[], settings: EditSettings, outputName: string, audioOnly = false): string[] => {
  if (clips.length === 0) throw new Error('No clips to export');
  const withVideo = !audioOnly;
  const withAudio = audioOnly || (!settings.removeAudio && clips.some((c) => c.hasAudio && !c.muted));
  const total = outputDuration(clips, settings.speed);
  const { width: W, height: H } = outputSize(clips, settings);

  const inputs = clips.flatMap((c) => ['-ss', fmt(c.start), '-t', fmt(clipLength(c)), '-i', c.inputName]);
  const graph: string[] = [];
  const concatInputs: string[] = [];

  clips.forEach((c, i) => {
    if (withVideo) {
      const chain = [
        ...ROTATE[settings.rotate],
        ...(settings.flip ? ['hflip'] : []),
        `scale=${W}:${H}:force_original_aspect_ratio=decrease`,
        `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2`,
        'setsar=1',
        `fps=${settings.fps}`,
        'format=yuv420p',
        'setpts=PTS-STARTPTS',
      ];
      graph.push(`[${i}:v]${chain.join(',')}[v${i}]`);
      concatInputs.push(`[v${i}]`);
    }
    if (withAudio) {
      const len = fmt(clipLength(c));
      graph.push(
        c.hasAudio && !c.muted
          ? `[${i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${fmt(c.volume)},apad,atrim=duration=${len},asetpts=PTS-STARTPTS[a${i}]`
          : `anullsrc=r=48000:cl=stereo,atrim=duration=${len}[a${i}]`
      );
      concatInputs.push(`[a${i}]`);
    }
  });

  graph.push(`${concatInputs.join('')}concat=n=${clips.length}:v=${withVideo ? 1 : 0}:a=${withAudio ? 1 : 0}${withVideo ? '[vc]' : ''}${withAudio ? '[ac]' : ''}`);

  const fadeIn = Math.min(settings.fadeIn, total);
  const fadeOut = Math.min(settings.fadeOut, total);
  const maps: string[] = [];

  if (withVideo) {
    const post = [
      ...(settings.speed !== 1 ? [`setpts=PTS/${fmt(settings.speed)}`] : []),
      ...(fadeIn > 0 ? [`fade=t=in:st=0:d=${fmt(fadeIn)}`] : []),
      ...(fadeOut > 0 ? [`fade=t=out:st=${fmt(total - fadeOut)}:d=${fmt(fadeOut)}`] : []),
    ];
    graph.push(`[vc]${post.length ? post.join(',') : 'null'}[vout]`);
    maps.push('-map', '[vout]');
  }
  if (withAudio) {
    const post = [
      ...(settings.speed !== 1 ? [`atempo=${fmt(settings.speed)}`] : []),
      ...(fadeIn > 0 ? [`afade=t=in:st=0:d=${fmt(fadeIn)}`] : []),
      ...(fadeOut > 0 ? [`afade=t=out:st=${fmt(total - fadeOut)}:d=${fmt(fadeOut)}`] : []),
    ];
    graph.push(`[ac]${post.length ? post.join(',') : 'anull'}[aout]`);
    maps.push('-map', '[aout]');
  }

  const codec = audioOnly ? audioCodecArgs('mp3') : videoCodecArgs(settings.format, settings.crf, withAudio);
  return [...inputs, '-filter_complex', graph.join(';'), ...maps, '-threads', '1', ...codec, outputName];
};
