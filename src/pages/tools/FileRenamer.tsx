import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  CaseSensitive,
  Download,
  Eraser,
  FilePen,
  FilePlus2,
  FolderOpen,
  GripVertical,
  Hash,
  Keyboard,
  ListOrdered,
  Pause,
  Play,
  Plus,
  Replace,
  RotateCcw,
  Save,
  Terminal,
  TriangleAlert,
  Undo2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import ToolPageLayout from '@/components/ToolPageLayout';
import { ToolbarDivider } from '@/components/tools/ToolBar';
import { Progress } from '@/components/ui/progress';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { downloadBlob } from '@/utils/download';
import { formatFileSize } from '@/utils/formatters';
import {
  DEFAULT_RULES,
  ISSUE_TEXT,
  computeNames,
  findIssues,
  planRenames,
  renameScript,
  safeRegex,
  type CaseStyle,
  type ExtMode,
  type RenameRules,
  type RenameStep,
} from '@/utils/rename';
import {
  chipButton,
  editorFeatures,
  editorWorkspace,
  fieldClass,
  guideCard,
  guideHeading,
  guideKey,
  primaryButton,
  sectionLabel,
  segmentButton,
  segmentGroup,
  statusRow,
  toolButton,
  toolDropzone,
  toolbarRow,
} from '@/styles/constants';

// File System Access API: Chromium only, and move() is newer than the rest, so typed by hand
interface FsFileHandle extends FileSystemFileHandle {
  move?: (name: string) => Promise<void>;
}
interface FsDirHandle extends FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<FileSystemHandle>;
}
type DirectoryPicker = (options: { mode: 'readwrite' }) => Promise<FsDirHandle>;
const directoryPicker = (): DirectoryPicker | undefined =>
  (window as unknown as { showDirectoryPicker?: DirectoryPicker }).showDirectoryPicker;

interface Row {
  id: number;
  file: File;
  /** Current name on disk (folder mode) or of the dropped file */
  name: string;
  handle: FsFileHandle | null;
  include: boolean;
  /** Hand-typed new name; wins over the rules */
  override: string | null;
}

/** OS clutter that should never be renamed */
const SYSTEM_FILES = new Set(['desktop.ini', 'thumbs.db', '.ds_store']);
const AUDIO_EXT = /\.(mp3|wav|ogg|oga|flac|m4a|aac|opus|weba)$/i;
const STORE_RULES = 'slix.renamer.rules';
const STORE_PRESETS = 'slix.renamer.presets';

interface Preset {
  name: string;
  rules: RenameRules;
  builtIn?: boolean;
}

const BUILT_IN_PRESETS: Preset[] = [
  {
    name: 'Game SFX (snake_case_001)',
    builtIn: true,
    rules: { ...DEFAULT_RULES, removeWords: ['Elevenlabs', 'final', 'copy'] },
  },
  {
    name: 'Web assets (kebab-case)',
    builtIn: true,
    rules: { ...DEFAULT_RULES, caseStyle: 'kebab', separator: '-', numberOn: false },
  },
  {
    name: 'Numbered sequence (name_01)',
    builtIn: true,
    rules: { ...DEFAULT_RULES, template: 'image', numberPad: 2, numberScope: 'all', caseStyle: 'keep', cleanupOn: false },
  },
];

const CASES: { value: CaseStyle; label: string }[] = [
  { value: 'snake', label: 'snake_case' },
  { value: 'kebab', label: 'kebab-case' },
  { value: 'camel', label: 'camelCase' },
  { value: 'pascal', label: 'PascalCase' },
  { value: 'title', label: 'Title Case' },
  { value: 'lower', label: 'lower' },
  { value: 'upper', label: 'UPPER' },
  { value: 'keep', label: 'Keep' },
];
/** Case styles that bring their own separator */
const FIXED_SEPARATOR: CaseStyle[] = ['snake', 'kebab', 'camel', 'pascal'];
const SEPARATORS = [
  { value: '_', label: '_' },
  { value: '-', label: '-' },
  { value: ' ', label: 'Space' },
  { value: '.', label: '.' },
  { value: '', label: 'None' },
];
const EXT_MODES: { value: ExtMode; label: string }[] = [
  { value: 'lower', label: 'lowercase' },
  { value: 'keep', label: 'Keep' },
  { value: 'upper', label: 'UPPER' },
  { value: 'set', label: 'Change' },
];
const TOKENS = [
  { token: '{name}', hint: 'Name after removing, replacing and cleanup' },
  { token: '{n}', hint: 'Number, placed here instead of at the end' },
  { token: '{original}', hint: 'Original name without extension' },
  { token: '{folder}', hint: 'Name of the opened folder' },
  { token: '{date}', hint: 'Last modified date, YYYY-MM-DD' },
];

const readStore = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeStore = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or storage blocked: presets just are not kept */
  }
};

/** Moves a file to a new name in its folder; copy + delete where move() is missing. */
const moveFile = async (dir: FsDirHandle, handle: FsFileHandle, from: string, to: string): Promise<FsFileHandle> => {
  if (handle.move) {
    try {
      await handle.move(to);
      return handle;
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'NotSupportedError')) throw error;
    }
  }
  const file = await handle.getFile();
  const target = await dir.getFileHandle(to, { create: true });
  const writable = await target.createWritable();
  await writable.write(file);
  await writable.close();
  await dir.removeEntry(from);
  return target;
};

/** Splits a name into unchanged prefix, changed middle and unchanged suffix. */
const diffParts = (a: string, b: string): [string, string, string] => {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let end = 0;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
  return [a.slice(0, start), a.slice(start, a.length - end), a.slice(a.length - end)];
};

const Diff = ({ text, other, tone }: { text: string; other: string; tone: 'old' | 'new' }) => {
  const [pre, mid, post] = diffParts(text, other);
  return (
    <span className="block truncate font-mono text-[13px]" title={text}>
      <span className={tone === 'old' ? 'text-slate-400' : 'text-slate-200'}>{pre}</span>
      {mid && (
        <span className={tone === 'old' ? 'rounded-sm bg-red-400/15 text-red-300 line-through decoration-red-300/50' : 'rounded-sm bg-sky-400/15 text-sky-200'}>
          {mid}
        </span>
      )}
      <span className={tone === 'old' ? 'text-slate-400' : 'text-slate-200'}>{post}</span>
    </span>
  );
};

/** Collapsible-looking rule block with an on/off switch */
const RuleSection = ({
  title,
  icon: Icon,
  on,
  onToggle,
  children,
  aside,
}: {
  title: string;
  icon: typeof Hash;
  on?: boolean | undefined;
  onToggle?: ((on: boolean) => void) | undefined;
  children: ReactNode;
  aside?: ReactNode;
}) => (
  <section className={ruleCard}>
    <div className="flex items-center justify-between gap-2">
      <label className={cn('flex items-center gap-2', sectionLabel, onToggle && 'cursor-pointer')}>
        {onToggle && (
          <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} className="h-4 w-4 accent-sky-400" />
        )}
        <Icon className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
        {title}
      </label>
      {aside}
    </div>
    <div className={cn('space-y-2.5', onToggle && !on && 'pointer-events-none opacity-40')}>{children}</div>
  </section>
);

const Segments = <T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  label,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  label: string;
  className?: string;
}) => (
  <div className={cn(segmentGroup, className)} role="group" aria-label={label}>
    {options.map((o) => (
      <button
        key={o.value || 'none'}
        type="button"
        aria-pressed={value === o.value}
        disabled={disabled}
        onClick={() => onChange(o.value)}
        className={segmentButton}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const ruleCard = 'space-y-2.5 py-3.5';
/** Even grid of small segment buttons for long option lists in a narrow panel */
const segmentGrid = 'grid w-full [&>button]:h-7 [&>button]:whitespace-nowrap [&>button]:px-1 [&>button]:text-[11px]';
/** Side panel: flat sections split by hairlines; at xl each panel scrolls on its own */
const sidePanel = 'divide-y divide-white/[0.06] px-4 xl:row-start-1 xl:min-h-0 xl:overflow-y-auto';
const numberField = 'h-8 w-full rounded-md border border-white/15 bg-[#171714] px-2 text-sm text-white outline-none focus:border-sky-400/60';

/** Word list editor: Enter or comma adds a word */
const WordList = ({ words, onChange }: { words: string[]; onChange: (w: string[]) => void }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const parts = draft.split(',').map((w) => w.trim()).filter((w) => w && !words.includes(w));
    if (parts.length) onChange([...words, ...parts]);
    setDraft('');
  };
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-white/15 bg-[#171714] p-1.5 focus-within:border-sky-400/60">
      {words.map((w) => (
        <span key={w} className="inline-flex items-center gap-1 rounded bg-white/10 py-0.5 pl-2 pr-1 font-mono text-xs text-slate-200">
          {w}
          <button type="button" aria-label={`Remove ${w}`} onClick={() => onChange(words.filter((x) => x !== w))} className="rounded p-0.5 text-slate-400 hover:bg-white/10 hover:text-white">
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !draft && words.length) {
            onChange(words.slice(0, -1));
          }
        }}
        onBlur={add}
        placeholder={words.length ? 'Add more...' : 'e.g. Elevenlabs, final, copy'}
        aria-label="Words to remove"
        className="min-w-24 flex-1 bg-transparent px-1 text-sm text-white placeholder-gray-500 outline-none"
      />
    </div>
  );
};

const guideItem = (term: string, text: string) => (
  <li key={term}>
    <strong className="text-white">{term}</strong> {text}
  </li>
);

const seoContent = (
  <div className="max-w-6xl mx-auto px-4 space-y-6">
    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
        <FilePen className="h-5 w-5" aria-hidden="true" />
      </span>
      Renaming Files
    </h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Eraser className="h-5 w-5" aria-hidden="true" />
          Rules
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Order:', 'remove words, replace, template, case style and cleanup, then the number and extension.')}
          {guideItem('Template:', 'door_open_{n} names every file door_open_001, door_open_002 and so on.')}
          {guideItem('Numbers:', 'every distinct name counts on its own. Unchecked files keep their names, and new numbers continue after theirs.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <FolderOpen className="h-5 w-5" aria-hidden="true" />
          Getting the Files Renamed
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Open folder:', 'in Chrome or Edge the files are renamed right where they are, with undo.')}
          {guideItem('Download:', 'renamed copies as a ZIP, in any browser.')}
          {guideItem('Script:', 'copy PowerShell or bash commands and run them inside the folder.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Keyboard className="h-5 w-5" aria-hidden="true" />
          Tips and Shortcuts
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          <li>Click a new name to type your own, <kbd className={guideKey}>Enter</kbd> keeps it, <kbd className={guideKey}>Esc</kbd> cancels</li>
          <li>Drag the grip to change the order, and so the numbers</li>
          <li><kbd className={guideKey}>Ctrl+Z</kbd> undoes the last rename in a folder</li>
          <li>Save your rules as a preset to reuse them</li>
        </ul>
      </section>
    </div>
  </div>
);

let nextId = 1;
const toRow = (file: File, handle: FsFileHandle | null = null): Row => ({
  id: nextId++,
  file,
  name: file.name,
  handle,
  include: !SYSTEM_FILES.has(file.name.toLowerCase()),
  override: null,
});
const byName = (a: Row, b: Row) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

const FileRenamer = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [folder, setFolder] = useState<FsDirHandle | null>(null);
  const [rules, setRules] = useState<RenameRules>(() => ({ ...DEFAULT_RULES, ...readStore<Partial<RenameRules>>(STORE_RULES, {}) }));
  const [presets, setPresets] = useState<Preset[]>(() => readStore<Preset[]>(STORE_PRESETS, []));
  const [presetName, setPresetName] = useState('');
  const [shell, setShell] = useState<'powershell' | 'bash'>('powershell');
  const [editing, setEditing] = useState<{ id: number; value: string } | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropping, setDropping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [lastRename, setLastRename] = useState<RenameStep[] | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlsRef = useRef(new Map<number, string>());
  const canPick = typeof window !== 'undefined' && !!directoryPicker();

  useEffect(() => writeStore(STORE_RULES, rules), [rules]);
  useEffect(() => writeStore(STORE_PRESETS, presets), [presets]);

  const set = useCallback(<K extends keyof RenameRules>(key: K, value: RenameRules[K]) => {
    setRules((r) => ({ ...r, [key]: value }));
  }, []);

  // Object URLs for previews, created on demand and freed when the file goes away
  const urlFor = (row: Row) => {
    let url = urlsRef.current.get(row.id);
    if (!url) {
      url = URL.createObjectURL(row.file);
      urlsRef.current.set(row.id, url);
    }
    return url;
  };
  const dropUrl = (id: number) => {
    const url = urlsRef.current.get(id);
    if (url) URL.revokeObjectURL(url);
    urlsRef.current.delete(id);
  };
  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      audioRef.current?.pause();
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const stopAudio = () => {
    audioRef.current?.pause();
    setPlayingId(null);
  };

  const togglePlay = (row: Row) => {
    if (playingId === row.id) return stopAudio();
    const audio = (audioRef.current ??= new Audio());
    audio.src = urlFor(row);
    audio.onended = () => setPlayingId(null);
    audio.play().then(
      () => setPlayingId(row.id),
      () => toast.error(`${row.name} cannot be played in this browser`)
    );
  };

  const addFiles = (files: File[]) => {
    if (!files.length) return;
    if (folder) {
      // Dropped files have no place on disk, so they cannot share a list with folder files
      setFolder(null);
      setLastRename(null);
      setRows(files.map((f) => toRow(f)));
      toast.info('Folder closed, now renaming the dropped files');
      return;
    }
    setRows((prev) => {
      const known = new Set(prev.map((r) => `${r.name}|${r.file.size}|${r.file.lastModified}`));
      return [...prev, ...files.filter((f) => !known.has(`${f.name}|${f.size}|${f.lastModified}`)).map((f) => toRow(f))];
    });
  };

  const openFolder = async () => {
    const pick = directoryPicker();
    if (!pick) return;
    let dir: FsDirHandle;
    try {
      dir = await pick({ mode: 'readwrite' });
    } catch {
      return; // picker dismissed
    }
    setBusy(true);
    try {
      const next: Row[] = [];
      for await (const entry of dir.values()) {
        if (entry.kind !== 'file') continue;
        const handle = entry as FsFileHandle;
        next.push(toRow(await handle.getFile(), handle));
      }
      if (!next.length) {
        toast.info(`${dir.name} has no files`);
        return;
      }
      stopAudio();
      rows.forEach((r) => dropUrl(r.id));
      setFolder(dir);
      setLastRename(null);
      setRows(next.sort(byName));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read the folder');
    } finally {
      setBusy(false);
    }
  };

  const clearAll = () => {
    stopAudio();
    rows.forEach((r) => dropUrl(r.id));
    setRows([]);
    setFolder(null);
    setLastRename(null);
    setEditing(null);
  };

  const removeRow = (id: number) => {
    if (playingId === id) stopAudio();
    dropUrl(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const patchRow = (id: number, patch: Partial<Row>) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const sortRows = (by: 'name' | 'date' | 'size' | 'reverse') =>
    setRows((prev) => {
      const next = [...prev];
      if (by === 'name') next.sort(byName);
      if (by === 'date') next.sort((a, b) => a.file.lastModified - b.file.lastModified);
      if (by === 'size') next.sort((a, b) => a.file.size - b.file.size);
      if (by === 'reverse') next.reverse();
      return next;
    });

  const moveRow = (fromId: number, toId: number) => {
    if (fromId === toId) return;
    setRows((prev) => {
      const from = prev.findIndex((r) => r.id === fromId);
      const to = prev.findIndex((r) => r.id === toId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next;
    });
  };

  // ---- New names ----
  const included = useMemo(() => rows.filter((r) => r.include), [rows]);
  const taken = useMemo(() => rows.filter((r) => !r.include).map((r) => r.name), [rows]);
  const computed = useMemo(
    () =>
      computeNames(
        included.map((r) => ({ name: r.name, folder: folder?.name, lastModified: r.file.lastModified })),
        rules,
        taken
      ),
    [included, rules, taken, folder]
  );
  const finalNames = useMemo(() => included.map((r, i) => r.override ?? computed[i]!), [included, computed]);
  const issues = useMemo(() => findIssues(finalNames, taken), [finalNames, taken]);
  const result = useMemo(() => {
    const map = new Map<number, { to: string; issue: (typeof issues)[number] }>();
    included.forEach((r, i) => map.set(r.id, { to: finalNames[i]!, issue: issues[i] ?? null }));
    return map;
  }, [included, finalNames, issues]);
  const pairs = useMemo(() => included.map((r, i) => ({ from: r.name, to: finalNames[i]! })), [included, finalNames]);
  const changes = pairs.filter((p) => p.from !== p.to).length;
  const problemCount = issues.filter(Boolean).length;
  const badRegex =
    (rules.removeOn && rules.removeRegex && rules.removeWords.some((w) => !safeRegex(w, true))) ||
    (rules.replaceOn && rules.replaceRegex && rules.replacements.some((p) => p.find && !safeRegex(p.find, true)));
  const blocked = busy || problemCount > 0 || included.length === 0;
  const blockedHint =
    problemCount > 0 ? `Fix ${problemCount} name problem${problemCount > 1 ? 's' : ''} first` : included.length === 0 ? 'No files selected' : undefined;

  // ---- Output ----
  const runSteps = async (steps: RenameStep[]) => {
    if (!folder) return false;
    const idOf = new Map(rows.map((r) => [r.name, r.id]));
    const handles = new Map(rows.map((r) => [r.id, r.handle]));
    const names = new Map(rows.map((r) => [r.id, r.name]));
    let failed: unknown = null;
    setBusy(true);
    setProgress(0);
    stopAudio();
    for (const [k, step] of steps.entries()) {
      const id = idOf.get(step.from);
      const handle = id === undefined ? null : handles.get(id);
      if (id === undefined || !handle) {
        failed = new Error(`${step.from} is no longer in the list`);
        break;
      }
      try {
        const moved = await moveFile(folder, handle, step.from, step.to);
        handles.set(id, moved);
        names.set(id, step.to);
        idOf.delete(step.from);
        idOf.set(step.to, id);
      } catch (error) {
        failed = error;
        break;
      }
      setProgress((k + 1) / steps.length);
    }
    // Moved handles return a fresh File; the old one may no longer be readable
    const refreshed = await Promise.all(
      rows.map(async (r) => {
        const name = names.get(r.id)!;
        if (name === r.name) return r;
        dropUrl(r.id);
        const handle = handles.get(r.id)!;
        let file = r.file;
        try {
          file = await handle.getFile();
        } catch {
          /* keep the old object, only previews depend on it */
        }
        return { ...r, name, handle, file, override: null };
      })
    );
    setRows(refreshed);
    setBusy(false);
    setProgress(null);
    if (failed) {
      toast.error(`Stopped: ${failed instanceof Error ? failed.message : String(failed)}`);
      return false;
    }
    return true;
  };

  const renameInFolder = async () => {
    const steps = planRenames(pairs);
    if (!steps.length) {
      toast.info('Nothing to rename, every name stays the same');
      return;
    }
    const ok = await runSteps(steps);
    if (ok) {
      setLastRename(pairs.filter((p) => p.from !== p.to));
      toast.success(`Renamed ${changes} file${changes > 1 ? 's' : ''} in ${folder?.name}`);
    }
  };

  const undoRename = useCallback(async () => {
    if (!lastRename || busy) return;
    const ok = await runSteps(planRenames(lastRename.map((p) => ({ from: p.to, to: p.from }))));
    if (ok) {
      setLastRename(null);
      toast.success('Rename undone');
    }
    // runSteps reads the current rows; it is recreated with them each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRename, busy, rows, folder]);

  const downloadZip = async () => {
    if (included.length === 1) {
      downloadBlob(included[0]!.file, finalNames[0]!);
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      included.forEach((r, i) => zip.file(finalNames[i]!, r.file));
      // Media is compressed already; storing keeps big batches fast
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (m) => setProgress(m.percent / 100));
      downloadBlob(blob, `${folder?.name ?? 'renamed-files'}.zip`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not build the ZIP');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const copyScript = async () => {
    const steps = planRenames(pairs);
    if (!steps.length) {
      toast.info('Nothing to rename, every name stays the same');
      return;
    }
    try {
      await navigator.clipboard.writeText(renameScript(steps, shell));
      toast.success(`${shell === 'powershell' ? 'PowerShell' : 'Bash'} commands copied`, {
        description: 'Paste them into a terminal opened in the folder with the files.',
      });
    } catch {
      toast.error('The clipboard is not available here');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && lastRename) {
        e.preventDefault();
        void undoRename();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lastRename, undoRename]);

  // ---- Presets ----
  const allPresets = [...BUILT_IN_PRESETS, ...presets];
  const rulesKey = JSON.stringify(rules);
  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    setPresets((prev) => [...prev.filter((p) => p.name !== name), { name, rules }]);
    setPresetName('');
    toast.success(`Preset "${name}" saved`);
  };

  const insertToken = (token: string) => {
    const input = templateRef.current;
    const at = input?.selectionStart ?? rules.template.length;
    const end = input?.selectionEnd ?? at;
    set('template', rules.template.slice(0, at) + token + rules.template.slice(end));
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(at + token.length, at + token.length);
    });
  };

  const commitEdit = () => {
    if (!editing) return;
    const row = rows.find((r) => r.id === editing.id);
    const index = included.findIndex((r) => r.id === editing.id);
    const value = editing.value.trim();
    if (row && index >= 0) patchRow(row.id, { override: !value || value === computed[index] ? null : value });
    setEditing(null);
  };

  const allIncluded = rows.length > 0 && rows.every((r) => r.include);
  const fixedSeparator = FIXED_SEPARATOR.includes(rules.caseStyle);

  const onWorkspaceDrop = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setDropping(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <ToolPageLayout
      title="File Renamer"
      description="Batch rename files with rules: remove words, replace text, change the case style and number files like name_001. Runs in your browser."
      keywords="file renamer, batch rename files, bulk rename, rename multiple files, snake case file names, number files, rename online"
      canonicalUrl="/tools/file-renamer"
      pageTitle="File Renamer - sLixTOOLS"
      pageDescription="Free online batch file renamer: remove words, find and replace, snake_case or kebab-case, add numbers like _001 and rename a whole folder in place. No uploads."
      breadcrumbLabel="File Renamer"
      belowTool={seoContent}
      faq={[
        {
          question: 'Can a website really rename files on my disk?',
          answer: 'In Chrome and Edge, yes: open a folder and allow editing, then the files are renamed in place. Other browsers download renamed copies as a ZIP or give you commands to run.',
        },
        {
          question: 'Are my files uploaded?',
          answer: 'No. Only file names are processed, on your device. File contents are read only for the preview and the ZIP download.',
        },
        {
          question: 'How does the numbering work?',
          answer: 'Each distinct name counts on its own, so door_open gets 001, 002 and door_close starts at 001 again. Switch to "Whole list" for one running number.',
        },
        {
          question: 'What if a new name already exists?',
          answer: 'The preview marks duplicates and names that would clash with unchecked files, and renaming waits until they are fixed. Swapped names are handled safely.',
        },
      ]}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      {rows.length === 0 ? (
        <div className={toolDropzone}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDropping(true);
            }}
            onDragLeave={() => setDropping(false)}
            onDrop={onWorkspaceDrop}
            aria-label="Add files to rename by dropping them here or pressing Enter to browse"
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
              dropping ? 'border-sky-400 bg-sky-400/10' : 'border-gray-700 hover:border-sky-400/50'
            )}
          >
            <div className="rounded-full bg-gray-800/50 p-3">
              <FilePen className="h-8 w-8 text-sky-400" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium text-white">Drop the files to rename</h3>
            <p className="mt-0 text-sm text-gray-400">Any type and any number, or click to browse</p>
          </div>
          {canPick && (
            <div className="mt-3 flex flex-col items-center gap-1.5">
              <button type="button" onClick={() => void openFolder()} disabled={busy} className={chipButton}>
                <FolderOpen className="h-4 w-4" aria-hidden="true" />
                Open a folder to rename in place
              </button>
            </div>
          )}
          <ul className={editorFeatures}>
            <li>Remove words</li>
            <li>Find &amp; replace</li>
            <li>snake_case, kebab-case &amp; more</li>
            <li>Numbers like _001</li>
            <li>Rename in place, ZIP or script</li>
          </ul>
        </div>
      ) : (
        <div className={editorWorkspace}>
          <div className={toolbarRow}>
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-sky-400/10 text-sky-400">
                {folder ? <FolderOpen className="h-5 w-5" aria-hidden="true" /> : <FilePen className="h-5 w-5" aria-hidden="true" />}
              </span>
              <div className="min-w-0 max-w-48">
                <p className="mt-0 truncate text-xs font-medium text-white" title={folder?.name}>
                  {folder ? folder.name : 'Dropped files'}
                </p>
                <p className="mt-0 truncate text-[11px] text-slate-400">
                  {rows.length} file{rows.length === 1 ? '' : 's'}
                  {folder ? ', renamed in place' : ''}
                </p>
              </div>
              <Tooltip label="Close" hint="Back to the upload area." side="bottom">
                <button type="button" onClick={clearAll} disabled={busy} aria-label="Close all files" className={toolButton}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
            <ToolbarDivider />
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} className={chipButton}>
                <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                Add files
              </button>
              {canPick && (
                <button type="button" onClick={() => void openFolder()} disabled={busy} className={chipButton}>
                  <FolderOpen className="h-4 w-4" aria-hidden="true" />
                  {folder ? 'Other folder' : 'Open folder'}
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              <div className="flex items-center gap-1">
                <Segments
                  label="Shell for the commands"
                  options={[
                    { value: 'powershell', label: 'PowerShell' },
                    { value: 'bash', label: 'Bash' },
                  ]}
                  value={shell}
                  onChange={setShell}
                  className="[&>button]:h-7 [&>button]:px-2"
                />
                <Tooltip label={blockedHint ?? 'Copy commands that rename the originals'} hint="Run them in a terminal inside the folder." side="bottom">
                  <button type="button" onClick={() => void copyScript()} disabled={blocked} aria-label="Copy rename commands" className={toolButton}>
                    <Terminal className="h-4 w-4" aria-hidden="true" />
                  </button>
                </Tooltip>
              </div>
              {folder && (
                <Tooltip label={blockedHint ?? 'Download renamed copies as a ZIP'} side="bottom">
                  <button type="button" onClick={() => void downloadZip()} disabled={blocked} aria-label="Download renamed copies" className={toolButton}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                  </button>
                </Tooltip>
              )}
              <ToolbarDivider />
              {lastRename && (
                <Tooltip label="Undo rename" shortcut="Ctrl+Z" side="bottom">
                  <button type="button" onClick={() => void undoRename()} disabled={busy} className={chipButton}>
                    <Undo2 className="h-4 w-4" aria-hidden="true" />
                    Undo
                  </button>
                </Tooltip>
              )}
              {folder ? (
                <Tooltip label={blockedHint ?? `Rename ${changes} file${changes === 1 ? '' : 's'} in ${folder.name}`} side="bottom">
                  <button type="button" onClick={() => void renameInFolder()} disabled={blocked || changes === 0} className={primaryButton}>
                    <FilePen className="h-4 w-4" aria-hidden="true" />
                    Rename {changes || ''} file{changes === 1 ? '' : 's'}
                  </button>
                </Tooltip>
              ) : (
                <Tooltip label={blockedHint ?? (included.length === 1 ? 'Download the renamed file' : 'Renamed copies in one ZIP')} side="bottom">
                  <button type="button" onClick={() => void downloadZip()} disabled={blocked} className={primaryButton}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {included.length === 1 ? 'Download' : 'Download ZIP'}
                  </button>
                </Tooltip>
              )}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[19rem_minmax(0,1fr)_19rem]">
            {/* File list */}
            <div
              className={cn('flex min-h-[40dvh] min-w-0 flex-col lg:min-h-0 xl:col-start-2 xl:row-start-1', dropping && 'bg-sky-400/[0.04]')}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes('Files')) return;
                e.preventDefault();
                setDropping(true);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropping(false);
              }}
              onDrop={onWorkspaceDrop}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 px-4 py-2 text-xs text-slate-400">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allIncluded}
                    onChange={(e) => setRows((prev) => prev.map((r) => ({ ...r, include: e.target.checked })))}
                    className="h-4 w-4 accent-sky-400"
                    aria-label="Select all files"
                  />
                  All
                </label>
                <span className="text-slate-500">Sort</span>
                <div className={segmentGroup} role="group" aria-label="Sort files">
                  {(['name', 'date', 'size', 'reverse'] as const).map((by) => (
                    <button key={by} type="button" onClick={() => sortRows(by)} className={segmentButton}>
                      {by === 'reverse' ? 'Reverse' : by[0]!.toUpperCase() + by.slice(1)}
                    </button>
                  ))}
                </div>
                <span className="ml-auto hidden text-slate-500 sm:inline">Unchecked files keep their name</span>
              </div>

              <ul className="min-h-0 flex-1 divide-y divide-white/[0.06] overflow-y-auto text-left" aria-label="Files">
                {rows.map((row) => {
                  const res = result.get(row.id);
                  const to = res?.to ?? row.name;
                  const changed = row.include && to !== row.name;
                  const isAudio = row.file.type.startsWith('audio/') || AUDIO_EXT.test(row.name);
                  const isImage = row.file.type.startsWith('image/');
                  return (
                    <li
                      key={row.id}
                      onDragOver={(e) => {
                        if (dragId === null) return;
                        e.preventDefault();
                        moveRow(dragId, row.id);
                      }}
                      className={cn(
                        'group grid grid-cols-[auto_auto_auto_minmax(0,1fr)_auto] items-center gap-x-2 px-3 py-1.5 md:grid-cols-[auto_auto_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto]',
                        !row.include && 'opacity-50',
                        dragId === row.id && 'bg-sky-400/10',
                        res?.issue && 'bg-red-500/[0.06]'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={row.include}
                        onChange={(e) => patchRow(row.id, { include: e.target.checked })}
                        className="h-4 w-4 accent-sky-400"
                        aria-label={`Rename ${row.name}`}
                      />
                      <span
                        draggable
                        onDragStart={(e) => {
                          setDragId(row.id);
                          e.dataTransfer.effectAllowed = 'move';
                          const li = e.currentTarget.closest('li');
                          if (li) e.dataTransfer.setDragImage(li, 16, 16);
                        }}
                        onDragEnd={() => setDragId(null)}
                        className="cursor-grab text-slate-600 hover:text-slate-300 active:cursor-grabbing"
                        aria-hidden="true"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>
                      <span className="flex h-7 w-7 items-center justify-center">
                        {isAudio ? (
                          <button
                            type="button"
                            onClick={() => togglePlay(row)}
                            aria-label={playingId === row.id ? `Stop ${row.name}` : `Play ${row.name}`}
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                              playingId === row.id ? 'bg-sky-400 text-black' : 'bg-white/[0.06] text-sky-300 hover:bg-sky-400/20'
                            )}
                          >
                            {playingId === row.id ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="ml-0.5 h-3.5 w-3.5" aria-hidden="true" />}
                          </button>
                        ) : isImage ? (
                          <img src={urlFor(row)} alt="" loading="lazy" className="h-7 w-7 rounded border border-white/10 object-cover" />
                        ) : (
                          <span className="font-mono text-[9px] uppercase text-slate-500">{row.name.split('.').pop()?.slice(0, 4)}</span>
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col md:block" title={row.name}>
                        {changed ? <Diff text={row.name} other={to} tone="old" /> : <span className="block truncate font-mono text-[13px] text-slate-300">{row.name}</span>}
                        <span className="text-[11px] text-slate-500 md:hidden">{formatFileSize(row.file.size)}</span>
                      </span>
                      <ArrowRight className={cn('hidden h-3.5 w-3.5 md:block', changed ? 'text-sky-400' : 'text-slate-700')} aria-hidden="true" />
                      <span className="col-span-3 col-start-3 row-start-2 flex min-w-0 items-center gap-1.5 md:col-span-1 md:col-start-auto md:row-start-auto">
                        {editing?.id === row.id ? (
                          <input
                            autoFocus
                            value={editing.value}
                            onChange={(e) => setEditing({ id: row.id, value: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit();
                              if (e.key === 'Escape') setEditing(null);
                            }}
                            onBlur={commitEdit}
                            aria-label={`New name for ${row.name}`}
                            className="h-7 w-full rounded border border-sky-400/60 bg-[#171714] px-2 font-mono text-[13px] text-white outline-none"
                          />
                        ) : row.include ? (
                          <button
                            type="button"
                            onClick={() => setEditing({ id: row.id, value: to })}
                            className="flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-white/[0.06]"
                            title="Click to type your own name"
                          >
                            {changed ? <Diff text={to} other={row.name} tone="new" /> : <span className="truncate font-mono text-[13px] text-slate-500">unchanged</span>}
                            {row.override !== null && <span className="shrink-0 rounded bg-amber-400/15 px-1 text-[10px] text-amber-300">edited</span>}
                          </button>
                        ) : (
                          <span className="px-1 font-mono text-[13px] text-slate-600">keeps its name</span>
                        )}
                        {row.override !== null && editing?.id !== row.id && (
                          <Tooltip label="Back to the rules">
                            <button type="button" onClick={() => patchRow(row.id, { override: null })} aria-label="Reset name" className="rounded p-1 text-slate-500 hover:bg-white/10 hover:text-white">
                              <RotateCcw className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </Tooltip>
                        )}
                      </span>
                      <span className="col-start-5 row-start-1 flex items-center gap-1 md:col-start-auto md:row-start-auto">
                        {res?.issue && (
                          <Tooltip label={ISSUE_TEXT[res.issue]}>
                            <span className="text-red-400" role="img" aria-label={ISSUE_TEXT[res.issue]}>
                              <TriangleAlert className="h-4 w-4" />
                            </span>
                          </Tooltip>
                        )}
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          aria-label={`Remove ${row.name} from the list`}
                          className="rounded p-1 text-slate-600 opacity-0 transition-opacity hover:bg-white/10 hover:text-white focus:opacity-100 group-hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Rules: one scrolling column at lg, a panel on each side of the list at xl */}
            <div className="min-h-0 border-t border-white/10 lg:overflow-y-auto lg:border-l lg:border-t-0 xl:contents">
            <div className={cn(sidePanel, 'xl:col-start-1 xl:border-r xl:border-white/10')}>
              <section className={ruleCard}>
                <div className="flex items-center justify-between gap-2">
                  <span className={sectionLabel}>Presets</span>
                  <Tooltip label="Reset all rules">
                    <button type="button" onClick={() => setRules(DEFAULT_RULES)} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white">
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Reset
                    </button>
                  </Tooltip>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allPresets.map((p) => {
                    const active = rulesKey === JSON.stringify({ ...DEFAULT_RULES, ...p.rules });
                    return (
                      <span
                        key={p.name}
                        className={cn(
                          'inline-flex items-center rounded-full border text-xs transition-colors',
                          active ? 'border-sky-400/60 bg-sky-400/15 text-sky-200' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25 hover:text-white'
                        )}
                      >
                        <button type="button" aria-pressed={active} onClick={() => setRules({ ...DEFAULT_RULES, ...p.rules })} className={cn('py-1 pl-3', p.builtIn ? 'pr-3' : 'pr-1.5')}>
                          {p.name}
                        </button>
                        {!p.builtIn && (
                          <button type="button" onClick={() => setPresets((prev) => prev.filter((x) => x.name !== p.name))} aria-label={`Delete preset ${p.name}`} className="mr-1 rounded-full p-0.5 text-slate-500 hover:bg-white/10 hover:text-white">
                            <X className="h-3 w-3" aria-hidden="true" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && savePreset()}
                    placeholder="New preset name"
                    aria-label="Preset name"
                    className={cn(fieldClass, 'h-8 flex-1')}
                  />
                  <button type="button" onClick={savePreset} disabled={!presetName.trim()} className={chipButton}>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    Save
                  </button>
                </div>
              </section>

              <RuleSection
                title="Remove words"
                icon={Eraser}
                on={rules.removeOn}
                onToggle={(v) => set('removeOn', v)}
                aside={
                  <label className="flex items-center gap-1.5 text-xs text-slate-400">
                    <input type="checkbox" checked={rules.removeRegex} onChange={(e) => set('removeRegex', e.target.checked)} className="h-3.5 w-3.5 accent-sky-400" />
                    Regex
                  </label>
                }
              >
                <WordList words={rules.removeWords} onChange={(w) => set('removeWords', w)} />
              </RuleSection>

              <RuleSection
                title="Find and replace"
                icon={Replace}
                on={rules.replaceOn}
                onToggle={(v) => set('replaceOn', v)}
                aside={
                  <label className="flex items-center gap-1.5 text-xs text-slate-400">
                    <input type="checkbox" checked={rules.replaceRegex} onChange={(e) => set('replaceRegex', e.target.checked)} className="h-3.5 w-3.5 accent-sky-400" />
                    Regex
                  </label>
                }
              >
                {rules.replacements.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      value={p.find}
                      onChange={(e) => set('replacements', rules.replacements.map((x, k) => (k === i ? { ...x, find: e.target.value } : x)))}
                      placeholder="Find"
                      aria-label={`Find ${i + 1}`}
                      className={cn(fieldClass, 'h-8 font-mono', rules.replaceRegex && p.find && !safeRegex(p.find, true) && 'border-red-500/60')}
                    />
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                    <input
                      value={p.replace}
                      onChange={(e) => set('replacements', rules.replacements.map((x, k) => (k === i ? { ...x, replace: e.target.value } : x)))}
                      placeholder="Replace"
                      aria-label={`Replace ${i + 1}`}
                      className={cn(fieldClass, 'h-8 font-mono')}
                    />
                    <button
                      type="button"
                      onClick={() => set('replacements', rules.replacements.length > 1 ? rules.replacements.filter((_, k) => k !== i) : [{ find: '', replace: '' }])}
                      aria-label={`Remove replacement ${i + 1}`}
                      className="shrink-0 rounded p-1 text-slate-500 hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => set('replacements', [...rules.replacements, { find: '', replace: '' }])} className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add replacement
                </button>
                {badRegex && <p className="mt-0 text-xs text-red-300">A regex does not compile and is skipped.</p>}
              </RuleSection>


              <RuleSection title="Clean up" icon={Eraser} on={rules.cleanupOn} onToggle={(v) => set('cleanupOn', v)}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">Separator</span>
                  <Segments label="Separator" options={SEPARATORS} value={rules.separator} onChange={(v) => set('separator', v)} disabled={fixedSeparator} />
                </div>
                {fixedSeparator && <p className="mt-0 text-[11px] text-slate-500">The case style sets the separator.</p>}
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input type="checkbox" checked={rules.splitCamel} onChange={(e) => set('splitCamel', e.target.checked)} className="h-4 w-4 accent-sky-400" />
                  Split CamelCase words (DoorOpen → door_open)
                </label>
              </RuleSection>
            </div>

            <div className={cn(sidePanel, 'border-t border-white/10 xl:col-start-3 xl:border-l xl:border-t-0')}>
              <RuleSection title="New name" icon={FilePen}>
                <input
                  ref={templateRef}
                  value={rules.template}
                  onChange={(e) => set('template', e.target.value)}
                  placeholder="{name}, or a fixed name like door_open"
                  title="A fixed name like door_open gives all files the same base, numbered"
                  aria-label="Name template"
                  className={cn(fieldClass, 'font-mono')}
                />
                <div className="flex flex-wrap gap-1">
                  {TOKENS.map((t) => (
                    <Tooltip key={t.token} label={t.hint}>
                      <button type="button" onClick={() => insertToken(t.token)} className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[11px] text-slate-300 hover:border-sky-400/50 hover:text-white">
                        {t.token}
                      </button>
                    </Tooltip>
                  ))}
                </div>
              </RuleSection>

              <RuleSection title="Case style" icon={CaseSensitive}>
                <Segments label="Case style" options={CASES} value={rules.caseStyle} onChange={(v) => set('caseStyle', v)} className={cn(segmentGrid, 'grid-cols-4')} />
              </RuleSection>

              <RuleSection title="Numbering" icon={ListOrdered} on={rules.numberOn} onToggle={(v) => set('numberOn', v)}>
                <div className="grid grid-cols-3 gap-2">
                  <label className="space-y-1 text-xs text-slate-400">
                    Start
                    <input type="number" min={0} value={rules.numberStart} onChange={(e) => set('numberStart', Math.max(0, Number(e.target.value) || 0))} className={numberField} />
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    Digits
                    <input type="number" min={1} max={8} value={rules.numberPad} onChange={(e) => set('numberPad', Math.min(8, Math.max(1, Number(e.target.value) || 1)))} className={numberField} />
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    Step
                    <input type="number" min={1} value={rules.numberStep} onChange={(e) => set('numberStep', Math.max(1, Number(e.target.value) || 1))} className={numberField} />
                  </label>
                </div>
                {!rules.template.includes('{n}') && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-16 text-xs text-slate-400">Separator</span>
                    <Segments label="Number separator" options={SEPARATORS} value={rules.numberSeparator} onChange={(v) => set('numberSeparator', v)} />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-16 text-xs text-slate-400">Count</span>
                  <Segments
                    label="Count numbers"
                    options={[
                      { value: 'name', label: 'Per name' },
                      { value: 'all', label: 'Whole list' },
                    ]}
                    value={rules.numberScope}
                    onChange={(v) => set('numberScope', v)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-200" title="door_open_003 unchecked: new files start at 004">
                  <input type="checkbox" checked={rules.numberContinue} onChange={(e) => set('numberContinue', e.target.checked)} className="h-4 w-4 accent-sky-400" />
                  Continue after unchecked files
                </label>
              </RuleSection>

              <RuleSection title="Extension" icon={Hash}>
                <Segments label="Extension" options={EXT_MODES} value={rules.extMode} onChange={(v) => set('extMode', v)} className={cn(segmentGrid, 'grid-cols-4')} />
                {rules.extMode === 'set' && (
                  <input value={rules.extValue} onChange={(e) => set('extValue', e.target.value)} placeholder="e.g. jpg, empty removes it" aria-label="New extension" className={cn(fieldClass, 'font-mono')} />
                )}
              </RuleSection>
            </div>
            </div>
          </div>

          <div className={statusRow}>
            <span>Files: {rows.length}</span>
            <span className={changes ? 'text-sky-300' : undefined}>Changing: {changes}</span>
            {taken.length > 0 && <span>Unchecked: {taken.length}</span>}
            {problemCount > 0 && <span className="text-red-300">Problems: {problemCount}</span>}
            {progress !== null && (
              <span className="flex items-center gap-2">
                <Progress value={progress * 100} className="h-1.5 w-24" />
                {Math.round(progress * 100)}%
              </span>
            )}
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
};

export default FileRenamer;
