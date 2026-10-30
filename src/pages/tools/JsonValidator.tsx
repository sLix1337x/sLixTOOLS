import React, { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { AlertCircle, ArrowDownAZ, Braces, Bug, CheckCircle, Copy, Crosshair, Download, ListTree, Trash2, TriangleAlert, Upload } from 'lucide-react';
import ToolPageLayout from '@/components/ToolPageLayout';
import CodeEditor from '@/components/tools/CodeEditor';
import { ToolbarDivider } from '@/components/tools/ToolBar';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  chipButton,
  errorRow,
  guideCard,
  guideHeading,
  primaryButton,
  segmentButton,
  segmentGroup,
  statusRow,
  toolButton,
  toolWorkspace,
  toolbarRow,
} from '@/styles/constants';
import { validateJson, formatJson, minifyJson, type JsonIndent, type JsonResult } from '@/utils/jsonValidate';
import { formatFileSize } from '@/utils/formatters';
import { downloadBlob } from '@/utils/download';

const LINE_HEIGHT_PX = 24; // 1.5rem
const VALIDATE_DELAY_MS = 300;
const INDENT_OPTIONS: Record<string, JsonIndent> = { '2': 2, '4': 4, Tab: '\t' };

const SAMPLE_JSON = `{
  "store": "sLix Books",
  "open": true,
  "books": [
    { "id": 1, "title": "The Great Gatsby", "author": "F. Scott Fitzgerald", "year": 1925, "price": 12.99 },
    { "id": 2, "title": "To Kill a Mockingbird", "author": "Harper Lee", "year": 1960, "price": 14.99 }
  ],
  "address": { "city": "Berlin", "zip": "10115" },
  "manager": null
}`;

const guideItem = (term: string, text: string) => (
  <li key={term}>
    <strong className="text-white">{term}</strong> {text}
  </li>
);

const seoContent = (
  <div className="max-w-6xl mx-auto px-4 space-y-6">
    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
        <Braces className="h-5 w-5" aria-hidden="true" />
      </span>
      Working with JSON
    </h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Bug className="h-5 w-5" aria-hidden="true" />
          Common Errors
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Trailing commas:', 'remove the comma after the last item.')}
          {guideItem('Single quotes:', 'keys and strings need double quotes.')}
          {guideItem('Unquoted keys:', 'write {"id": 1}, not {id: 1}.')}
          {guideItem('Comments:', 'JSON has none, remove them first.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <TriangleAlert className="h-5 w-5" aria-hidden="true" />
          Before You Format
        </h3>
        <p className="mt-0 text-sm leading-relaxed text-gray-300">
          Format and Minify rewrite the parsed data. Of duplicate keys only the last one stays, 1.0 becomes 1, and
          integers beyond 9,007,199,254,740,991 lose precision. Validation alone changes nothing, so stop there for
          data with large numeric IDs.
        </p>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <ListTree className="h-5 w-5" aria-hidden="true" />
          Reading the Status Bar
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Depth:', 'nesting levels of objects and arrays.')}
          {guideItem('Object keys:', 'all keys, including nested ones.')}
          {guideItem('Array elements:', 'all items, including nested ones.')}
        </ul>
      </section>
    </div>
  </div>
);

const JsonValidator = () => {
  const [jsonContent, setJsonContent] = useState<string>('');
  const [result, setResult] = useState<JsonResult>({ status: 'empty' });
  const [indent, setIndent] = useState<string>('2');
  const [sortKeys, setSortKeys] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Debounced so large documents don't re-parse on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setResult(validateJson(jsonContent)), VALIDATE_DELAY_MS);
    return () => clearTimeout(id);
  }, [jsonContent]);

  const errorLine = result.status === 'invalid' ? result.location?.line : undefined;

  const jumpToError = useCallback(() => {
    const textarea = textareaRef.current;
    if (result.status !== 'invalid' || !result.location || !textarea) return;
    const { offset, line } = result.location;
    textarea.focus();
    textarea.setSelectionRange(offset, Math.min(offset + 1, jsonContent.length));
    textarea.scrollTop = Math.max(0, (line - 1) * LINE_HEIGHT_PX - textarea.clientHeight / 2);
  }, [result, jsonContent.length]);

  const transform = useCallback(
    (fn: (text: string) => string, done: string) => {
      if (!jsonContent.trim()) {
        toast.error('No JSON content!');
        return;
      }
      try {
        const out = fn(jsonContent);
        setJsonContent(out);
        setResult(validateJson(out));
        toast.success(done);
      } catch {
        toast.error('Fix the JSON errors first!');
      }
    },
    [jsonContent]
  );

  const formatJsonContent = useCallback(
    () => transform((t) => formatJson(t, INDENT_OPTIONS[indent], sortKeys), 'JSON formatted successfully!'),
    [transform, indent, sortKeys]
  );

  const minifyJsonContent = useCallback(
    () => transform((t) => minifyJson(t, sortKeys), 'JSON minified successfully!'),
    [transform, sortKeys]
  );

  const clearContent = useCallback(() => {
    setJsonContent('');
    setResult({ status: 'empty' });
    toast.success('Content cleared!');
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!jsonContent) {
      toast.error('No JSON content to copy!');
      return;
    }

    try {
      await navigator.clipboard.writeText(jsonContent);
      toast.success('JSON copied to clipboard!');
    } catch {
      toast.error('Unable to copy automatically. Please copy manually.');
    }
  }, [jsonContent]);

  const downloadJson = useCallback(() => {
    if (!jsonContent.trim()) {
      toast.error('No JSON content to download!');
      return;
    }

    downloadBlob(new Blob([jsonContent], { type: 'application/json' }), 'data.json');
    toast.success('JSON file downloaded!');
  }, [jsonContent]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      toast.error('Please select a JSON file!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonContent(content);
      setResult(validateJson(content));
      toast.success('JSON file loaded successfully!');
    };
    reader.onerror = () => {
      toast.error('Error reading file!');
    };
    reader.readAsText(file);
  }, []);

  const loadSampleJson = useCallback(() => {
    setJsonContent(SAMPLE_JSON);
    setResult(validateJson(SAMPLE_JSON));
    toast.success('Sample JSON loaded!');
  }, []);

  const stats = result.status === 'valid' ? result.stats : null;

  const statItems = [
    ['Lines', jsonContent.split('\n').length.toLocaleString()],
    ['Size', stats ? formatFileSize(stats.bytes) : '-'],
    ['Depth', stats ? stats.depth : '-'],
    ['Object keys', stats ? stats.keys.toLocaleString() : '-'],
    ['Array elements', stats ? stats.elements.toLocaleString() : '-'],
  ];

  return (
    <ToolPageLayout
      title="JSON Validator"
      description="Validate, format, minify and inspect JSON with exact error locations."
      keywords="json validator, json formatter, json lint, json minifier, json beautifier, sort json keys"
      canonicalUrl="/tools/json-validator"
      pageTitle="JSON Validator & Formatter - sLixTOOLS"
      pageDescription="Free online JSON validator and formatter. Find errors by line and column, pretty-print, minify and sort keys - entirely in your browser."
      breadcrumbLabel="JSON Validator"
      belowTool={seoContent}
      faq={[
        {
          question: 'How do I find where my JSON is broken?',
          answer: 'Errors show the line and column reported by your browser. Click "Go to error" to jump there; the line number is highlighted in red.',
        },
        {
          question: 'Can I format, minify and sort JSON keys?',
          answer: 'Yes. Pretty-print with 2 spaces, 4 spaces or tabs, minify to a single line, and optionally sort object keys alphabetically.',
        },
        {
          question: 'Is my JSON data sent anywhere?',
          answer: 'No. Validation and formatting happen locally in your browser.',
        },
      ]}
    >
      <div className={toolWorkspace}>
        <div className={toolbarRow}>
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <div className="flex flex-wrap items-center gap-1">
            <Tooltip label="Upload file" hint="Opens a .json file. It stays on your device." side="bottom">
              <button
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
                aria-label="Upload JSON file"
                className={toolButton}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <button type="button" onClick={loadSampleJson} className={chipButton}>
              Load sample
            </button>
            <ToolbarDivider />
            <button
              type="button"
              onClick={formatJsonContent}
              disabled={!jsonContent.trim() || result.status === 'invalid'}
              className={primaryButton}
            >
              Format
            </button>
            <button
              type="button"
              onClick={minifyJsonContent}
              disabled={!jsonContent.trim() || result.status === 'invalid'}
              className={cn(chipButton, 'ml-1')}
            >
              Minify
            </button>
            <ToolbarDivider />
            <span id="json-indent-label" className="text-xs text-slate-400">
              Indent
            </span>
            <div role="group" aria-labelledby="json-indent-label" className={cn(segmentGroup, 'ml-1')}>
              {Object.keys(INDENT_OPTIONS).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={indent === option}
                  onClick={() => setIndent(option)}
                  className={segmentButton}
                >
                  {option}
                </button>
              ))}
            </div>
            <Tooltip label="Sort keys" hint="Format and Minify order object keys A to Z." side="bottom">
              <button
                type="button"
                aria-pressed={sortKeys}
                onClick={() => setSortKeys(!sortKeys)}
                aria-label="Sort keys alphabetically"
                className={toolButton}
              >
                <ArrowDownAZ className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <ToolbarDivider />
            <Tooltip label="Copy" side="bottom">
              <button
                type="button"
                onClick={copyToClipboard}
                disabled={!jsonContent.trim()}
                aria-label="Copy JSON"
                className={toolButton}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="Download" hint="Saves as data.json." side="bottom">
              <button
                type="button"
                onClick={downloadJson}
                disabled={!jsonContent.trim()}
                aria-label="Download JSON"
                className={toolButton}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="Clear" side="bottom">
              <button
                type="button"
                onClick={clearContent}
                disabled={!jsonContent.trim()}
                aria-label="Clear editor"
                className={toolButton}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
          <p aria-live="polite" className="mt-0 flex items-center gap-1.5 text-sm lg:ml-auto">
            {result.status === 'valid' && (
              <>
                <CheckCircle className="h-4 w-4 text-sky-400" aria-hidden="true" />
                <span className="text-sky-400">Valid JSON</span>
              </>
            )}
            {result.status === 'invalid' && (
              <>
                <AlertCircle className="h-4 w-4 text-red-400" aria-hidden="true" />
                <span className="text-red-400">Invalid JSON</span>
              </>
            )}
          </p>
        </div>

        {result.status === 'invalid' && (
          <div className={errorRow}>
            <p className="mt-0 min-w-0 break-words">
              {result.location && (
                <strong className="mr-2 font-semibold text-red-200">
                  Line {result.location.line}, column {result.location.column}
                </strong>
              )}
              {result.message}
            </p>
            {result.location && (
              <button type="button" onClick={jumpToError} className={cn(chipButton, 'flex-shrink-0')}>
                <Crosshair className="h-4 w-4" aria-hidden="true" />
                Go to error
              </button>
            )}
          </div>
        )}

        <CodeEditor
          ref={textareaRef}
          id="json-content"
          label="JSON content"
          placeholder="Paste your JSON here or upload a .json file..."
          value={jsonContent}
          onChange={setJsonContent}
          errorLine={errorLine}
        />

        <dl className={statusRow}>
          {statItems.map(([label, value]) => (
            <div key={label} className="flex gap-1.5">
              <dt>{label}:</dt>
              <dd className="tabular-nums text-slate-200">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </ToolPageLayout>
  );
};

export default JsonValidator;
