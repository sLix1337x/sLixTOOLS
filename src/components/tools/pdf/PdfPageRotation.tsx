import React from 'react';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfPageRotationProps {
  currentPage: number;
  totalPages: number;
  onRotate: (page: number, rotation: 90 | 180 | 270) => void;
  className?: string;
}

const PdfPageRotation = ({
  currentPage,
  totalPages,
  onRotate,
  className,
}: PdfPageRotationProps) => {
  const handleRotate = (rotation: 90 | 180 | 270) => {
    onRotate(currentPage, rotation);
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <RotateCw className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-300">Rotate Page {currentPage}:</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleRotate(90)}
          title="Rotate 90° clockwise"
        >
          90°
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleRotate(180)}
          title="Rotate 180°"
        >
          180°
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleRotate(270)}
          title="Rotate 270° clockwise"
        >
          270°
        </Button>
      </div>
    </div>
  );
};

export default PdfPageRotation;

