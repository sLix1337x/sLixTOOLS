import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Bug, CheckCircle, Copy, Download, FileCode2, ShieldCheck, Trash2, Upload, WrapText } from 'lucide-react';
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
  statusRow,
  toolButton,
  toolWorkspace,
  toolbarRow,
} from '@/styles/constants';
import { formatXmlString } from '@/utils/xmlFormat';
import { downloadBlob } from '@/utils/download';
import { formatFileSize } from '@/utils/formatters';

const guideItem = (term: string, text: string) => (
  <li key={term}>
    <strong className="text-white">{term}</strong> {text}
  </li>
);

const seoContent = (
  <div className="max-w-6xl mx-auto px-4 space-y-6">
    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
        <FileCode2 className="h-5 w-5" aria-hidden="true" />
      </span>
      Working with XML
    </h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          What Is Checked
        </h3>
        <p className="mt-0 text-sm leading-relaxed text-gray-300">
          The editor checks that the document is well-formed: every tag closes, tags nest correctly and there is one
          root element. It does not validate against an XSD or DTD, so a required element that is missing still counts
          as valid.
        </p>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Bug className="h-5 w-5" aria-hidden="true" />
          Common Errors
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Raw & or <:', 'write &amp; and &lt; in text and attributes.')}
          {guideItem('Mismatched tags:', 'names are case-sensitive, <Item> needs </Item>.')}
          {guideItem('Unquoted attributes:', 'write id="1", not id=1.')}
          {guideItem('Two root elements:', 'wrap them in a single parent.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <WrapText className="h-5 w-5" aria-hidden="true" />
          Format and Minify
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Format:', 'indents with 2 spaces. Text, comments, CDATA and xml:space="preserve" stay unchanged.')}
          {guideItem('Minify:', 'removes all whitespace between tags. Avoid it if a space between inline tags matters.')}
        </ul>
      </section>
    </div>
  </div>
);

const XmlEditor = () => {
  const [xmlContent, setXmlContent] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string>('');

  const validateXml = useCallback((xml: string) => {
    if (!xml.trim()) {
      setIsValid(null);
      setValidationError('');
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'application/xml');
      const parserError = doc.querySelector('parsererror');

      if (parserError) {
        setIsValid(false);
        // Chrome surrounds the message with text about page rendering; the div holds only the error
        setValidationError(parserError.querySelector('div')?.textContent || parserError.textContent || 'Invalid XML format');
      } else {
        setIsValid(true);
        setValidationError('');
      }
    } catch {
      setIsValid(false);
      setValidationError('Invalid XML format');
    }
  }, []);

  const handleXmlChange = useCallback((value: string) => {
    setXmlContent(value);
    validateXml(value);
  }, [validateXml]);

  const formatXml = useCallback(() => {
    if (!xmlContent.trim()) {
      toast.error('No XML content to format!');
      return;
    }

    try {
      setXmlContent(formatXmlString(xmlContent));
      toast.success('XML formatted successfully!');
    } catch {
      toast.error('Cannot format invalid XML!');
    }
  }, [xmlContent]);

  const minifyXml = useCallback(() => {
    if (!xmlContent.trim()) {
      toast.error('No XML content to minify!');
      return;
    }

    try {
      const minified = xmlContent
        .replace(/>\s+</g, '><')
        .trim();

      setXmlContent(minified);
      toast.success('XML minified successfully!');
    } catch {
      toast.error('Error minifying XML!');
    }
  }, [xmlContent]);

  const clearContent = useCallback(() => {
    setXmlContent('');
    setIsValid(null);
    setValidationError('');
    toast.success('Content cleared!');
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!xmlContent) {
      toast.error('No XML content to copy!');
      return;
    }

    try {
      await navigator.clipboard.writeText(xmlContent);
      toast.success('XML copied to clipboard!');
    } catch {
      toast.error('Unable to copy automatically. Please copy manually.');
    }
  }, [xmlContent]);

  const downloadXml = useCallback(() => {
    if (!xmlContent.trim()) {
      toast.error('No XML content to download!');
      return;
    }

    downloadBlob(new Blob([xmlContent], { type: 'application/xml' }), 'document.xml');
    toast.success('XML file downloaded!');
  }, [xmlContent]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml')) {
      toast.error('Please select an XML file!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setXmlContent(content);
      validateXml(content);
      toast.success('XML file loaded successfully!');
    };
    reader.onerror = () => {
      toast.error('Error reading file!');
    };
    reader.readAsText(file);
  }, [validateXml]);

  const loadSampleXml = useCallback(() => {
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<bookstore>
  <book id="1">
    <title>The Great Gatsby</title>
    <author>F. Scott Fitzgerald</author>
    <year>1925</year>
    <price currency="USD">12.99</price>
  </book>
  <book id="2">
    <title>To Kill a Mockingbird</title>
    <author>Harper Lee</author>
    <year>1960</year>
    <price currency="USD">14.99</price>
  </book>
</bookstore>`;

    setXmlContent(sampleXml);
    validateXml(sampleXml);
    toast.success('Sample XML loaded!');
  }, [validateXml]);

  const statItems = [
    ['Lines', xmlContent.split('\n').length.toLocaleString()],
    ['Size', formatFileSize(new Blob([xmlContent]).size)],
  ];

  return (
    <ToolPageLayout
      title="XML Editor"
      description="Edit, format, minify and validate XML with real-time error detection."
      keywords="xml editor, xml formatter, xml validator, xml minifier, xml syntax"
      canonicalUrl="/tools/xml-editor"
      pageTitle="XML Editor - sLixTOOLS"
      pageDescription="Free online XML editor. Check documents for errors as you type, pretty-print, minify, upload and download - entirely in your browser."
      breadcrumbLabel="XML Editor"
      belowTool={seoContent}
      faq={[
        {
          question: 'Does the editor validate my XML?',
          answer: 'Yes, the document is checked in real time and parse errors are reported with line information as you type.',
        },
        {
          question: 'Does it check against an XSD or DTD?',
          answer: 'No. It checks that the document is well-formed, not that it follows a schema.',
        },
        {
          question: 'Can I format and minify XML?',
          answer: 'Both. Format pretty-prints with 2-space indentation, Minify removes the whitespace between tags.',
        },
        {
          question: 'Is my XML data sent anywhere?',
          answer: 'No. Editing, validation and formatting all happen locally in your browser.',
        },
      ]}
    >
      <div className={toolWorkspace}>
        <div className={toolbarRow}>
          <input type="file" accept=".xml" onChange={handleFileUpload} className="hidden" id="file-upload" />
          <div className="flex flex-wrap items-center gap-1">
            <Tooltip label="Upload file" hint="Opens an .xml file. It stays on your device." side="bottom">
              <button
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
                aria-label="Upload XML file"
                className={toolButton}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <button type="button" onClick={loadSampleXml} className={chipButton}>
              Load sample
            </button>
            <ToolbarDivider />
            <button type="button" onClick={formatXml} disabled={!xmlContent.trim() || !isValid} className={primaryButton}>
              Format
            </button>
            <button type="button" onClick={minifyXml} disabled={!xmlContent.trim()} className={cn(chipButton, 'ml-1')}>
              Minify
            </button>
            <ToolbarDivider />
            <Tooltip label="Copy" side="bottom">
              <button
                type="button"
                onClick={copyToClipboard}
                disabled={!xmlContent.trim()}
                aria-label="Copy XML"
                className={toolButton}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="Download" hint="Saves as document.xml." side="bottom">
              <button
                type="button"
                onClick={downloadXml}
                disabled={!xmlContent.trim()}
                aria-label="Download XML"
                className={toolButton}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="Clear" side="bottom">
              <button
                type="button"
                onClick={clearContent}
                disabled={!xmlContent.trim()}
                aria-label="Clear editor"
                className={toolButton}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
          <p aria-live="polite" className="mt-0 flex items-center gap-1.5 text-sm lg:ml-auto">
            {isValid !== null &&
              (isValid ? (
                <>
                  <CheckCircle className="h-4 w-4 text-sky-400" aria-hidden="true" />
                  <span className="text-sky-400">Valid XML</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-400" aria-hidden="true" />
                  <span className="text-red-400">Invalid XML</span>
                </>
              ))}
          </p>
        </div>

        {validationError && (
          <div className={errorRow}>
            <p className="mt-0 min-w-0 break-words">{validationError}</p>
          </div>
        )}

        <CodeEditor
          id="xml-content"
          label="XML content"
          placeholder="Enter your XML content here or upload an XML file..."
          value={xmlContent}
          onChange={handleXmlChange}
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

export default XmlEditor;
