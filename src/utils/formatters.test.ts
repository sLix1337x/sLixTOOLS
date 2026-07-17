import { describe, it, expect } from 'vitest';
import {
  formatFileSize,
  formatDuration,
  formatDurationLong,
  formatPercentage,
  bytesToMB,
  formatFileSizeMB,
  formatCompressionRatio,
} from './formatters';

describe('formatFileSize', () => {
  it('returns "0 Bytes" for zero', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
  });

  it('formats bytes below 1KB', () => {
    expect(formatFileSize(512)).toBe('512 Bytes');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });

  it('clamps negative input to 0', () => {
    expect(formatFileSize(-100)).toBe('0 Bytes');
  });

  it('treats NaN as 0', () => {
    expect(formatFileSize(NaN)).toBe('0 Bytes');
  });
});

describe('formatDuration', () => {
  it('formats seconds under a minute', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats minutes and seconds with zero-padding', () => {
    expect(formatDuration(150)).toBe('2:30');
  });

  it('clamps negative input to 0:00', () => {
    expect(formatDuration(-5)).toBe('0:00');
  });
});

describe('formatDurationLong', () => {
  it('formats seconds only', () => {
    expect(formatDurationLong(30)).toBe('30s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDurationLong(150)).toBe('2m 30s');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatDurationLong(3725)).toBe('1h 2m 5s');
  });

  it('omits zero seconds when hours/minutes present', () => {
    expect(formatDurationLong(3600)).toBe('1h');
  });

  it('returns "0s" for zero', () => {
    expect(formatDurationLong(0)).toBe('0s');
  });
});

describe('formatPercentage', () => {
  it('formats with default 1 decimal', () => {
    expect(formatPercentage(85.456)).toBe('85.5%');
  });

  it('formats with custom decimals', () => {
    expect(formatPercentage(85.456, 2)).toBe('85.46%');
  });
});

describe('bytesToMB', () => {
  it('converts bytes to megabytes', () => {
    expect(bytesToMB(1024 * 1024)).toBe(1);
  });
});

describe('formatFileSizeMB', () => {
  it('formats with default 2 decimals', () => {
    expect(formatFileSizeMB(1024 * 1024 * 1.5)).toBe('1.50 MB');
  });
});

describe('formatCompressionRatio', () => {
  it('returns a no-data message when original size is 0', () => {
    expect(formatCompressionRatio(0, 0)).toBe('No compression data');
  });

  it('describes the reduction and both sizes', () => {
    const result = formatCompressionRatio(2 * 1024 * 1024, 1 * 1024 * 1024);
    expect(result).toContain('50.0%');
    expect(result).toContain('2 MB');
    expect(result).toContain('1 MB');
  });
});
