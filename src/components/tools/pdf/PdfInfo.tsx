import React from 'react';
import { FileText, FileImage, Merge, Split, X, Move, Palette, Pencil } from 'lucide-react';

const PdfInfo: React.FC = () => {
    return (
        <div className="mt-6 bg-gradient-to-br from-slate-800/40 to-slate-900/30 border border-slate-600/30 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-2 bg-blue-500/20 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">PDF Editor - Complete Document Management</h3>
                    <div className="space-y-4 text-slate-300">
                        <p className="leading-relaxed">
                            Transform your PDF documents with our comprehensive editing suite. This powerful tool provides everything you need to manipulate, enhance, and convert PDF files with professional-grade precision.
                        </p>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                                    <div>
                                        <h4 className="font-medium text-blue-400 mb-1">FILE Operations</h4>
                                        <p className="text-sm text-slate-400">Merge multiple PDFs into a single document seamlessly</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                                    <div>
                                        <h4 className="font-medium text-green-400 mb-1">PAGES Management</h4>
                                        <p className="text-sm text-slate-400">Split documents, delete unwanted pages, and reorder content with drag-and-drop functionality</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                                    <div>
                                        <h4 className="font-medium text-purple-400 mb-1">TEXT Enhancement</h4>
                                        <p className="text-sm text-slate-400">Highlight important content and add custom annotations with precision</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-2 h-2 bg-orange-400 rounded-full mt-2"></div>
                                    <div>
                                        <h4 className="font-medium text-orange-400 mb-1">EXPORT Options</h4>
                                        <p className="text-sm text-slate-400">Convert PDF pages to high-quality image formats (PNG, JPG, WebP)</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-600/30">
                            <h4 className="font-medium text-slate-200 mb-2">How to Use:</h4>
                            <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
                                <li>Upload your PDF file using the upload area above</li>
                                <li>Select the desired operation from the color-coded toolbar</li>
                                <li>Follow the interactive prompts for each specific function</li>
                                <li>Preview your changes in real-time before finalizing</li>
                                <li>Download your edited document or converted images</li>
                            </ol>
                        </div>

                        <div className="flex items-center gap-2 pt-2 text-xs text-slate-500">
                            <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                            <span>All processing happens locally in your browser for maximum privacy and security</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PdfInfo;
