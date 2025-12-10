import React, { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { FileText, Copy, Trash2, Download, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ToolPageLayout from '@/components/ToolPageLayout';
import '@/styles/xml-editor.css';

const XmlEditor: React.FC = () => {
  const [xmlContent, setXmlContent] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

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
        setValidationError(parserError.textContent || 'Invalid XML format');
      } else {
        setIsValid(true);
        setValidationError('');
      }
    } catch (error) {
      setIsValid(false);
      setValidationError('Invalid XML format');
    }
  }, []);

  const handleXmlChange = useCallback((value: string) => {
    setXmlContent(value);
    validateXml(value);
    updateLineNumbers();
  }, [validateXml]);

  const updateLineNumbers = useCallback(() => {
    if (!lineNumbersRef.current || !textareaRef.current) return;

    const lines = xmlContent.split('\n').length;
    const lineNumbers = Array.from({ length: lines }, (_, i) => i + 1);

    lineNumbersRef.current.innerHTML = lineNumbers
      .map(num => `<div class="line-number">${num}</div>`)
      .join('');
  }, [xmlContent]);

  const handleScroll = useCallback(() => {
    if (!lineNumbersRef.current || !textareaRef.current) return;
    lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
  }, []);

  useEffect(() => {
    updateLineNumbers();
  }, [updateLineNumbers]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('scroll', handleScroll);
      return () => textarea.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const formatXml = useCallback(() => {
    if (!xmlContent.trim()) {
      toast.error('No XML content to format!');
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'application/xml');
      const parserError = doc.querySelector('parsererror');

      if (parserError) {
        toast.error('Cannot format invalid XML!');
        return;
      }

      const serializer = new XMLSerializer();
      const formatted = serializer.serializeToString(doc);

      // Simple formatting with indentation
      const formattedXml = formatted
        .replace(/></g, '>\n<')
        .split('\n')
        .map((line, index) => {
          const depth = (line.match(/</g) || []).length - (line.match(/\//g) || []).length;
          const indent = '  '.repeat(Math.max(0, depth - 1));
          return indent + line.trim();
        })
        .join('\n');

      setXmlContent(formattedXml);
      toast.success('XML formatted successfully!');
    } catch (error) {
      toast.error('Error formatting XML!');
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
        .replace(/\s+/g, ' ')
        .trim();

      setXmlContent(minified);
      toast.success('XML minified successfully!');
    } catch (error) {
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
    } catch (error) {
      toast.error('Unable to copy automatically. Please copy manually.');
    }
  }, [xmlContent]);

  const downloadXml = useCallback(() => {
    if (!xmlContent.trim()) {
      toast.error('No XML content to download!');
      return;
    }

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('XML file downloaded!');
  }, [xmlContent]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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

  return (
    <ToolPageLayout
      title="XML Editor"
      description="Edit, format, validate, and share XML data with syntax highlighting and error detection."
      keywords="xml editor, xml formatter, xml validator, xml minifier, xml syntax"
      canonicalUrl="/tools/xml-editor"
      pageTitle="XML Editor - sLixTOOLS"
      pageDescription="Professional XML editor with formatting, validation, and sharing capabilities. Edit XML data with real-time syntax checking."
    >
      <div className="max-w-6xl mx-auto">
        <div className="space-y-6">
          {/* Header with validation status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label htmlFor="xml-content" className="text-white text-lg font-semibold flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                XML Content:
              </Label>
              {isValid !== null && (
                <div className="flex items-center space-x-1">
                  {isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={`text-sm ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                    {isValid ? 'Valid XML' : 'Invalid XML'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept=".xml"
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
                onClick={loadSampleXml}
                className="bg-purple-600 hover:bg-purple-700 text-white border-0 h-9"
              >
                Load Sample
              </Button>
            </div>
          </div>

          {/* Error message */}
          {validationError && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{validationError}</p>
            </div>
          )}

          {/* XML Editor with Line Numbers */}
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
              >
                <div className="line-number">1</div>
              </div>

              {/* Textarea */}
              <Textarea
                ref={textareaRef}
                id="xml-content"
                placeholder="Enter your XML content here or upload an XML file..."
                value={xmlContent}
                onChange={(e) => handleXmlChange(e.target.value)}
                className="flex-1 min-h-[400px] border-0 text-white placeholder-gray-400 resize-none text-sm font-mono bg-transparent focus:ring-0 focus:outline-none"
                style={{
                  lineHeight: '1.5rem',
                  paddingLeft: '12px',
                  paddingTop: '12px',
                  paddingBottom: '12px'
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <Button
              onClick={formatXml}
              disabled={!xmlContent.trim() || !isValid}
              className="bg-primary-action hover:bg-primary-action/90 text-white border-0 h-9"
            >
              Format
            </Button>

            <Button
              onClick={minifyXml}
              disabled={!xmlContent.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white border-0 h-9"
            >
              Minify
            </Button>

            <Button
              onClick={copyToClipboard}
              disabled={!xmlContent.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0 h-9"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>

            <Button
              onClick={downloadXml}
              disabled={!xmlContent.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 h-9"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>

            <Button
              onClick={clearContent}
              disabled={!xmlContent.trim()}
              className="bg-red-600 hover:bg-red-700 text-white border-0 h-9"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>

          {/* Features Info */}
          <div className="bg-gray-900/50 border border-white/10 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2">Features:</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Real-time XML validation with error detection</li>
              <li>• Format XML with proper indentation</li>
              <li>• Minify XML to reduce file size</li>
              <li>• Upload XML files from your computer</li>
              <li>• Download edited XML as a file</li>
              <li>• Copy XML content to clipboard</li>
              <li>• Load sample XML for testing</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default XmlEditor;