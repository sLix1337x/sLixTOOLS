import { describe, it, expect } from 'vitest';
import { getOptimalCompressionSettings } from './gifCompressor';

describe('getOptimalCompressionSettings', () => {
  it('uses the default quality for small files', () => {
    const settings = getOptimalCompressionSettings(1 * 1024 * 1024);
    expect(settings.quality).toBe(80);
    expect(settings.frameSkip).toBe(0);
    expect(settings.maxWidth).toBeUndefined();
    expect(settings.maxHeight).toBeUndefined();
  });

  it('lowers quality and caps dimensions above 5MB', () => {
    const settings = getOptimalCompressionSettings(6 * 1024 * 1024);
    expect(settings.quality).toBe(70);
    expect(settings.maxWidth).toBe(800);
    expect(settings.maxHeight).toBe(600);
  });

  it('drops quality further and skips frames above 10MB', () => {
    const settings = getOptimalCompressionSettings(11 * 1024 * 1024);
    expect(settings.quality).toBe(60);
    expect(settings.frameSkip).toBe(1);
    expect(settings.maxWidth).toBe(800);
  });

  it('uses a mid quality tier between 2MB and 5MB', () => {
    const settings = getOptimalCompressionSettings(3 * 1024 * 1024);
    expect(settings.quality).toBe(75);
    expect(settings.maxWidth).toBeUndefined();
  });
});
