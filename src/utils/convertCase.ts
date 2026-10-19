/** Words left lowercase in Title Case (unless first or last word) */
const TITLE_MINOR_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor',
  'of', 'on', 'or', 'per', 'the', 'to', 'v', 'via', 'vs', 'with'
]);

/** Capitalize the first letter of a word (after leading punctuation / hyphens),
 *  leaving letters that follow a letter, digit, apostrophe or dot untouched
 *  ("don't" -> "Don't", "21st" -> "21st", "example.com" -> "Example.com"). */
const capitalizeWord = (word: string): string =>
  word.replace(/(^|[^\p{L}\p{N}'’.])(\p{L})/gu, (_m, pre: string, ch: string) => pre + ch.toUpperCase());

/** A character with distinct upper/lower forms (works for non-ASCII letters). */
const isCased = (ch: string): boolean => ch.toUpperCase() !== ch.toLowerCase();

/** Capitalizes the start of the text, each line, and each sentence; "e.g." / "i.e." do not end a sentence. */
export const toSentenceCase = (text: string): string =>
  text
    .toLowerCase()
    .replace(
      /(^|(?:(?<!\.\p{L})\.|[!?])\s+|\n)([\s"'“‘(]*)(\p{L})/gu,
      (_m, prefix: string, lead: string, letter: string) => prefix + lead + letter.toUpperCase()
    );

export const toCapitalizedCase = (text: string): string =>
  text
    .toLowerCase()
    .split(/(\s+)/)
    .map((token) => (token.trim() === '' ? token : capitalizeWord(token)))
    .join('');

export const toAlternatingCase = (text: string): string => {
  let letterIndex = 0;
  return Array.from(text)
    .map((ch) => {
      if (!isCased(ch)) return ch;
      return letterIndex++ % 2 === 0 ? ch.toLowerCase() : ch.toUpperCase();
    })
    .join('');
};

export const toTitleCase = (text: string): string => {
  const tokens = text.toLowerCase().split(/(\s+)/);
  const wordTotal = tokens.filter((t) => t.trim() !== '').length;
  let seen = 0;
  return tokens
    .map((token) => {
      if (token.trim() === '') return token;
      seen += 1;
      const isFirst = seen === 1;
      const isLast = seen === wordTotal;
      const core = token.replace(/[^\p{L}]/gu, '');
      if (!isFirst && !isLast && TITLE_MINOR_WORDS.has(core)) return token;
      return capitalizeWord(token);
    })
    .join('');
};

export const toInverseCase = (text: string): string =>
  Array.from(text)
    .map((ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase()))
    .join('');

// Developer cases, applied per line so a list of identifiers converts line by line.

/** Splits an identifier or phrase into words at separators, camelCase humps and acronym
 *  boundaries ("XMLHttpRequest" -> XML, Http, Request; "user_id-2" -> user, id, 2). */
export const splitWords = (text: string): string[] =>
  text
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
const lower = (word: string) => word.toLowerCase();

const perLine = (join: (words: string[]) => string) => (text: string) =>
  text
    .split('\n')
    .map((line) => join(splitWords(line)))
    .join('\n');

export const toCamelCase = perLine((w) => w.map((x, i) => (i === 0 ? lower(x) : cap(x))).join(''));
export const toPascalCase = perLine((w) => w.map(cap).join(''));
export const toSnakeCase = perLine((w) => w.map(lower).join('_'));
export const toKebabCase = perLine((w) => w.map(lower).join('-'));
export const toConstantCase = perLine((w) => w.map((x) => x.toUpperCase()).join('_'));
export const toDotCase = perLine((w) => w.map(lower).join('.'));
export const toPathCase = perLine((w) => w.map(lower).join('/'));
export const toTrainCase = perLine((w) => w.map(cap).join('-'));

// Cleanup (line endings normalised to \n).

const toLines = (text: string) => text.replace(/\r\n?/g, '\n').split('\n');
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export const trimLines = (text: string) => toLines(text).map((l) => l.trim()).join('\n');
export const collapseSpaces = (text: string) => text.replace(/[^\S\r\n]+/g, ' ');
export const removeLineBreaks = (text: string) =>
  toLines(text)
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ');
export const removeEmptyLines = (text: string) =>
  toLines(text)
    .filter((l) => l.trim() !== '')
    .join('\n');
export const removeDuplicateLines = (text: string) => [...new Set(toLines(text))].join('\n');
export const sortLinesAsc = (text: string) => toLines(text).sort(collator.compare).join('\n');
export const sortLinesDesc = (text: string) =>
  toLines(text)
    .sort((a, b) => collator.compare(b, a))
    .join('\n');
export const reverseLines = (text: string) => toLines(text).reverse().join('\n');

// Find & replace

export interface FindOptions {
  matchCase: boolean;
  useRegex: boolean;
}

/** Global, multiline search pattern (^/$ match per line); throws SyntaxError for an invalid regex. */
export const buildPattern = (find: string, { matchCase, useRegex }: FindOptions): RegExp => {
  const source = useRegex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const flags = matchCase ? 'gm' : 'gim';
  try {
    return new RegExp(source, flags + 'u');
  } catch {
    // Unicode mode rejects identity escapes like \- that plain mode accepts
    return new RegExp(source, flags);
  }
};

export const countMatches = (text: string, pattern: RegExp): number => Array.from(text.matchAll(pattern)).length;

/** Regex mode supports $1-style references; plain mode inserts the replacement literally. */
export const replaceMatches = (text: string, pattern: RegExp, replacement: string, useRegex: boolean) =>
  useRegex ? text.replace(pattern, replacement) : text.replace(pattern, () => replacement);

// Statistics

export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  readingMinutes: number;
}

/** Characters are counted as code points, so emoji and non-BMP letters count once. */
export const getTextStats = (text: string): TextStats => {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  return {
    characters: Array.from(text).length,
    charactersNoSpaces: Array.from(text.replace(/\s/g, '')).length,
    words,
    sentences: trimmed.split(/[.!?…]+(?=\s|$)/).filter((s) => /[\p{L}\p{N}]/u.test(s)).length,
    paragraphs: trimmed.split(/\n\s*\n/).filter((p) => p.trim()).length,
    lines: text ? toLines(text).length : 0,
    readingMinutes: words / 200, // ~200 words per minute
  };
};
