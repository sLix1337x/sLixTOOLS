import { useState } from 'react';
import { Copy, Download, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { chipButton, pressedChip, sectionLabel } from '@/styles/constants';
import { copyWithToast } from '@/utils/clipboard';
import { EXPORT_FORMATS, renderPalettePng } from '@/utils/colorExport';
import type { ExportFormat } from '@/utils/colorExport';
import { downloadBlob } from '@/utils/download';

const FORMAT_IDS = Object.keys(EXPORT_FORMATS) as ExportFormat[];

const ExportPanel = ({ hexes }: { hexes: string[] }) => {
  const [format, setFormat] = useState<ExportFormat>('css');
  const { label, filename, mime, build } = EXPORT_FORMATS[format];
  const code = build(hexes);

  const downloadPng = async () => {
    try {
      downloadBlob(await renderPalettePng(hexes), 'palette.png');
    } catch {
      toast.error('Could not create the PNG.');
    }
  };

  return (
    <div>
      <h2 className={`${sectionLabel} mb-2`}>Export</h2>
      <div className="mb-2 flex flex-wrap gap-2">
        {FORMAT_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={`${chipButton} ${pressedChip}`}
            aria-pressed={format === id}
            onClick={() => setFormat(id)}
          >
            {EXPORT_FORMATS[id].label}
          </button>
        ))}
      </div>
      <pre
        tabIndex={0}
        aria-label={`${label} code`}
        className="max-h-72 overflow-auto rounded-lg border border-white/10 bg-[#171714] p-3 font-mono text-xs text-slate-200"
      >
        {code}
      </pre>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={chipButton} onClick={() => void copyWithToast(code, `Copied ${label}`)}>
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copy
        </button>
        <button
          type="button"
          className={chipButton}
          onClick={() => downloadBlob(new Blob([code], { type: mime }), filename)}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download {filename}
        </button>
        <button type="button" className={chipButton} onClick={() => void downloadPng()}>
          <ImageIcon className="h-4 w-4" aria-hidden="true" />
          Download PNG
        </button>
      </div>
    </div>
  );
};

export default ExportPanel;
