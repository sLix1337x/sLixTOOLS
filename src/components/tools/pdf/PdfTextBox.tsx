import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TextBox } from '@/types/pdfEditor';

interface PdfTextBoxProps {
  textBox: TextBox;
  onUpdate: (id: string, updates: Partial<TextBox>) => void;
  onDelete: (id: string) => void;
  onSave: (textBox: TextBox) => void;
  pageSize: { width: number; height: number };
  viewportScale: number;
  isSelected?: boolean;
  isEditing?: boolean;
  onSelect?: (id: string) => void;
  onEdit?: ((id: string) => void) | undefined;
}

const PdfTextBox = ({
  textBox,
  onUpdate,
  onDelete,
  onSave,
  pageSize,
  viewportScale,
  isSelected = false,
  isEditing = false,
  onSelect,
  onEdit,
}: PdfTextBoxProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasDraggingRef = useRef(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Drag and drop handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start drag if clicking on delete button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    // Reset drag tracking at the start of each mouse down
    wasDraggingRef.current = false;
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    
    // If in edit mode, allow dragging but don't prevent default to allow text selection
    if (isEditing) {
      // Still allow dragging in edit mode
      e.stopPropagation();
    } else {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Select the text box
    if (onSelect) {
      onSelect(textBox.id);
    }
    
    // Get the parent overlay element to calculate coordinates relative to it
    const parentElement = containerRef.current?.parentElement;
    if (!parentElement) return;
    
    const parentRect = parentElement.getBoundingClientRect();
    
    // Current text box position in viewport coordinates (center X, bottom Y due to transform)
    const currentViewportX = textBox.x * viewportScale;
    const currentViewportY = (pageSize.height - textBox.y) * viewportScale;
    
    // Mouse position relative to parent
    const mouseX = e.clientX - parentRect.left;
    const mouseY = e.clientY - parentRect.top;
    
    // Calculate offset from mouse click to text box center/bottom
    const offsetX = mouseX - currentViewportX;
    const offsetY = mouseY - currentViewportY;
    
    setIsDragging(false);
    setHasMoved(false);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset({ x: offsetX, y: offsetY });
  };

  useEffect(() => {
    if (!dragStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !dragStart || !dragOffset) return;
      
      // Check if mouse has moved significantly (more than 5px)
      const moved = Math.abs(e.clientX - dragStart.x) > 5 || Math.abs(e.clientY - dragStart.y) > 5;
      if (moved && !isDragging) {
        setIsDragging(true);
        setHasMoved(true);
      }
      
      if (!isDragging && !moved) return;
      
      const parentRect = containerRef.current.parentElement?.getBoundingClientRect();
      if (!parentRect) return;
      
      // Calculate new position relative to parent (viewport coordinates)
      const newViewportX = e.clientX - parentRect.left - dragOffset.x;
      const newViewportY = e.clientY - parentRect.top - dragOffset.y;
      
      // Convert viewport coordinates to PDF coordinates
      // viewportX = textBox.x * viewportScale, so textBox.x = viewportX / viewportScale
      // viewportY = (pageSize.height - textBox.y) * viewportScale, so textBox.y = pageSize.height - (viewportY / viewportScale)
      const pdfX = newViewportX / viewportScale;
      const pdfY = pageSize.height - (newViewportY / viewportScale);
      
      // Clamp to page bounds
      const clampedX = Math.max(0, Math.min(pageSize.width, pdfX));
      const clampedY = Math.max(0, Math.min(pageSize.height, pdfY));
      
      // Update position
      onUpdate(textBox.id, {
        x: clampedX,
        y: clampedY,
      });
    };

    const handleMouseUp = () => {
      // Track if we were dragging before resetting state
      const wasDragging = isDragging || hasMoved;
      wasDraggingRef.current = wasDragging;
      
      setIsDragging(false);
      setDragStart(null);
      setDragOffset(null);
      setHasMoved(false);
      
      // Clear any existing timeout
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      
      // Reset the flag after a short delay to allow onClick to check it
      clickTimeoutRef.current = setTimeout(() => {
        wasDraggingRef.current = false;
        clickTimeoutRef.current = null;
      }, 150);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragStart, dragOffset, isDragging, textBox.id, pageSize, viewportScale, onUpdate]);

  // Convert PDF coordinates to viewport coordinates
  // Ensure pageSize is valid
  if (pageSize.width === 0 || pageSize.height === 0) {
    return null;
  }
  
  const viewportX = (textBox.x / pageSize.width) * (pageSize.width * viewportScale);
  const viewportY = ((pageSize.height - textBox.y) / pageSize.height) * (pageSize.height * viewportScale);

  return (
    <div
      ref={containerRef}
      className="absolute group pointer-events-auto"
      style={{
        left: `${viewportX}px`,
        top: `${viewportY}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: isDragging ? 10 : (isEditing ? 15 : 5),
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div
        className={cn(
          "relative hover:opacity-80 transition-opacity group",
          isSelected && "ring-2 ring-blue-500 rounded",
          isDragging && "opacity-90"
        )}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          // Only open edit dialog if we didn't drag
          // Check the ref synchronously - if it's false, we didn't drag
          if (!wasDraggingRef.current) {
            e.stopPropagation();
            e.preventDefault();
            if (onSelect) {
              onSelect(textBox.id);
            }
            if (onEdit) {
              onEdit(textBox.id);
            }
          }
        }}
        style={{
          fontSize: `${textBox.fontSize * viewportScale}px`,
          color: textBox.color,
          padding: isSelected ? '2px' : '0',
          userSelect: 'none',
        }}
      >
        <span>{textBox.text || 'Click to edit'}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(textBox.id);
          }}
          className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-red-500 rounded-full p-1 transition-opacity"
        >
          <X className="h-3 w-3 text-white" />
        </button>
      </div>
    </div>
  );
};

export default PdfTextBox;

