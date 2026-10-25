export const BRUSH_IDS = ['ink', 'pencil', 'marker', 'watercolor', 'crayon', 'airbrush', 'glitter'] as const;
export type BrushStyle = typeof BRUSH_IDS[number];
export type Tool = 'pen' | 'eraser';
export type TemplateId = 'heart' | 'flowers' | 'bunny' | 'blank';
export type Point = { x: number; y: number; p?: number };
export type Stroke = {
  id: string;
  by: string;
  tool: Tool;
  color: string;
  size: number;
  brush?: BrushStyle;
  opacity?: number;
  points: Point[];
};
export type Partner = {
  id: string;
  name: string;
  accent: string;
  joinedAt: number;
};
export type BoardState = {
  template: TemplateId;
  strokes: Stroke[];
  revision: number;
};
export type Cursor = { by: string; x: number; y: number; name: string; color: string };

export type BoardMessage =
  | { kind: 'state-request'; from: string }
  | { kind: 'state'; from: string; to: string; board: BoardState }
  | { kind: 'stroke-start'; from: string; stroke: Stroke }
  | { kind: 'stroke-points'; from: string; id: string; points: Point[] }
  | { kind: 'stroke-end'; from: string; id: string }
  | { kind: 'undo'; from: string; id: string }
  | { kind: 'reset'; from: string; template: TemplateId; revision: number }
  | { kind: 'cursor'; from: string; x: number; y: number; name: string; color: string }
  | { kind: 'reaction'; from: string; name: string; value: string };
