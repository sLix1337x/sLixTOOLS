/**
 * Type definitions for PDF Editor enhancements
 */

export type ToolType = 
  | 'select' 
  | 'text' 
  | 'draw' 
  | 'rectangle' 
  | 'circle' 
  | 'line' 
  | 'arrow'
  | 'highlight'
  | 'annotate';

export type ViewMode = 'single' | 'two-up' | 'four-up' | 'continuous';

/** x = horizontal centre, y = bottom edge measured up from the page bottom, in scale-1 viewport units (rotation applied). */
export interface TextBox {
  id: string;
  page: number;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  width?: number;
  height?: number;
}

/** path points are scale-1 viewport units (top-left origin, rotation applied). */
export interface Drawing {
  id: string;
  type: 'draw' | 'freehand' | 'rectangle' | 'circle' | 'line' | 'arrow';
  page: number;
  path: Array<{ x: number; y: number }>;
  color: string;
  strokeWidth: number;
  fill?: string;
}

export interface PageRotation {
  pageIndex: number;
  rotation: 0 | 90 | 180 | 270;
}

