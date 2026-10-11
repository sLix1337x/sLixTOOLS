import { describe, expect, it } from 'vitest';
import {
  buildPattern,
  collapseSpaces,
  countMatches,
  getTextStats,
  removeDuplicateLines,
  removeEmptyLines,
  removeLineBreaks,
  replaceMatches,
  reverseLines,
  sortLinesAsc,
  sortLinesDesc,
  splitWords,
  toAlternatingCase,
  toCamelCase,
  toCapitalizedCase,
  toConstantCase,
  toDotCase,
  toInverseCase,
  toKebabCase,
  toPascalCase,
  toPathCase,
  toSentenceCase,
  toSnakeCase,
  toTitleCase,
  toTrainCase,
  trimLines,
} from './convertCase';

describe('convertCase', () => {
  it('sentence case keeps domains/abbreviations and handles non-ASCII and line starts', () => {
    expect(toSentenceCase('VISIT EXAMPLE.COM, E.G. TODAY. élan vital!')).toBe(
      'Visit example.com, e.g. today. Élan vital!'
    );
    expect(toSentenceCase('first line\nsecond line')).toBe('First line\nSecond line');
    expect(toSentenceCase('  "quoted start')).toBe('  "Quoted start');
  });

  it('capitalized and title case leave ordinals and apostrophes alone', () => {
    expect(toCapitalizedCase("the 21st don't well-known élan")).toBe("The 21st Don't Well-Known Élan");
    expect(toTitleCase('the end of the 21st century')).toBe('The End of the 21st Century');
  });

  it('alternating/inverse case handle non-ASCII and alternate only over letters', () => {
    expect(toAlternatingCase('ab cd')).toBe('aB cD');
    expect(toAlternatingCase('éé')).toBe('éÉ');
    expect(toInverseCase('Élan 2X')).toBe('éLAN 2x');
  });
});

describe('developer cases', () => {
  it('splits separators, camel humps and acronyms', () => {
    expect(splitWords('XMLHttpRequest user_id-2 already.dotted/path')).toEqual([
      'XML', 'Http', 'Request', 'user', 'id', '2', 'already', 'dotted', 'path',
    ]);
  });

  it('converts each line separately', () => {
    const src = 'Hello World\nuserId';
    expect(toCamelCase(src)).toBe('helloWorld\nuserId');
    expect(toPascalCase(src)).toBe('HelloWorld\nUserId');
    expect(toSnakeCase(src)).toBe('hello_world\nuser_id');
    expect(toKebabCase(src)).toBe('hello-world\nuser-id');
    expect(toConstantCase(src)).toBe('HELLO_WORLD\nUSER_ID');
    expect(toDotCase(src)).toBe('hello.world\nuser.id');
    expect(toPathCase(src)).toBe('hello/world\nuser/id');
    expect(toTrainCase(src)).toBe('Hello-World\nUser-Id');
  });
});

describe('cleanup', () => {
  it('handles whitespace, lines and sorting', () => {
    expect(trimLines('  a  \r\n b')).toBe('a\nb');
    expect(collapseSpaces('a  \t b\n\nc')).toBe('a b\n\nc');
    expect(removeLineBreaks('a\n\n b \nc')).toBe('a b c');
    expect(removeEmptyLines('a\n \nb\n')).toBe('a\nb');
    expect(removeDuplicateLines('a\nb\na')).toBe('a\nb');
    expect(sortLinesAsc('item10\nItem2\nitem1')).toBe('item1\nItem2\nitem10');
    expect(sortLinesDesc('a\nc\nb')).toBe('c\nb\na');
    expect(reverseLines('1\n2\n3')).toBe('3\n2\n1');
  });
});

describe('find & replace', () => {
  it('escapes plain text, respects case and rejects bad regex', () => {
    const plain = buildPattern('a.b', { matchCase: false, useRegex: false });
    expect(countMatches('A.B axb a.b', plain)).toBe(2);
    expect(replaceMatches('A.B axb', plain, '$&!', false)).toBe('$&! axb');
    expect(countMatches('Aa', buildPattern('a', { matchCase: true, useRegex: false }))).toBe(1);
    const re = buildPattern('^(\\w+)', { matchCase: true, useRegex: true });
    expect(replaceMatches('foo bar\nbaz', re, '<$1>', true)).toBe('<foo> bar\n<baz>');
    expect(() => buildPattern('(', { matchCase: true, useRegex: true })).toThrow(SyntaxError);
  });
});

describe('getTextStats', () => {
  it('counts words, sentences, paragraphs and code points', () => {
    const s = getTextStats('Hi there. How are you?\n\nNew para 😀');
    expect(s).toMatchObject({ words: 8, sentences: 3, paragraphs: 2, lines: 3, characters: 34 });
    expect(getTextStats('')).toMatchObject({ words: 0, sentences: 0, paragraphs: 0, lines: 0, characters: 0 });
  });
});
