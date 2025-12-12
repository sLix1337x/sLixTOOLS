
interface PdfStatusBarProps {
  currentPage: number;
  totalPages: number;
  zoom: number;
  pageDimensions?: { width: number; height: number };
  documentSize?: number;
  activeTool?: string | null;
}

const PdfStatusBar = ({
  currentPage,
  totalPages,
  zoom,
  pageDimensions,
  documentSize,
  activeTool
}: PdfStatusBarProps) => {
  const formatSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDimensions = () => {
    if (!pageDimensions) return 'N/A';
    return `${pageDimensions.width.toFixed(1)}" × ${pageDimensions.height.toFixed(1)}"`;
  };

  const getToolHint = (): string => {
    switch (activeTool) {
      case 'text':
        return 'Click on the PDF to add text';
      case 'draw':
        return 'Click and drag to draw';
      case 'rectangle':
      case 'circle':
      case 'line':
      case 'arrow':
        return 'Click and drag to draw';
      case 'select':
        return 'Click annotations to select, Delete to remove';
      default:
        return '';
    }
  };

  const toolHint = getToolHint();

  return (
    <div className="h-6 bg-[#007acc] text-white text-[11px] flex items-center justify-between px-4 border-t border-[#005a9e]">
      <div className="flex items-center gap-4">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        {pageDimensions && (
          <span className="hidden sm:inline">
            {formatDimensions()}
          </span>
        )}
        {toolHint && (
          <span className="flex items-center gap-1.5 ml-2 px-2 py-0.5 bg-[#0066aa] rounded">
            <span>{toolHint}</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span>
          Zoom: {Math.round(zoom * 100)}%
        </span>
        {documentSize && (
          <span className="hidden md:inline">
            Size: {formatSize(documentSize)}
          </span>
        )}
      </div>
    </div>
  );
};

export default PdfStatusBar;

