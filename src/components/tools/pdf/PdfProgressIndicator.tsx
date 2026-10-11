import { Loader2, X } from 'lucide-react';

interface PdfProgressIndicatorProps {
  message: string;
  progress?: number | undefined; // 0-100, optional
  onCancel?: () => void;
  showCancel?: boolean;
}

const PdfProgressIndicator = ({ 
  message, 
  progress, 
  onCancel, 
  showCancel = false 
}: PdfProgressIndicatorProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#252526] border border-[#3e3e42] rounded-lg p-6 min-w-[300px] shadow-xl">
        <div className="flex items-center gap-4">
          <Loader2 className="h-6 w-6 text-[#007acc] animate-spin" />
          <div className="flex-1">
            <p className="text-[#cccccc] text-sm font-medium mb-2">{message}</p>
            {progress !== undefined && (
              <div className="w-full bg-[#3e3e42] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#007acc] h-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            )}
            {progress !== undefined && (
              <p className="text-[#858585] text-xs mt-1">{Math.round(progress)}%</p>
            )}
          </div>
          {showCancel && onCancel && (
            <button
              onClick={onCancel}
              className="text-[#858585] hover:text-[#cccccc] transition-colors"
              title="Cancel"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfProgressIndicator;

