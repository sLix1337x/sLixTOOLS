import { useState, useCallback, useDeferredValue, useMemo, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { toast } from 'sonner';
import {
  Type,
  Copy,
  Trash2,
  Wand2,
  ListChecks,
  ThumbsUp,
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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ToolPageLayout from '@/components/ToolPageLayout';
import Divider from '@/components/ui/divider';
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
}

const TEXT_CASES: CaseDef[] = [
  { abbr: 'Sc', label: 'Sentence case', convert: toSentenceCase },
  { abbr: 'lc', label: 'lower case', convert: (t) => t.toLowerCase() },
  { abbr: 'UC', label: 'UPPER CASE', convert: (t) => t.toUpperCase() },
  { abbr: 'CC', label: 'Capitalized Case', convert: toCapitalizedCase },
  { abbr: 'TC', label: 'Title Case', convert: toTitleCase },
  { abbr: 'aC', label: 'aLtErNaTiNg cAsE', convert: toAlternatingCase },
  { abbr: 'iC', label: 'InVeRsE CaSe', convert: toInverseCase },
];

const DEV_CASES: CaseDef[] = [
  { abbr: 'cC', label: 'camelCase', convert: toCamelCase },
  { abbr: 'PC', label: 'PascalCase', convert: toPascalCase },
  { abbr: 's_c', label: 'snake_case', convert: toSnakeCase },
  { abbr: 'k-c', label: 'kebab-case', convert: toKebabCase },
  { abbr: 'C_C', label: 'CONSTANT_CASE', convert: toConstantCase },
  { abbr: 'd.c', label: 'dot.case', convert: toDotCase },
  { abbr: 'p/c', label: 'path/case', convert: toPathCase },
  { abbr: 'T-C', label: 'Train-Case', convert: toTrainCase },
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

const HISTORY_LIMIT = 100;
/** Keystrokes closer together than this collapse into one undo step. */
const TYPING_MERGE_MS = 1000;

const chipButton =
  'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/25 bg-white/[0.08] text-sm font-medium text-white transition-colors enabled:hover:border-sky-400/70 enabled:hover:bg-sky-400/20 disabled:opacity-60 disabled:cursor-not-allowed';
const iconButton =
  'inline-flex items-center justify-center h-8 w-8 rounded-md border border-white/20 bg-white/[0.06] text-slate-200 transition-colors enabled:hover:text-white enabled:hover:border-sky-400/60 enabled:hover:bg-sky-400/15 disabled:opacity-50 disabled:cursor-not-allowed';
const sectionLabel = 'text-xs font-semibold uppercase tracking-wide text-slate-300';
const fieldClass =
  'h-9 w-full rounded-md border border-white/15 bg-[#171714] px-3 text-sm text-white placeholder-gray-500 outline-none focus:border-sky-400/60';

interface History {
  past: string[];
  present: string;
  future: string[];
}

const formatReadingTime = (minutes: number) => {
  if (minutes === 0) return '0 min';
  return minutes < 1 ? '<1 min' : `${Math.ceil(minutes)} min`;
};

const copyToClipboard = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    toast.error('Unable to copy automatically. Please copy manually.');
    return false;
  }
};

const ConvertCaseTool = () => {
  const [history, setHistory] = useState<History>({ past: [], present: '', future: [] });
  const [find, setFind] = useState('');
  const [replaceWith, setReplaceWith] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [showDevCases, setShowDevCases] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const lastTypingAt = useRef(0);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>();

  const text = history.present;
  const deferredText = useDeferredValue(text);
  const hasText = text.trim() !== '';

  /** Sets new text and records an undo step; rapid typing is merged into one step. */
  const commit = useCallback((next: string, typing = false) => {
    const now = Date.now();
    const merge = typing && now - lastTypingAt.current < TYPING_MERGE_MS;
    lastTypingAt.current = typing ? now : 0;
    setHistory((h) =>
      next === h.present
        ? h
        : {
            past: merge ? h.past : [...h.past, h.present].slice(-HISTORY_LIMIT),
            present: next,
            future: [],
          }
    );
  }, []);

  const undo = useCallback(() => {
    lastTypingAt.current = 0;
    setHistory((h) =>
      h.past.length === 0
        ? h
        : { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
    );
  }, []);

  const redo = useCallback(() => {
    lastTypingAt.current = 0;
    setHistory((h) =>
      h.future.length === 0
        ? h
        : { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
    );
  }, []);

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
  const statItems: [string, string][] = [
    ['Characters', stats.characters.toLocaleString()],
    ['No spaces', stats.charactersNoSpaces.toLocaleString()],
    ['Words', stats.words.toLocaleString()],
    ['Sentences', stats.sentences.toLocaleString()],
    ['Paragraphs', stats.paragraphs.toLocaleString()],
    ['Lines', stats.lines.toLocaleString()],
    ['Reading time', formatReadingTime(stats.readingMinutes)],
  ];

  const renderCaseButtons = (cases: CaseDef[]) => (
    <div className="flex flex-wrap gap-2">
        {cases.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => applyTransform(c.label, c.convert)}
            disabled={!hasText}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-sky-400/30 bg-sky-400/[0.08] text-slate-100 transition-colors enabled:hover:text-white enabled:hover:border-sky-400/70 enabled:hover:bg-sky-400/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="rounded bg-sky-400/15 px-1.5 py-0.5 font-mono text-xs font-bold text-sky-300">{c.abbr}</span>
            <span className="text-sm font-medium">{c.label}</span>
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
      <div className="max-w-4xl mx-auto">
        {/* Editor */}
        <section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="input-text" className="flex items-center text-lg font-semibold text-white">
              <Type className="mr-2 h-5 w-5" aria-hidden="true" />
              Your text
            </Label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={undo}
                disabled={history.past.length === 0}
                className={iconButton}
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={history.future.length === 0}
                className={iconButton}
                aria-label="Redo"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {statItems.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
                <dd className="text-sm font-semibold tabular-nums text-white">{value}</dd>
              </div>
            ))}
          </dl>

          <Textarea
            id="input-text"
            placeholder="Type or paste your text here…"
            value={text}
            onChange={(e) => commit(e.target.value, true)}
            onKeyDown={handleKeyDown}
            className="min-h-[180px] resize-y border border-white/20 text-base text-white placeholder-gray-400"
            style={{ backgroundColor: '#171714' }}
          />

          {/* Case conversions (in place) */}
          <div className="space-y-2">
            <p className={sectionLabel}>Convert to</p>
            {renderCaseButtons(TEXT_CASES)}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <SwitchPrimitive.Root
                id="dev-cases"
                checked={showDevCases}
                onCheckedChange={setShowDevCases}
                className="inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-white/25 bg-white/10 transition-colors data-[state=checked]:border-sky-400 data-[state=checked]:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
              >
                <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-px rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[17px]" />
              </SwitchPrimitive.Root>
              <Label htmlFor="dev-cases" className="cursor-pointer text-sm text-slate-200">
                Developer cases <span className="text-slate-400">(camelCase, snake_case, kebab-case …)</span>
              </Label>
            </div>
            {showDevCases && renderCaseButtons(DEV_CASES)}
          </div>


          {/* Cleanup */}
          <div className="space-y-2">
            <p className={sectionLabel}>Clean up</p>
            <div className="flex flex-wrap gap-2">
              {CLEANUP_ACTIONS.map(({ label, icon: Icon, run }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => applyTransform(label, run)}
                  disabled={!text}
                  className={chipButton}
                >
                  <Icon className="h-4 w-4 text-sky-300" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Find & replace */}
          <div className="space-y-2">
            <p className={sectionLabel}>Find &amp; replace</p>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                type="text"
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder="Find"
                aria-label="Find"
                aria-invalid={!!search.error}
                className={`${fieldClass} md:flex-1 ${search.error ? 'border-red-500/60' : ''}`}
              />
              <input
                type="text"
                value={replaceWith}
                onChange={(e) => setReplaceWith(e.target.value)}
                placeholder={useRegex ? 'Replace with ($1 for groups)' : 'Replace with'}
                aria-label="Replace with"
                className={`${fieldClass} md:flex-1`}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMatchCase((v) => !v)}
                  aria-pressed={matchCase}
                  aria-label="Match case"
                  title="Match case"
                  className={`${iconButton} aria-pressed:border-sky-400/60 aria-pressed:bg-sky-400/15 aria-pressed:text-sky-300`}
                >
                  <CaseSensitive className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setUseRegex((v) => !v)}
                  aria-pressed={useRegex}
                  aria-label="Use regular expression"
                  title="Regular expression"
                  className={`${iconButton} aria-pressed:border-sky-400/60 aria-pressed:bg-sky-400/15 aria-pressed:text-sky-300`}
                >
                  <Regex className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={replaceAll}
                  disabled={!search.pattern || matchCount === 0}
                  className={chipButton}
                >
                  <Replace className="h-4 w-4 text-sky-300" aria-hidden="true" />
                  Replace all
                </button>
              </div>
            </div>
            {find && (
              <p className={`text-xs ${search.error ? 'text-red-400' : 'text-slate-400'}`} aria-live="polite">
                {search.error || `${matchCount.toLocaleString()} match${matchCount === 1 ? '' : 'es'}`}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={copyInput}
              disabled={!hasText}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border-0 bg-primary-action text-white shadow-[0_0_15px_rgba(56,189,248,0.5)] outline-none transition-shadow duration-300 hover:bg-primary-action/90 hover:shadow-[0_0_25px_rgba(56,189,248,0.7)] focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {copiedKey === 'input' ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              Copy Text
            </button>
            <button
              type="button"
              onClick={downloadText}
              disabled={!hasText}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-5 text-slate-300 transition-colors enabled:hover:border-sky-400/50 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              .txt
            </button>
            <button
              type="button"
              onClick={clearText}
              disabled={!text}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-5 text-slate-300 transition-colors enabled:hover:border-white/30 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Clear
            </button>
          </div>
        </section>

      </div>

      {/* SEO Content Section */}
      <Divider className="mt-12 mb-10" />
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center justify-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
              <CaseSensitive className="h-5 w-5" aria-hidden="true" />
            </span>
            Free Online Text Case Converter Tool
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                <Wand2 className="h-5 w-5" aria-hidden="true" />
                One Click, Any Case
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Type or paste your text and convert it to any of fifteen cases with one click — from Sentence and Title Case for
                writing to camelCase and snake_case for code. Clean up lines, find and replace, undo any step and
                download the result as a .txt file. Everything runs in your browser.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                <ListChecks className="h-5 w-5" aria-hidden="true" />
                Supported Case Types
              </h3>
              <ul className="text-gray-300 text-sm space-y-1.5">
                {[
                  ['Writing:', 'Sentence case, lower case, UPPER CASE, Capitalized Case, Title Case'],
                  ['Fun:', 'aLtErNaTiNg cAsE and InVeRsE CaSe'],
                  ['Code:', 'camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE'],
                  ['Paths & keys:', 'dot.case, path/case and Train-Case'],
                  ['Cleanup:', 'trim, collapse spaces, join, dedupe, sort and reverse lines'],
                ].map(([term, desc]) => (
                  <li key={term} className="flex gap-2.5">
                    <Check className="h-3.5 w-3.5 text-blue-400 mt-1 flex-shrink-0" aria-hidden="true" />
                    <span><strong>{term}</strong> {desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Divider className="mt-8 mb-6" />
          <div className="p-4 bg-white/5 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
              <ThumbsUp className="h-5 w-5" aria-hidden="true" />
              Why Use Our Case Converter?
            </h3>
            <div className="grid md:grid-cols-3 gap-3 text-sm text-gray-300">
              {[
                '15 text and developer cases',
                'Undo/redo with keyboard shortcuts',
                'Find & replace with regex support',
                'Words, sentences and reading time',
                'Download your text as .txt',
                'Private — nothing leaves your browser',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-sky-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default ConvertCaseTool;
