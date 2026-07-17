import { describe, it, expect } from 'vitest';
import { getFileExtension, validateFileExtension, validateFile } from './fileValidation';

const makeFile = (name: string, type: string, sizeBytes = 1024): File => {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
};

describe('getFileExtension', () => {
  it('extracts a lowercase extension', () => {
    expect(getFileExtension('Photo.JPG')).toBe('jpg');
  });

  it('returns the last extension for multi-dot filenames', () => {
    expect(getFileExtension('archive.tar.gz')).toBe('gz');
  });

  it('returns the whole lowercased name when there is no dot', () => {
    expect(getFileExtension('README')).toBe('readme');
  });
});

describe('validateFileExtension', () => {
  it('returns true when extension matches MIME type', () => {
    const file = makeFile('photo.jpg', 'image/jpeg');
    expect(validateFileExtension(file)).toBe(true);
  });

  it('returns false when extension does not match MIME type', () => {
    const file = makeFile('photo.jpg', 'video/mp4');
    expect(validateFileExtension(file)).toBe(false);
  });
});

describe('validateFile', () => {
  it('rejects an empty file by default', () => {
    const file = makeFile('empty.jpg', 'image/jpeg', 0);
    const result = validateFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/empty/i);
  });

  it('accepts an empty file when allowEmpty is set', () => {
    const file = makeFile('empty.jpg', 'image/jpeg', 0);
    const result = validateFile(file, { allowEmpty: true });
    expect(result.isValid).toBe(true);
  });

  it('rejects a file exceeding maxFileSize', () => {
    const file = makeFile('big.jpg', 'image/jpeg', 2000);
    const result = validateFile(file, { maxFileSize: 1000 });
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/exceeds maximum limit/i);
  });

  it('rejects a file whose MIME type is not in supportedFormats', () => {
    const file = makeFile('clip.mov', 'video/quicktime', 100);
    const result = validateFile(file, { supportedFormats: ['video/mp4', 'video/webm'] });
    expect(result.isValid).toBe(false);
  });

  it('accepts a file whose MIME type matches supportedFormats', () => {
    const file = makeFile('clip.mp4', 'video/mp4', 100);
    const result = validateFile(file, { supportedFormats: ['video/mp4', 'video/webm'] });
    expect(result.isValid).toBe(true);
    expect(result.fileInfo?.name).toBe('clip.mp4');
  });

  it('supports wildcard MIME patterns like video/*', () => {
    const file = makeFile('clip.webm', 'video/webm', 100);
    const result = validateFile(file, { supportedFormats: ['video/*'] });
    expect(result.isValid).toBe(true);
  });
});
