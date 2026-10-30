import { useState, useCallback, useDeferredValue, useEffect, useMemo, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { toast } from 'sonner';
import {
  Type,
  Copy,
  Trash2,
  Check,
  CaseSensitive,
  Undo2,
  Redo2,
  Download,
  Replace,
  Regex,
  ArrowDownAZ,
  ArrowDownZA,
  ArrowDownUp,
  ListX,
  ListMinus,
  WrapText,
  Space,
  ScissorsLineDashed,
  Code2,
  Keyboard,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip } from '@/components/ui/tooltip';
import ToolPageLayout from '@/components/ToolPageLayout';
import { ToolbarDivider } from '@/components/tools/ToolBar';
import { useHistory } from '@/hooks';
import {
  chipButton,
  fieldClass,
  guideCard,
  guideHeading,
  guideKey,
  primaryButton,
  sectionLabel,
  settingsGrid,
  statusRow,
  toolButton,
  toolWorkspace,
  toolbarRow,
} from '@/styles/constants';
import { copyToClipboard } from '@/utils/clipboard';
import { downloadBlob } from '@/utils/download';
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
} from '@/utils/convertCase';

interface CaseDef {
  abbr: string;
  label: string;
  convert: (text: string) => string;
  /** Tailwind classes for the abbreviation badge (box background + letter colour). */
  badge: string;
}

const TEXT_CASES: CaseDef[] = [
  { abbr: 'Sc', label: 'Sentence case', convert: toSentenceCase, badge: 'border-sky-400/40 bg-sky-400/15 text-sky-300' },
  { abbr: 'lc', label: 'lower case', convert: (t) => t.toLowerCase(), badge: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300' },
  { abbr: 'UC', label: 'UPPER CASE', convert: (t) => t.toUpperCase(), badge: 'border-rose-400/40 bg-rose-400/15 text-rose-300' },
  { abbr: 'CC', label: 'Capitalized Case', convert: toCapitalizedCase, badge: 'border-amber-400/40 bg-amber-400/15 text-amber-300' },
  { abbr: 'TC', label: 'Title Case', convert: toTitleCase, badge: 'border-violet-400/40 bg-violet-400/15 text-violet-300' },
  { abbr: 'aC', label: 'aLtErNaTiNg cAsE', convert: toAlternatingCase, badge: 'border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-300' },
  { abbr: 'iC', label: 'InVeRsE CaSe', convert: toInverseCase, badge: 'border-cyan-400/40 bg-cyan-400/15 text-cyan-300' },
];

const DEV_CASES: CaseDef[] = [
  { abbr: 'cC', label: 'camelCase', convert: toCamelCase, badge: 'border-teal-400/40 bg-teal-400/15 text-teal-300' },
  { abbr: 'PC', label: 'PascalCase', convert: toPascalCase, badge: 'border-indigo-400/40 bg-indigo-400/15 text-indigo-300' },
  { abbr: 's_c', label: 'snake_case', convert: toSnakeCase, badge: 'border-lime-400/40 bg-lime-400/15 text-lime-300' },
  { abbr: 'k-c', label: 'kebab-case', convert: toKebabCase, badge: 'border-orange-400/40 bg-orange-400/15 text-orange-300' },
  { abbr: 'C_C', label: 'CONSTANT_CASE', convert: toConstantCase, badge: 'border-red-400/40 bg-red-400/15 text-red-300' },
  { abbr: 'd.c', label: 'dot.case', convert: toDotCase, badge: 'border-purple-400/40 bg-purple-400/15 text-purple-300' },
  { abbr: 'p/c', label: 'path/case', convert: toPathCase, badge: 'border-blue-400/40 bg-blue-400/15 text-blue-300' },
  { abbr: 'T-C', label: 'Train-Case', convert: toTrainCase, badge: 'border-pink-400/40 bg-pink-400/15 text-pink-300' },
];

const CLEANUP_ACTIONS: { label: string; icon: LucideIcon; run: (text: string) => string }[] = [
  { label: 'Trim lines', icon: ScissorsLineDashed, run: trimLines },
  { label: 'Collapse spaces', icon: Space, run: collapseSpaces },
  { label: 'Join lines', icon: WrapText, run: removeLineBreaks },
  { label: 'Remove empty lines', icon: ListMinus, run: removeEmptyLines },
  { label: 'Remove duplicates', icon: ListX, run: removeDuplicateLines },
  { label: 'Sort A–Z', icon: ArrowDownAZ, run: sortLinesAsc },
  { label: 'Sort Z–A', icon: ArrowDownZA, run: sortLinesDesc },
  { label: 'Reverse lines', icon: ArrowDownUp, run: reverseLines },
];

const guideItem = (term: string, desc: string) => (
  <li key={term} className="flex gap-2.5">
    <Check className="h-3.5 w-3.5 text-blue-400 mt-1 flex-shrink-0" aria-hidden="true" />
    <span><strong>{term}</strong> {desc}</span>
  </li>
);

const seoContent = (
  <div className="max-w-6xl mx-auto px-4 space-y-6">
    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
        <CaseSensitive className="h-5 w-5" aria-hidden="true" />
      </span>
      How to Convert Text Case
    </h2>
    <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        ['Paste your text', 'Type or paste into the editor. A list with one name per line works too.'],
        ['Clean it up', 'Trim lines, drop duplicates or empty lines, and sort the list if you need to.'],
        ['Pick a case', 'One click rewrites the whole text. Each step can be undone, so you can try several.'],
        ['Copy or download', 'Copy the result to your clipboard or save it as a .txt file.'],
      ].map(([title, text], i) => (
        <li key={title} className={guideCard}>
          <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-sky-400/15 text-sm font-semibold text-sky-300">
            {i + 1}
          </span>
          <h3 className="mt-0 text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-300">{text}</p>
        </li>
      ))}
    </ol>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Code2 className="h-5 w-5" aria-hidden="true" />
          Which Developer Case Goes Where?
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('camelCase:', 'variables in JavaScript and Java, JSON keys.')}
          {guideItem('PascalCase:', 'classes, types and React components.')}
          {guideItem('snake_case:', 'Python names and database columns.')}
          {guideItem('kebab-case:', 'CSS classes, URLs and file names.')}
          {guideItem('CONSTANT_CASE:', 'constants and environment variables.')}
          {guideItem('dot.case:', 'config keys and translation keys.')}
          {guideItem('path/case:', 'folders and routes.')}
          {guideItem('Train-Case:', 'HTTP headers such as Content-Type.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Type className="h-5 w-5" aria-hidden="true" />
          Which Text Case Goes Where?
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Sentence case:', 'normal body text, and text that arrived in all caps.')}
          {guideItem('Title Case:', 'headlines. Small words like "and" or "of" stay lowercase.')}
          {guideItem('Capitalized Case:', 'names and lists, every word starts with a capital.')}
          {guideItem('UPPER CASE:', 'labels and short notices.')}
          {guideItem('lower case:', 'tags, or a neutral start before another conversion.')}
          {guideItem('InVeRsE CaSe:', 'text typed with Caps Lock on by mistake.')}
          {guideItem('aLtErNaTiNg cAsE:', 'mocking memes, and not much else.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Regex className="h-5 w-5" aria-hidden="true" />
          Find &amp; Replace Recipes
        </h3>
        <p className="mt-0 mb-3 text-sm leading-relaxed text-gray-300">
          Turn on the regular expression button first. <code>^</code> and <code>$</code> match each line.
        </p>
        <dl className="space-y-2 text-sm text-gray-300">
          {[
            ['^', '- ', 'Turn every line into a bullet'],
            ['[ \\t]+$', '(empty)', 'Remove spaces at the end of lines'],
            ['(\\w+), (\\w+)', '$2 $1', 'Turn "Doe, Jane" into "Jane Doe"'],
            ['\\d+', '#', 'Mask every number'],
          ].map(([find, replacement, effect]) => (
            <div key={find} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <dt className="flex items-center gap-1.5">
                <kbd className={`${guideKey} font-mono`}>{find}</kbd>
                <span aria-hidden="true">to</span>
                <kbd className={`${guideKey} font-mono`}>{replacement}</kbd>
              </dt>
              <dd className="text-right">{effect}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Keyboard className="h-5 w-5" aria-hidden="true" />
          Keyboard Shortcuts
        </h3>
        <dl className="space-y-2 text-sm text-gray-300">
          {[
            ['Ctrl + Z', 'Undo'],
            ['Ctrl + Y', 'Redo'],
            ['Ctrl + Shift + Z', 'Redo'],
          ].map(([key, action]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <dt><kbd className={guideKey}>{key}</kbd></dt>
              <dd className="text-right">{action}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-gray-400">These work while the editor has focus. On a Mac, use Cmd instead of Ctrl.</p>
      </section>
    </div>
  </div>
);

const ConvertCaseTool = () => {
  const { present: text, canUndo, canRedo, commit, undo, redo } = useHistory(() => '');
  const [find, setFind] = useState('');
  const [replaceWith, setReplaceWith] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const deferredText = useDeferredValue(text);
  const hasText = text.trim() !== '';

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (key === 'y') {
        e.preventDefault();
        redo();
      }
    },
    [undo, redo]
  );

  const flashCopied = useCallback((key: string) => {
    setCopiedKey(key);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedKey(null), 1500);
  }, []);

  const copyInput = useCallback(async () => {
    if (await copyToClipboard(text)) {
      flashCopied('input');
      toast.success('Text copied to clipboard!');
    }
  }, [text, flashCopied]);

  const applyTransform = useCallback(
    (label: string, transform: (t: string) => string) => {
      const next = transform(text);
      if (next === text) {
        toast.info('Nothing to change.');
        return;
      }
      commit(next);
      toast.success(`${label} applied — Ctrl+Z to undo.`);
    },
    [text, commit]
  );

  const clearText = useCallback(() => {
    commit('');
    toast.success('Text cleared — Ctrl+Z to undo.');
  }, [commit]);

  const downloadText = useCallback(() => {
    downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), 'text.txt');
    toast.success('Text file downloaded!');
  }, [text]);

  // Find & replace
  const search = useMemo(() => {
    if (!find) return { pattern: null, error: '' };
    try {
      return { pattern: buildPattern(find, { matchCase, useRegex }), error: '' };
    } catch (e) {
      return { pattern: null, error: e instanceof Error ? e.message : 'Invalid regular expression' };
    }
  }, [find, matchCase, useRegex]);

  const matchCount = useMemo(
    () => (search.pattern ? countMatches(deferredText, search.pattern) : 0),
    [search.pattern, deferredText]
  );

  const replaceAll = useCallback(() => {
    if (!search.pattern) return;
    const count = countMatches(text, search.pattern);
    if (count === 0) {
      toast.info('No matches found.');
      return;
    }
    commit(replaceMatches(text, search.pattern, replaceWith, useRegex));
    toast.success(`Replaced ${count.toLocaleString()} match${count === 1 ? '' : 'es'}.`);
  }, [search.pattern, text, replaceWith, useRegex, commit]);

  // Stats follow the deferred value so typing stays responsive on long texts
  const stats = useMemo(() => getTextStats(deferredText), [deferredText]);

  const statItems = [
    ['Characters', stats.characters.toLocaleString()],
    ['No spaces', stats.charactersNoSpaces.toLocaleString()],
    ['Words', stats.words.toLocaleString()],
    ['Sentences', stats.sentences.toLocaleString()],
    ['Paragraphs', stats.paragraphs.toLocaleString()],
    ['Lines', stats.lines.toLocaleString()],
    ['Reading time', `${Math.ceil(stats.readingMinutes)} min`],
  ];

  const renderCaseButtons = (cases: CaseDef[]) => (
    <div className="grid grid-cols-2 gap-1.5">
      {cases.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() => applyTransform(c.label, c.convert)}
          disabled={!hasText}
          className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1.5 text-left text-slate-100 transition-colors enabled:hover:border-white/25 enabled:hover:bg-white/[0.09] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span
            className={`inline-flex h-6 min-w-[1.75rem] shrink-0 items-center justify-center rounded-md border px-1 font-mono text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${c.badge}`}
          >
            {c.abbr}
          </span>
          <span className="truncate text-[13px] font-medium">{c.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <ToolPageLayout
      title="Convert Case Tool"
      description="Convert text between letter and developer cases instantly, clean it up and export it."
      keywords="text case converter, uppercase, lowercase, sentence case, title case, camelCase, snake_case, kebab-case, PascalCase, CONSTANT_CASE, remove duplicate lines, sort lines, word counter, find and replace"
      canonicalUrl="/tools/convert-case"
      pageTitle="Convert Case Tool - sLixTOOLS"
      pageDescription="Convert text to 15 cases with one click — Sentence, Title, UPPER, camelCase, snake_case, kebab-case and more. Clean up lines, find & replace, undo/redo, live statistics and .txt export."
      breadcrumbLabel="Convert Case"
      belowTool={seoContent}
      faq={[
        {
          question: 'Which case styles are supported?',
          answer:
            'Seven text cases (Sentence, lower, UPPER, Capitalized, Title, aLtErNaTiNg and InVeRsE) plus eight developer cases (camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, dot.case, path/case and Train-Case). Each one converts the editor text with one click.',
        },
        {
          question: 'How do developer cases handle multiple lines?',
          answer:
            'Each line is converted on its own, so you can paste a list of names and get a list of identifiers back. Existing camelCase, acronyms and separators are split into words first.',
        },
        {
          question: 'Why are some words lowercase in Title Case?',
          answer:
            'Short words such as "and", "of", "the" and "with" stay lowercase unless they are the first or last word, which is the usual rule for headlines. Use Capitalized Case if every word should start with a capital.',
        },
        {
          question: 'Can I use regular expressions in find and replace?',
          answer:
            'Yes. Turn on the regular expression button, then use $1, $2 and so on in the replacement to insert captured groups. The match count updates as you type, and an invalid pattern shows its error next to the fields.',
        },
        {
          question: 'Can I undo a conversion?',
          answer:
            'Yes. Every conversion, cleanup, replace and clear is one undo step. Use the undo/redo buttons or Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y inside the editor.',
        },
        {
          question: 'Which text statistics are shown?',
          answer:
            'Characters with and without spaces, words, sentences, paragraphs, lines and an estimated reading time at about 200 words per minute.',
        },
        {
          question: 'Is my text sent anywhere?',
          answer: 'No. Everything runs locally in your browser, and the tool keeps working offline once the page is loaded.',
        },
      ]}
    >
      <div className={toolWorkspace}>
        <div className={toolbarRow}>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <input
              type="text"
              value={find}
              onChange={(e) => setFind(e.target.value)}
              placeholder="Find"
              aria-label="Find"
              aria-invalid={!!search.error}
              className={`${fieldClass} sm:w-52 ${search.error ? 'border-red-500/60' : ''}`}
            />
            <input
              type="text"
              value={replaceWith}
              onChange={(e) => setReplaceWith(e.target.value)}
              placeholder={useRegex ? 'Replace with ($1 for groups)' : 'Replace with'}
              aria-label="Replace with"
              className={`${fieldClass} sm:w-52`}
            />
            <div className="flex items-center gap-1">
              <Tooltip label="Match case" hint="Treat A and a as different letters." side="bottom">
                <button
                  type="button"
                  onClick={() => setMatchCase((v) => !v)}
                  aria-pressed={matchCase}
                  aria-label="Match case"
                  className={toolButton}
                >
                  <CaseSensitive className="h-4 w-4" aria-hidden="true" />
                </button>
              </Tooltip>
              <Tooltip label="Regular expression" hint="Search with a pattern. Use $1 in the replacement for groups." side="bottom">
                <button
                  type="button"
                  onClick={() => setUseRegex((v) => !v)}
                  aria-pressed={useRegex}
                  aria-label="Use regular expression"
                  className={toolButton}
                >
                  <Regex className="h-4 w-4" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
            <button
              type="button"
              onClick={replaceAll}
              disabled={!search.pattern || matchCount === 0}
              className={chipButton}
            >
              <Replace className="h-4 w-4 text-sky-300" aria-hidden="true" />
              Replace all
            </button>
            {find && (
              <span className={`text-xs ${search.error ? 'text-red-400' : 'text-slate-400'}`} aria-live="polite">
                {search.error || `${matchCount.toLocaleString()} match${matchCount === 1 ? '' : 'es'}`}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1 lg:ml-auto">
            <Tooltip label="Undo" shortcut="Ctrl+Z" side="bottom">
              <button type="button" onClick={undo} disabled={!canUndo} className={toolButton} aria-label="Undo">
                <Undo2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="Redo" shortcut="Ctrl+Y" side="bottom">
              <button type="button" onClick={redo} disabled={!canRedo} className={toolButton} aria-label="Redo">
                <Redo2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="Download" hint="Save the text as a .txt file." side="bottom">
              <button type="button" onClick={downloadText} disabled={!hasText} className={toolButton} aria-label="Download as .txt">
                <Download className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="Clear" hint="Empty the editor. You can undo this." side="bottom">
              <button type="button" onClick={clearText} disabled={!text} className={toolButton} aria-label="Clear text">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <ToolbarDivider />
            <button type="button" onClick={copyInput} disabled={!hasText} className={primaryButton}>
              {copiedKey === 'input' ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              Copy Text
            </button>
          </div>
        </div>

        <div className={settingsGrid}>
          <div className="flex min-h-0 min-w-0 flex-col">
            <Label htmlFor="input-text" className="sr-only">
              Your text
            </Label>
            <Textarea
              id="input-text"
              placeholder="Type or paste your text here…"
              value={text}
              onChange={(e) => commit(e.target.value, true)}
              onKeyDown={handleKeyDown}
              aria-describedby="text-counts"
              className="m-4 min-h-[45dvh] w-auto flex-1 resize-y rounded-lg border border-white/10 px-4 py-3 text-base text-white placeholder-gray-400 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sky-400/40 focus-visible:ring-offset-0 lg:min-h-0 lg:resize-none"
              style={{ backgroundColor: '#171714' }}
            />
            <dl id="text-counts" className={statusRow}>
              {statItems.map(([label, value]) => (
                <div key={label} className="flex gap-1.5">
                  <dt>{label}:</dt>
                  <dd className="tabular-nums text-slate-200">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-4 border-t border-white/10 p-4 lg:overflow-y-auto lg:border-l lg:border-t-0">
            <div className="space-y-2">
              <p className={`${sectionLabel} mt-0`}>Convert to</p>
              {renderCaseButtons(TEXT_CASES)}
            </div>
            <div className="space-y-2">
              <p className={`${sectionLabel} mt-0`}>Developer cases</p>
              {renderCaseButtons(DEV_CASES)}
            </div>
            <div className="space-y-2">
              <p className={`${sectionLabel} mt-0`}>Clean up</p>
              <div className="grid grid-cols-2 gap-1.5">
                {CLEANUP_ACTIONS.map(({ label, icon: Icon, run }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => applyTransform(label, run)}
                    disabled={!text}
                    className={`${chipButton} min-w-0 !px-2 !text-[13px]`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default ConvertCaseTool;
