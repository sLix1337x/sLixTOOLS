import React, { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Braces, Copy, Trash2, Download, Upload, CheckCircle, AlertCircle, ListChecks, Check, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ToolPageLayout from '@/components/ToolPageLayout';
import Divider from '@/components/ui/divider';
import '@/styles/xml-editor.css';
import { validateJson, formatJson, minifyJson, type JsonIndent, type JsonResult } from '@/utils/jsonValidate';
import { formatFileSize } from '@/utils/formatters';
import { downloadBlob } from '@/utils/download';

const LINE_HEIGHT_PX = 24; // 1.5rem
const VALIDATE_DELAY_MS = 300;
const INDENT_OPTIONS: Record<string, JsonIndent> = { '2': 2, '4': 4, tab: '\t' };

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

const JsonValidator = () => {
  const [jsonContent, setJsonContent] = useState<string>('');
  const [result, setResult] = useState<JsonResult>({ status: 'empty' });
  const [indent, setIndent] = useState<string>('2');
  const [sortKeys, setSortKeys] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Debounced so large documents don't re-parse on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setResult(validateJson(jsonContent)), VALIDATE_DELAY_MS);
    return () => clearTimeout(id);
  }, [jsonContent]);

  const lineCount = jsonContent.split('\n').length;
  const errorLine = result.status === 'invalid' ? result.location?.line : undefined;

  useEffect(() => {
    if (!lineNumbersRef.current) return;
    let html = '';
    for (let i = 1; i <= lineCount; i++) {
      html +=
        i === errorLine
          ? `<div class="line-number" style="color:#f87171;background:rgba(239,68,68,0.2)">${i}</div>`
          : `<div class="line-number">${i}</div>`;
    }
    lineNumbersRef.current.innerHTML = html;
    if (textareaRef.current) lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
  }, [lineCount, errorLine]);

  const handleScroll = useCallback(() => {
    if (!lineNumbersRef.current || !textareaRef.current) return;
    lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
  }, []);

  const jumpToError = useCallback(() => {
    const textarea = textareaRef.current;
    if (result.status !== 'invalid' || !result.location || !textarea) return;
    const { offset, line } = result.location;
    textarea.focus();
    textarea.setSelectionRange(offset, Math.min(offset + 1, jsonContent.length));
    textarea.scrollTop = Math.max(0, (line - 1) * LINE_HEIGHT_PX - textarea.clientHeight / 2);
    handleScroll();
  }, [result, jsonContent.length, handleScroll]);

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

  return (
    <ToolPageLayout
      title="JSON Validator"
      description="Validate, format, minify and inspect JSON with exact error locations."
      keywords="json validator, json formatter, json lint, json minifier, json beautifier, sort json keys"
      canonicalUrl="/tools/json-validator"
      pageTitle="JSON Validator & Formatter - sLixTOOLS"
      pageDescription="Free online JSON validator and formatter. Find errors by line and column, pretty-print, minify and sort keys - entirely in your browser."
      breadcrumbLabel="JSON Validator"
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
      <div className="max-w-6xl mx-auto">
        <div className="space-y-6">
          {/* Header with validation status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label htmlFor="json-content" className="text-white text-lg font-semibold flex items-center">
                <Braces className="h-5 w-5 mr-2" />
                JSON Content:
              </Label>
              {result.status !== 'empty' && (
                <div className="flex items-center space-x-1" aria-live="polite">
                  {result.status === 'valid' ? (
                    <CheckCircle className="h-4 w-4 text-sky-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={`text-sm ${result.status === 'valid' ? 'text-sky-400' : 'text-red-400'}`}>
                    {result.status === 'valid' ? 'Valid JSON' : 'Invalid JSON'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Button
                onClick={() => document.getElementById('file-upload')?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 h-9"
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </Button>
              <Button
                onClick={loadSampleJson}
                className="bg-purple-600 hover:bg-purple-700 text-white border-0 h-9"
              >
                Load Sample
              </Button>
            </div>
          </div>

          {/* Error message */}
          {result.status === 'invalid' && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-start justify-between gap-3">
              <div className="text-sm">
                {result.location && (
                  <p className="text-red-300 font-semibold">
                    Line {result.location.line}, column {result.location.column}
                  </p>
                )}
                <p className="text-red-400 break-all">{result.message}</p>
              </div>
              {result.location && (
                <Button
                  onClick={jumpToError}
                  className="bg-red-600 hover:bg-red-700 text-white border-0 h-8 flex-shrink-0"
                >
                  <Crosshair className="h-4 w-4 mr-1" />
                  Go to error
                </Button>
              )}
            </div>
          )}

          {/* JSON Editor with Line Numbers */}
          <div className="relative">
            <div className="flex border border-white/20 rounded-lg overflow-hidden" style={{ backgroundColor: '#171714' }}>
              {/* Line Numbers */}
              <div
                ref={lineNumbersRef}
                className="flex flex-col text-gray-500 text-sm font-mono bg-gray-800/50 border-r border-white/10 px-2 py-3 select-none overflow-hidden"
                style={{
                  minWidth: '50px',
                  maxHeight: '400px',
                  lineHeight: '1.5rem'
                }}
              />

              {/* Textarea */}
              <Textarea
                ref={textareaRef}
                id="json-content"
                placeholder="Paste your JSON here or upload a .json file..."
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                onScroll={handleScroll}
                spellCheck={false}
                wrap="off"
                className="flex-1 min-h-[400px] h-[400px] whitespace-pre overflow-x-auto border-0 text-white placeholder-gray-400 resize-none text-sm font-mono bg-transparent focus:ring-0 focus:outline-none"
                style={{
                  lineHeight: '1.5rem',
                  paddingLeft: '12px',
                  paddingTop: '12px',
                  paddingBottom: '12px'
                }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            {[
              ['Status', result.status === 'empty' ? '-' : result.status === 'valid' ? 'Valid' : 'Invalid'],
              ['Size', stats ? formatFileSize(stats.bytes) : '-'],
              ['Depth', stats ? stats.depth : '-'],
              ['Object keys', stats ? stats.keys.toLocaleString() : '-'],
              ['Array elements', stats ? stats.elements.toLocaleString() : '-'],
            ].map(([label, value]) => (
              <div key={label} className="bg-gray-900/50 border border-white/10 rounded-lg p-3">
                <div className="text-gray-400 text-xs">{label}</div>
                <div className="text-white font-mono">{value}</div>
              </div>
            ))}
          </div>

          {/* Options */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="json-indent" className="text-white text-sm">Indentation</Label>
              <Select value={indent} onValueChange={setIndent}>
                <SelectTrigger id="json-indent" className="bg-gray-700 border-gray-600 text-white h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="2">2 spaces</SelectItem>
                  <SelectItem value="4">4 spaces</SelectItem>
                  <SelectItem value="tab">Tab</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sort-keys"
                checked={sortKeys}
                onChange={(e) => setSortKeys(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="sort-keys" className="text-white text-sm">
                Sort keys alphabetically
              </Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <Button
              onClick={formatJsonContent}
              disabled={!jsonContent.trim() || result.status === 'invalid'}
              className="bg-primary-action hover:bg-primary-action/90 shadow-[0_0_15px_rgba(56,189,248,0.5)] hover:shadow-[0_0_25px_rgba(56,189,248,0.7)] transition-shadow duration-300 text-white border-0 h-9"
            >
              Format
            </Button>

            <Button
              onClick={minifyJsonContent}
              disabled={!jsonContent.trim() || result.status === 'invalid'}
              className="bg-orange-600 hover:bg-orange-700 text-white border-0 h-9"
            >
              Minify
            </Button>

            <Button
              onClick={copyToClipboard}
              disabled={!jsonContent.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0 h-9"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>

            <Button
              onClick={downloadJson}
              disabled={!jsonContent.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 h-9"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>

            <Button
              onClick={clearContent}
              disabled={!jsonContent.trim()}
              className="bg-red-600 hover:bg-red-700 text-white border-0 h-9"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>

          {/* Features Info */}
          <Divider className="my-4" />
          <div className="bg-gray-900/50 border border-white/10 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-sky-400" aria-hidden="true" />
              Features:
            </h3>
            <ul className="text-gray-300 text-sm space-y-1.5">
              {[
                'Validation as you type with line and column of the first error',
                'Jump straight to the error location',
                'Format with 2 spaces, 4 spaces or tabs',
                'Minify JSON to a single line',
                'Optionally sort object keys alphabetically',
                'Size, nesting depth, key and element counts',
                'Upload, download and copy JSON',
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Check className="h-3.5 w-3.5 text-sky-400 mt-1 flex-shrink-0" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default JsonValidator;
