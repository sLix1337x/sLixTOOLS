import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import '@/styles/xml-editor.css';

interface CodeEditorProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** 1-based line to mark red in the gutter */
  errorLine?: number | undefined;
}

/** Plain-text code editor with line numbers, sized by its parent from `lg` on. */
const CodeEditor = forwardRef<HTMLTextAreaElement, CodeEditorProps>(
  ({ id, label, value, onChange, placeholder, errorLine }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    const lineCount = value.split('\n').length;

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

    return (
      <div
        className="m-4 flex h-[60dvh] overflow-hidden rounded-lg border border-white/10 lg:h-auto lg:min-h-0 lg:flex-1"
        style={{ backgroundColor: '#171714' }}
      >
        {/* Bottom padding matches the textarea's horizontal scrollbar, so both scroll equally far */}
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          className="min-w-[50px] flex-shrink-0 select-none overflow-hidden border-r border-white/10 bg-gray-800/50 px-2 pb-8 pt-3 font-mono text-sm text-gray-500"
          style={{ lineHeight: '1.5rem' }}
        />
        <Textarea
          ref={textareaRef}
          id={id}
          aria-label={label}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => {
            if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
          spellCheck={false}
          wrap="off"
          className="min-h-0 flex-1 resize-none overflow-auto whitespace-pre rounded-none border-0 bg-transparent px-3 py-3 font-mono text-sm text-white placeholder-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
          style={{ lineHeight: '1.5rem' }}
        />
      </div>
    );
  }
);
CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;
