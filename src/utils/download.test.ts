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

  it('strips extensions from the original filename before reuse', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1700000000000);

    const result = generateFilename('resized', 'photo.backup.jpg', 'webp');
    expect(result).toBe('resized-photo-1700000000000.webp');

    vi.useRealTimers();
  });
});
