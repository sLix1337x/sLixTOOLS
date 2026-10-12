export type JsonIndent = 2 | 4 | '\t';

export interface JsonStats {
  bytes: number;
  depth: number;
  keys: number;
  elements: number;
}

export interface JsonErrorLocation {
  line: number; // 1-based
  column: number; // 1-based
  offset: number; // 0-based index into the text
}

export type JsonResult =
  | { status: 'empty' }
  | { status: 'valid'; value: unknown; stats: JsonStats }
  | { status: 'invalid'; message: string; location: JsonErrorLocation | null };

const offsetToLineCol = (text: string, offset: number): JsonErrorLocation => {
  const before = text.slice(0, offset);
  const line = before.split('\n').length;
  return { line, column: offset - before.lastIndexOf('\n'), offset };
};

/**
 * Pulls the error location out of a JSON.parse message.
 * Firefox: "... at line 2 column 5 of the JSON data"; V8: "... at position 12 (line 2 column 5)".
 * Safari and V8's "Unexpected token 'x', ... is not valid JSON" carry no position -> null.
 */
export function parseErrorLocation(message: string, text: string): JsonErrorLocation | null {
  const lc = message.match(/line (\d+) column (\d+)/);
  if (lc) {
    const line = Number(lc[1]);
    const column = Number(lc[2]);
    let offset = 0;
    for (let i = 1; i < line; i++) offset = text.indexOf('\n', offset) + 1;
    return { line, column, offset: Math.min(offset + column - 1, text.length) };
  }
  const pos = message.match(/position (\d+)/);
  if (pos) return offsetToLineCol(text, Math.min(Number(pos[1]), text.length));
  if (/end of (JSON )?(input|data)/i.test(message)) return offsetToLineCol(text, text.length);
  return null;
}

export function jsonStats(value: unknown, text: string): JsonStats {
  const stats: JsonStats = { bytes: new TextEncoder().encode(text).length, depth: 0, keys: 0, elements: 0 };
  // Explicit stack: deeply nested input must not blow the call stack.
  const stack: Array<[unknown, number]> = [[value, 0]];
  while (stack.length) {
    const [v, d] = stack.pop()!;
    if (v === null || typeof v !== 'object') continue;
    stats.depth = Math.max(stats.depth, d + 1);
    const children = Array.isArray(v) ? v : Object.values(v);
    if (Array.isArray(v)) stats.elements += v.length;
    else stats.keys += children.length;
    for (const c of children) stack.push([c, d + 1]);
  }
  return stats;
}

export function validateJson(text: string): JsonResult {
  if (!text.trim()) return { status: 'empty' };
  try {
    const value: unknown = JSON.parse(text);
    return { status: 'valid', value, stats: jsonStats(value, text) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { status: 'invalid', message, location: parseErrorLocation(message, text) };
  }
}

// ponytail: integer-like keys ("1", "2") are always enumerated first by JS objects, so they sort numerically ahead of other keys.
const sortKeysDeep = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (v === null || typeof v !== 'object') return v;
  return Object.fromEntries(
    Object.keys(v)
      .sort()
      .map((k) => [k, sortKeysDeep((v as Record<string, unknown>)[k])])
  );
};

// ponytail: goes through JSON.parse, so numbers beyond 2^53 lose precision and 1.0 becomes 1.
/** Pretty-prints JSON text. Throws if the text is not valid JSON. */
export function formatJson(text: string, indent: JsonIndent = 2, sortKeys = false): string {
  const value: unknown = JSON.parse(text);
  return JSON.stringify(sortKeys ? sortKeysDeep(value) : value, null, indent);
}

/** Minifies JSON text. Throws if the text is not valid JSON. */
export function minifyJson(text: string, sortKeys = false): string {
  const value: unknown = JSON.parse(text);
  return JSON.stringify(sortKeys ? sortKeysDeep(value) : value);
}
