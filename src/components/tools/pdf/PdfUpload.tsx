import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Trash2 } from 'lucide-react';

interface PdfUploadProps {
    onUpload: (files: FileList | null) => void;
    resetAll: () => void;
    isUploading: boolean;
    hasFile: boolean;
}

const PdfUpload: React.FC<PdfUploadProps> = ({ onUpload, resetAll, isUploading, hasFile }) => {
    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
                <Upload className="text-gray-400 h-4 w-4" />
                <h4 className="font-semibold text-gray-300">Upload PDF</h4>
            </div>
            <div className="flex items-center gap-3 mb-3">
                <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => onUpload(e.target.files)}
                    disabled={isUploading}
                    className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                />
                {hasFile && (
                    <Button variant="secondary" onClick={resetAll} disabled={isUploading}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear
                    </Button>
                )}
                {isUploading && <span className="text-sm text-gray-400">Loading PDF...</span>}
            </div>
        </div>
    );
};

export default PdfUpload;
