import React from 'react';
import { Info, MousePointer2, Type, Pencil, Square, Circle, Minus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdfToolHintProps {
  activeTool: string | null;
  className?: string;
}

const toolHints: Record<string, { icon: React.ReactNode; title: string; instructions: string[] }> = {
  'select': {
    icon: <MousePointer2 className="h-4 w-4" />,
    title: 'Select Tool',
    instructions: [
      'Click on annotations to select them',
      'Press Delete to remove selected items',
      'Click on empty space to deselect'
    ]
  },
  'text': {
    icon: <Type className="h-4 w-4" />,
    title: 'Add Text',
    instructions: [
      'Double-click anywhere on the PDF to place a text box',
      'Single click shows a preview indicator',
      'Click the text box to edit it after placement',
      'Change font size and color in the ribbon toolbar'
    ]
  },
  'draw': {
    icon: <Pencil className="h-4 w-4" />,
    title: 'Freehand Drawing',
    instructions: [
      'Click and drag on the PDF to draw',
      'Adjust color and width in the ribbon toolbar',
      'Release mouse to finish the drawing'
    ]
  },
  'rectangle': {
    icon: <Square className="h-4 w-4" />,
    title: 'Rectangle Tool',
    instructions: [
      'Click and drag to draw a rectangle',
      'Adjust color and width in the ribbon toolbar',
      'Release mouse to finish'
    ]
  },
  'circle': {
    icon: <Circle className="h-4 w-4" />,
    title: 'Circle Tool',
    instructions: [
      'Click and drag to draw a circle',
      'Adjust color and width in the ribbon toolbar',
      'Release mouse to finish'
    ]
  },
  'line': {
    icon: <Minus className="h-4 w-4" />,
    title: 'Line Tool',
    instructions: [
      'Click and drag to draw a line',
      'Adjust color and width in the ribbon toolbar',
      'Release mouse to finish'
    ]
  },
  'arrow': {
    icon: <ArrowRight className="h-4 w-4" />,
    title: 'Arrow Tool',
    instructions: [
      'Click and drag to draw an arrow',
      'Adjust color and width in the ribbon toolbar',
      'Release mouse to finish'
    ]
  }
};

const PdfToolHint = ({ activeTool, className }: PdfToolHintProps) => {
  if (!activeTool || !toolHints[activeTool]) {
    return null;
  }

  const hint = toolHints[activeTool];

  return (
    <div className={cn(
      "relative w-full",
      "bg-[#252526] border border-[#3e3e42] rounded-lg shadow-lg",
      "px-4 py-3",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5 text-[#007acc]">
          {hint.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-3.5 w-3.5 text-[#858585]" />
            <h4 className="text-[13px] font-semibold text-[#cccccc]">{hint.title}</h4>
          </div>
          <ul className="space-y-1.5">
            {hint.instructions.map((instruction, index) => (
              <li key={index} className="text-[11px] text-[#858585] flex items-start gap-2">
                <span className="text-[#007acc] mt-1">•</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PdfToolHint;

