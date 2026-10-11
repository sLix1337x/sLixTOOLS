import { describe, it, expect, vi } from 'vitest';
import { generateFilename } from './download';

describe('generateFilename', () => {
  it('builds a filename from prefix, base name, and extension', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1700000000000);

    const result = generateFilename('compressed', 'my-video.mp4', 'gif');
    expect(result).toBe('compressed-my-video-1700000000000.gif');

    vi.useRealTimers();
  });

  it('falls back to "file" when no original filename is given', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1700000000000);

    const result = generateFilename('converted', undefined, 'png');
    expect(result).toBe('converted-file-1700000000000.png');

    vi.useRealTimers();
  });

  it('strips only the last extension from the original filename', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1700000000000);

    const result = generateFilename('resized', 'my.photo.v2.jpg', 'webp');
    expect(result).toBe('resized-my.photo.v2-1700000000000.webp');

    vi.useRealTimers();
  });
});
