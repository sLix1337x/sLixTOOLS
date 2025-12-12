import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { Drawing } from '@/types/pdfEditor';

interface PdfDrawingCanvasProps {
  drawings: Drawing[];
  currentPage: number;
  activeTool: 'draw' | 'rectangle' | 'circle' | 'line' | 'arrow' | null;
  onDrawingComplete: (drawing: Drawing) => void;
  onDrawingUpdate: (id: string, drawing: Partial<Drawing>) => void;
  onDrawingDelete: (id: string) => void;
  pageSize: { width: number; height: number };
  viewportScale: number;
  strokeColor: string;
  strokeWidth: number;
  className?: string;
}

const PdfDrawingCanvas = ({
  drawings,
  currentPage,
  activeTool,
  onDrawingComplete,
  onDrawingUpdate,
  onDrawingDelete,
  pageSize,
  viewportScale,
  strokeColor,
  strokeWidth,
  className,
}: PdfDrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Canvas internal size matches displayed size, so scale is 1
    // But we need to convert to PDF coordinates (divide by viewportScale)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: ((e.clientX - rect.left) * scaleX) / viewportScale,
      y: ((e.clientY - rect.top) * scaleY) / viewportScale,
    };
  }, [viewportScale]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeTool) return;
    
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setStartPoint(coords);
    setCurrentPath([coords]);
  }, [activeTool, getCanvasCoordinates]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeTool || !startPoint) return;

    e.preventDefault();
    e.stopPropagation();
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    if (activeTool === 'draw') {
      setCurrentPath((prev) => [...prev, coords]);
    } else {
      setCurrentPath([startPoint, coords]);
    }
  }, [isDrawing, activeTool, startPoint, getCanvasCoordinates]);

  const handleMouseUp = useCallback((e?: React.MouseEvent<HTMLCanvasElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!isDrawing || !activeTool) {
      setIsDrawing(false);
      setCurrentPath([]);
      setStartPoint(null);
      return;
    }

    setCurrentPath((prev) => {
      if (prev.length === 0) {
        setIsDrawing(false);
        setStartPoint(null);
        return [];
      }

      const newDrawing: Drawing = {
        id: `drawing-${Date.now()}`,
        type: activeTool === 'draw' ? 'draw' : activeTool,
        page: currentPage,
        path: prev,
        color: strokeColor,
        strokeWidth,
      };

      onDrawingComplete(newDrawing);
      setIsDrawing(false);
      setStartPoint(null);
      return [];
    });
  }, [isDrawing, activeTool, currentPage, strokeColor, strokeWidth, onDrawingComplete]);

  // Render drawings on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size FIRST before clearing
    const scaledWidth = pageSize.width * viewportScale;
    const scaledHeight = pageSize.height * viewportScale;
    
    // Only update if size changed to avoid unnecessary redraws
    if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reset transform and set scale
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(viewportScale, viewportScale);

    // Draw existing drawings for current page
    drawings
      .filter(d => d.page === currentPage)
      .forEach(drawing => {
        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = drawing.strokeWidth;
        ctx.beginPath();

        if (drawing.type === 'draw' || drawing.type === 'freehand') {
          if (drawing.path.length > 0) {
            ctx.moveTo(drawing.path[0].x, drawing.path[0].y);
            drawing.path.forEach(point => {
              ctx.lineTo(point.x, point.y);
            });
          }
        } else if (drawing.type === 'rectangle') {
          if (drawing.path.length === 2) {
            const [start, end] = drawing.path;
            ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
          }
        } else if (drawing.type === 'circle') {
          if (drawing.path.length === 2) {
            const [start, end] = drawing.path;
            const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
          }
        } else if (drawing.type === 'line' || drawing.type === 'arrow') {
          if (drawing.path.length === 2) {
            const [start, end] = drawing.path;
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            
            if (drawing.type === 'arrow') {
              // Draw arrowhead
              const angle = Math.atan2(end.y - start.y, end.x - start.x);
              const arrowLength = 10;
              ctx.lineTo(
                end.x - arrowLength * Math.cos(angle - Math.PI / 6),
                end.y - arrowLength * Math.sin(angle - Math.PI / 6)
              );
              ctx.moveTo(end.x, end.y);
              ctx.lineTo(
                end.x - arrowLength * Math.cos(angle + Math.PI / 6),
                end.y - arrowLength * Math.sin(angle + Math.PI / 6)
              );
            }
          }
        }

        ctx.stroke();
      });

    // Draw current path being drawn
    if (isDrawing && currentPath.length > 0 && startPoint) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.beginPath();

      if (activeTool === 'draw') {
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        currentPath.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
      } else if (activeTool === 'rectangle' && currentPath.length === 2) {
        const [start, end] = currentPath;
        ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else if (activeTool === 'circle' && currentPath.length === 2) {
        const [start, end] = currentPath;
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
      } else if ((activeTool === 'line' || activeTool === 'arrow') && currentPath.length === 2) {
        const [start, end] = currentPath;
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        
        if (activeTool === 'arrow') {
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const arrowLength = 10;
          ctx.lineTo(
            end.x - arrowLength * Math.cos(angle - Math.PI / 6),
            end.y - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(
            end.x - arrowLength * Math.cos(angle + Math.PI / 6),
            end.y - arrowLength * Math.sin(angle + Math.PI / 6)
          );
        }
      }

      ctx.stroke();
    }
  }, [drawings, currentPage, isDrawing, currentPath, startPoint, activeTool, strokeColor, strokeWidth, pageSize, viewportScale]);

  if (!activeTool || (activeTool !== 'draw' && activeTool !== 'rectangle' && activeTool !== 'circle' && activeTool !== 'line' && activeTool !== 'arrow')) {
    return null;
  }

  // Don't render if pageSize is not set
  if (pageSize.width === 0 || pageSize.height === 0) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 pointer-events-auto cursor-crosshair"
      style={{
        width: `${pageSize.width * viewportScale}px`,
        height: `${pageSize.height * viewportScale}px`,
        zIndex: 10,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};

export default PdfDrawingCanvas;

