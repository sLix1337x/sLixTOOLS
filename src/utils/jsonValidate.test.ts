import { describe, it, expect } from 'vitest';
import { validateJson, parseErrorLocation, formatJson, minifyJson } from './jsonValidate';

describe('validateJson', () => {
  it('returns empty for blank input', () => {
    expect(validateJson('')).toEqual({ status: 'empty' });
    expect(validateJson('  \n\t')).toEqual({ status: 'empty' });
  });

  it('accepts valid JSON and reports stats', () => {
    const r = validateJson('{"a":[1,2,{"b":"é"}],"c":null}');
    expect(r.status).toBe('valid');
    if (r.status !== 'valid') return;
    expect(r.stats).toEqual({ bytes: 31, depth: 3, keys: 3, elements: 3 });
    expect(validateJson('42')).toMatchObject({ status: 'valid', stats: { depth: 0, keys: 0, elements: 0 } });
  });

  it('reports invalid JSON with a location from the real engine', () => {
    const r = validateJson('{\n  "a": 1,\n}');
    expect(r.status).toBe('invalid');
    if (r.status !== 'invalid') return;
    expect(r.message).toBeTruthy();
    expect(r.location).toMatchObject({ line: 3, column: 1 });
  });
});

describe('parseErrorLocation', () => {
  const text = '{\n  "a": 1,\n  x\n}';

  it('reads V8 "at position N"', () => {
    expect(parseErrorLocation('Unexpected token x in JSON at position 14', text)).toEqual({
      line: 3,
      column: 3,
      offset: 14,
    });
  });

  it('reads Firefox "line X column Y"', () => {
    expect(
      parseErrorLocation("JSON.parse: expected double-quoted property name at line 3 column 3 of the JSON data", text)
    ).toEqual({ line: 3, column: 3, offset: 14 });
  });

  it('maps end-of-input to the end of the text', () => {
    expect(parseErrorLocation('Unexpected end of JSON input', '[1,')).toEqual({ line: 1, column: 4, offset: 3 });
  });

  it('returns null when the message has no position', () => {
    expect(parseErrorLocation('JSON Parse error: Unexpected identifier "x"', text)).toBeNull();
  });
});

describe('formatJson / minifyJson', () => {
  const src = '{"b":1,"a":{"d":[1,2],"c":true}}';

  it('pretty-prints with 2, 4 spaces or tab', () => {
    expect(formatJson('{"a":[1]}', 2)).toBe('{\n  "a": [\n    1\n  ]\n}');
    expect(formatJson('{"a":1}', 4)).toBe('{\n    "a": 1\n}');
    expect(formatJson('{"a":1}', '\t')).toBe('{\n\t"a": 1\n}');
  });

  it('minifies', () => {
    expect(minifyJson('{\n  "a": [ 1, 2 ]\n}')).toBe('{"a":[1,2]}');
  });

  it('sorts keys recursively when asked', () => {
    expect(minifyJson(src, true)).toBe('{"a":{"c":true,"d":[1,2]},"b":1}');
    expect(minifyJson(src)).toBe(src);
  });

  it('throws on invalid JSON', () => {
    expect(() => formatJson('{a:1}')).toThrow();
  });
});
