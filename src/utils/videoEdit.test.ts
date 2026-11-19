import { describe, expect, it } from 'vitest';
import { buildEditArgs, outputDuration, outputSize, type EditClip, type EditSettings } from './videoEdit';

const clip = (patch: Partial<EditClip> = {}): EditClip => ({
  inputName: 'in0.mp4',
  start: 1,
  end: 4,
  width: 1920,
  height: 1080,
  hasAudio: true,
  muted: false,
  volume: 1,
  ...patch,
});

const settings: EditSettings = {
  format: 'mp4',
  crf: 23,
  height: 0,
  fps: 30,
  speed: 1,
  rotate: 0,
  flip: false,
  fadeIn: 0,
  fadeOut: 0,
  removeAudio: false,
};

const graphOf = (args: string[]) => args[args.indexOf('-filter_complex') + 1];

describe('videoEdit', () => {
  it('computes output duration and size', () => {
    expect(outputDuration([clip(), clip({ start: 0, end: 2 })], 2)).toBe(2.5);
    expect(outputSize([clip()], { height: 720, rotate: 0 })).toEqual({ width: 1280, height: 720 });
    expect(outputSize([clip()], { height: 0, rotate: 90 })).toEqual({ width: 1080, height: 1920 });
    expect(outputSize([clip({ width: 641, height: 359 })], { height: 0, rotate: 0 })).toEqual({ width: 642, height: 360 });
  });

  it('trims every input and concatenates video with audio', () => {
    const args = buildEditArgs([clip(), clip({ inputName: 'in1.webm', start: 0, end: 2.5, hasAudio: false })], settings, 'out.mp4');
    expect(args.slice(0, 6)).toEqual(['-ss', '1', '-t', '3', '-i', 'in0.mp4']);
    const graph = graphOf(args);
    expect(graph).toContain('[0:a]aresample=48000');
    expect(graph).toContain('anullsrc=r=48000:cl=stereo,atrim=duration=2.5[a1]');
    expect(graph).toContain('[v0][a0][v1][a1]concat=n=2:v=1:a=1[vc][ac]');
    expect(args).toContain('libx264');
    expect(args.at(-1)).toBe('out.mp4');
  });

  it('drops the audio track when nothing is audible', () => {
    const args = buildEditArgs([clip({ muted: true })], settings, 'out.webm');
    expect(graphOf(args)).toContain('concat=n=1:v=1:a=0[vc]');
    expect(args).toContain('-an');
    expect(args).not.toContain('[aout]');
  });

  it('applies speed, rotation and fades after the concat', () => {
    const graph = graphOf(buildEditArgs([clip()], { ...settings, speed: 2, rotate: 90, flip: true, fadeIn: 1, fadeOut: 1 }, 'o.mp4'));
    expect(graph).toContain('[0:v]transpose=1,hflip,');
    expect(graph).toContain('[vc]setpts=PTS/2,fade=t=in:st=0:d=1,fade=t=out:st=0.5:d=1[vout]');
    expect(graph).toContain('[ac]atempo=2,afade=t=in:st=0:d=1,afade=t=out:st=0.5:d=1[aout]');
  });

  it('exports audio only without touching video', () => {
    const args = buildEditArgs([clip({ muted: true })], settings, 'o.mp3', true);
    const graph = graphOf(args);
    expect(graph).not.toContain(':v]');
    expect(graph).toContain('concat=n=1:v=0:a=1[ac]');
    expect(args).toContain('libmp3lame');
  });
});
