import { describe, it, expect } from 'vitest';
import { dataURItoBlob, blobToDataURI } from './dataConversion';

describe('dataURItoBlob', () => {
  it('converts a base64 data URI to a Blob with the correct MIME type', () => {
    const dataURI = 'data:text/plain;base64,SGVsbG8gV29ybGQ=';
    const blob = dataURItoBlob(dataURI);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/plain');
    expect(blob.size).toBe('Hello World'.length);
  });
});

describe('blobToDataURI', () => {
  it('converts a Blob back to a base64 data URI', async () => {
    const blob = new Blob(['Hello World'], { type: 'text/plain' });
    const dataUri = await blobToDataURI(blob);

    expect(dataUri).toMatch(/^data:text\/plain;base64,/);
    expect(dataUri).toContain('SGVsbG8gV29ybGQ=');
  });

  it('round-trips through dataURItoBlob', async () => {
    const original = new Blob(['round trip test'], { type: 'text/plain' });
    const dataUri = await blobToDataURI(original);
    const roundTripped = dataURItoBlob(dataUri);

    expect(roundTripped.type).toBe('text/plain');
    expect(roundTripped.size).toBe(original.size);
  });
});
