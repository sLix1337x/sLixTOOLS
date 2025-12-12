import React, { useState, useCallback, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import * as pdfjsLib from 'pdfjs-dist';

interface PdfSearchProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  onResultSelect: (page: number) => void;
  className?: string;
}

const PdfSearch = ({ pdfDoc, onResultSelect, className }: PdfSearchProps) => {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<Array<{ page: number; index: number; text: string }>>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const searchInPdf = useCallback(async (text: string) => {
    if (!pdfDoc || !text.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const searchResults: Array<{ page: number; index: number; text: string }> = [];

    try {
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        textContent.items.forEach((item: any, index: number) => {
          if (item.str && item.str.toLowerCase().includes(text.toLowerCase())) {
            searchResults.push({
              page: pageNum,
              index,
              text: item.str,
            });
          }
        });
      }

      setResults(searchResults);
      setCurrentResultIndex(0);
      
      if (searchResults.length > 0) {
        onResultSelect(searchResults[0].page);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [pdfDoc, onResultSelect]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchText.trim()) {
        searchInPdf(searchText);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchText, searchInPdf]);

  const handleNext = () => {
    if (results.length === 0) return;
    const nextIndex = (currentResultIndex + 1) % results.length;
    setCurrentResultIndex(nextIndex);
    onResultSelect(results[nextIndex].page);
  };

  const handlePrevious = () => {
    if (results.length === 0) return;
    const prevIndex = (currentResultIndex - 1 + results.length) % results.length;
    setCurrentResultIndex(prevIndex);
    onResultSelect(results[prevIndex].page);
  };

  const handleClear = () => {
    setSearchText('');
    setResults([]);
    setCurrentResultIndex(0);
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search in PDF..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-8 pr-8",
              "bg-black/40 border-white/20 text-white"
            )}
          />
          {searchText && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {results.length > 0 && (
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrevious}
              disabled={isSearching}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-300 min-w-[60px] text-center">
              {currentResultIndex + 1} / {results.length}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNext}
              disabled={isSearching}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      {isSearching && (
        <div className="text-xs text-gray-400 mt-1">Searching...</div>
      )}
    </div>
  );
};

export default PdfSearch;

