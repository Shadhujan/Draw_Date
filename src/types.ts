export const BRUSH_IDS = ['ink', 'pencil', 'marker', 'watercolor', 'crayon', 'airbrush', 'glitter'] as const;
export type BrushStyle = typeof BRUSH_IDS[number];
export type Tool = 'pen' | 'eraser';
export type CanvasMode = Tool | 'lasso';
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
  hidden?: boolean;
  lastEdit?: number;
  lastEditor?: string;
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

export type SelectionEdit = (
  | { action: 'move'; ids: string[]; dx: number; dy: number }
  | { action: 'visibility'; ids: string[]; visible: boolean }
  | { action: 'duplicate'; sources: string[]; copies: string[]; dx: number; dy: number }
) & { opId: string; revision: number; stamp: number };

export type BoardMessage =
  | { kind: 'state-request'; from: string }
  | { kind: 'state'; from: string; to: string; board: BoardState }
  | { kind: 'stroke-start'; from: string; stroke: Stroke }
  | { kind: 'stroke-points'; from: string; id: string; points: Point[] }
  | { kind: 'stroke-end'; from: string; id: string }
  | { kind: 'undo'; from: string; id: string }
  | { kind: 'selection-edit'; from: string; edit: SelectionEdit }
  | { kind: 'reset'; from: string; template: TemplateId; revision: number }
  | { kind: 'cursor'; from: string; x: number; y: number; name: string; color: string }
  | { kind: 'reaction'; from: string; name: string; value: string };
