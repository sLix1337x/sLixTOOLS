/**
 * Batch rename rules for the File Renamer. Pure functions: the page feeds in file names and
 * rules, gets the new names, their problems and an ordered list of safe rename steps back.
 */

export type CaseStyle = 'keep' | 'snake' | 'kebab' | 'lower' | 'upper' | 'title' | 'camel' | 'pascal';
export type ExtMode = 'keep' | 'lower' | 'upper' | 'set';
export type NumberScope = 'name' | 'all';

export interface Replacement {
  find: string;
  replace: string;
}

export interface RenameRules {
  removeOn: boolean;
  removeWords: string[];
  removeRegex: boolean;
  replaceOn: boolean;
  replacements: Replacement[];
  replaceRegex: boolean;
  /** Turns separators into one, drops invalid characters and trims the ends */
  cleanupOn: boolean;
  separator: string;
  splitCamel: boolean;
  caseStyle: CaseStyle;
  /** Tokens: {name} {original} {folder} {date} {n} */
  template: string;
  numberOn: boolean;
  numberStart: number;
  numberPad: number;
  numberStep: number;
  numberSeparator: string;
  /** 'name': every distinct name counts from the start; 'all': one counter for the whole list */
  numberScope: NumberScope;
  /** Continue after the highest number already taken by an excluded file */
  numberContinue: boolean;
  extMode: ExtMode;
  extValue: string;
}

export const DEFAULT_RULES: RenameRules = {
  removeOn: true,
  removeWords: [],
  removeRegex: false,
  replaceOn: false,
  replacements: [{ find: '', replace: '' }],
  replaceRegex: false,
  cleanupOn: true,
  separator: '_',
  splitCamel: true,
  caseStyle: 'snake',
  template: '{name}',
  numberOn: true,
  numberStart: 1,
  numberPad: 3,
  numberStep: 1,
  numberSeparator: '_',
  numberScope: 'name',
  numberContinue: true,
  extMode: 'lower',
  extValue: '',
};

export interface RenameItem {
  name: string;
  /** Parent folder name, for {folder} */
  folder?: string | undefined;
  lastModified?: number | undefined;
}

/** Characters Windows (and so most sync tools) refuse in file names */
// eslint-disable-next-line no-control-regex -- control characters are exactly what is banned
const INVALID = /[<>:"/\\|?*\u0000-\u001f]/g;
const RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
/** Marks where the number goes while the rest of the name is transformed (private use, never in real names) */
const NUM = '';
const SPLIT = /[\s_\-.,+()[\]{}]+/u;
const MAX_NAME = 255;

export const splitExt = (name: string): [string, string] => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? [name.slice(0, dot), name.slice(dot + 1)] : [name, ''];
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** null when the pattern does not compile */
export const safeRegex = (source: string, isRegex: boolean, flags = 'gi'): RegExp | null => {
  try {
    return new RegExp(isRegex ? source : escapeRegex(source), flags);
  } catch {
    return null;
  }
};

const words = (s: string, camel: boolean) => {
  let t = s.replace(INVALID, ' ');
  if (camel) {
    // doorOpen -> door Open, DOORSwng -> DOOR Swng
    t = t.replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2').replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2');
  }
  return t.split(SPLIT).filter(Boolean);
};

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

const applyCase = (s: string, r: RenameRules): string => {
  const tokenize = r.cleanupOn || ['snake', 'kebab', 'title', 'camel', 'pascal'].includes(r.caseStyle);
  if (!tokenize) {
    if (r.caseStyle === 'lower') return s.toLowerCase();
    if (r.caseStyle === 'upper') return s.toUpperCase();
    return s;
  }
  const w = words(s, r.cleanupOn && r.splitCamel);
  const sep = r.cleanupOn ? r.separator : ' ';
  switch (r.caseStyle) {
    case 'snake': return w.join('_').toLowerCase();
    case 'kebab': return w.join('-').toLowerCase();
    case 'camel': return w.map((x, i) => (i === 0 ? x.toLowerCase() : cap(x))).join('');
    case 'pascal': return w.map(cap).join('');
    case 'title': return w.map(cap).join(sep);
    case 'lower': return w.join(sep).toLowerCase();
    case 'upper': return w.join(sep).toUpperCase();
    default: return w.join(sep);
  }
};

const isoDate = (ms: number | undefined) => (ms ? new Date(ms).toISOString().slice(0, 10) : '');

/** New base name with NUM where the number goes (when numbering is on), plus the new extension. */
const draft = (item: RenameItem, r: RenameRules): [string, string] => {
  const [base, ext] = splitExt(item.name);
  let name = base;
  if (r.removeOn) {
    for (const word of r.removeWords) {
      const re = word.trim() ? safeRegex(word.trim(), r.removeRegex) : null;
      // A space keeps the neighbours apart for cleanup; without cleanup it would stay in the name
      if (re) name = name.replace(re, r.cleanupOn ? ' ' : '');
    }
  }
  if (r.replaceOn) {
    for (const { find, replace } of r.replacements) {
      const re = find ? safeRegex(find, r.replaceRegex) : null;
      // Literal mode must not expand $1 and friends in the replacement
      if (re) name = r.replaceRegex ? name.replace(re, replace) : name.replace(re, () => replace);
    }
  }
  const hasSlot = r.template.includes('{n}');
  const tokens: Record<string, string> = {
    name,
    original: base,
    folder: item.folder ?? '',
    date: isoDate(item.lastModified),
    // Spaces make the slot its own word, so the case style puts its separator around it
    n: r.numberOn ? ` ${NUM} ` : ' ',
  };
  // Function replacer: file names may contain $ patterns
  name = r.template.replace(/\{(name|original|folder|date|n)\}/g, (_, key: string) => tokens[key] ?? '');
  name = applyCase(name, r).trim();
  if (r.numberOn) {
    name = hasSlot
      ? name.replace(new RegExp(`\\s*${NUM}\\s*`, 'g'), NUM)
      : name ? `${name}${r.numberSeparator}${NUM}` : NUM;
  }
  const newExt =
    r.extMode === 'lower' ? ext.toLowerCase()
    : r.extMode === 'upper' ? ext.toUpperCase()
    : r.extMode === 'set' ? r.extValue.trim().replace(/^\.+/, '')
    : ext;
  return [name, newExt];
};

const pad = (n: number, width: number) => String(n).padStart(Math.max(1, width), '0');

/**
 * New names for `items` in list order (the order sets the numbers). `taken` are names that stay as
 * they are (excluded files); numbering continues after the highest number they already use.
 */
export const computeNames = (items: RenameItem[], r: RenameRules, taken: string[] = []): string[] => {
  const drafts = items.map((item) => draft(item, r));
  if (!r.numberOn) return drafts.map(([name, ext]) => (ext ? `${name}.${ext}` : name));

  const step = r.numberStep > 0 ? r.numberStep : 1;
  const takenBases = taken.map((t) => splitExt(t)[0]);
  const highestTaken = (key: string) => {
    const [before, after = ''] = key.split(NUM);
    const re = new RegExp(`^${escapeRegex(before ?? '')}(\\d+)${escapeRegex(after)}$`, 'i');
    let max = -Infinity;
    for (const t of takenBases) {
      const m = re.exec(t);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return max;
  };
  const firstNumber = (keys: string[]) => {
    if (!r.numberContinue) return r.numberStart;
    const max = Math.max(...keys.map(highestTaken));
    return Number.isFinite(max) && max >= r.numberStart ? max + step : r.numberStart;
  };

  const counters = new Map<string, number>();
  const allStart = r.numberScope === 'all' ? firstNumber([...new Set(drafts.map(([n]) => n))]) : 0;
  let all = allStart;
  return drafts.map(([name, ext]) => {
    let n: number;
    if (r.numberScope === 'all') {
      n = all;
      all += step;
    } else {
      const key = name.toLowerCase();
      n = counters.get(key) ?? firstNumber([name]);
      counters.set(key, n + step);
    }
    const final = name.split(NUM).join(pad(n, r.numberPad));
    return ext ? `${final}.${ext}` : final;
  });
};

export type NameIssue = 'empty' | 'invalid' | 'reserved' | 'trailing' | 'long' | 'duplicate' | 'taken';

export const ISSUE_TEXT: Record<NameIssue, string> = {
  empty: 'Name is empty',
  invalid: 'Contains a character Windows does not allow (< > : " / \\ | ? *)',
  reserved: 'Reserved name on Windows (CON, NUL, COM1 ...)',
  trailing: 'Ends with a dot or space',
  long: `Longer than ${MAX_NAME} characters`,
  duplicate: 'Another file gets the same name',
  taken: 'An excluded file already has this name',
};

export const nameIssue = (name: string): NameIssue | null => {
  if (!name.trim()) return 'empty';
  if (new RegExp(INVALID.source).test(name)) return 'invalid';
  if (RESERVED.test(splitExt(name)[0])) return 'reserved';
  if (/[. ]$/.test(name)) return 'trailing';
  if (name.length > MAX_NAME) return 'long';
  return null;
};

/** Problems per new name; duplicates are case-insensitive like Windows and macOS. */
export const findIssues = (names: string[], taken: string[] = []): (NameIssue | null)[] => {
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n.toLowerCase(), (counts.get(n.toLowerCase()) ?? 0) + 1);
  const takenSet = new Set(taken.map((t) => t.toLowerCase()));
  return names.map((n) => {
    const own = nameIssue(n);
    if (own) return own;
    if (takenSet.has(n.toLowerCase())) return 'taken';
    return (counts.get(n.toLowerCase()) ?? 0) > 1 ? 'duplicate' : null;
  });
};

export interface RenameStep {
  from: string;
  to: string;
}

/**
 * Orders renames so none overwrites another file of the batch: a file whose target is still the
 * current name of another renamed file (swaps, renumbering) or that only changes case (Windows
 * treats that as the same name) goes through a temporary name first.
 */
export const planRenames = (pairs: RenameStep[]): RenameStep[] => {
  const changed = pairs.filter((p) => p.from !== p.to);
  const current = new Set(changed.map((p) => p.from.toLowerCase()));
  const viaTemp = (p: RenameStep) =>
    p.from.toLowerCase() === p.to.toLowerCase() || current.has(p.to.toLowerCase());
  const temps = changed.filter(viaTemp).map((p, i) => ({ ...p, temp: `${p.from}.renaming-${i}` }));
  return [
    ...temps.map((p) => ({ from: p.from, to: p.temp })),
    ...changed.filter((p) => !viaTemp(p)),
    ...temps.map((p) => ({ from: p.temp, to: p.to })),
  ];
};

const psQuote = (s: string) => `'${s.replace(/'/g, "''")}'`;
const shQuote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/** Commands to run inside the folder that holds the files. */
export const renameScript = (steps: RenameStep[], shell: 'powershell' | 'bash'): string =>
  shell === 'powershell'
    ? [
        '# Run in PowerShell inside the folder with the files',
        ...steps.map((s) => `Rename-Item -LiteralPath ${psQuote(s.from)} -NewName ${psQuote(s.to)}`),
      ].join('\n')
    : [
        '# Run in a terminal inside the folder with the files',
        ...steps.map((s) => `mv -n -- ${shQuote(s.from)} ${shQuote(s.to)}`),
      ].join('\n');
