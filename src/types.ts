export const BRUSH_IDS = ['ink', 'pencil', 'marker', 'watercolor', 'crayon', 'airbrush', 'glitter'] as const;
export type BrushStyle = typeof BRUSH_IDS[number];
export type Tool = 'pen' | 'eraser' | 'fill';
export type CanvasMode = Tool | 'lasso' | 'lasso-paint' | 'picker';
export const BLEND_MODES = ['normal', 'multiply', 'screen'] as const;
export type BlendMode = typeof BLEND_MODES[number];
export type PaintGradient = { to: string; angle: number };
export type TemplateId = 'heart' | 'flowers' | 'bunny' | 'blank';
export type Point = { x: number; y: number; p?: number };
export type Seat = 'host' | 'guest';
export type Stroke = {
  id: string;
  by: string;
  owner?: Seat; // Absent on historical, read-only strokes.
  tool: Tool;
  color: string;
  size: number;
  brush?: BrushStyle;
  opacity?: number;
  gradient?: PaintGradient;
  blend?: BlendMode;
  hidden?: boolean;
  lastEdit?: number;
  lastEditor?: string;
  points: Point[];
  holes?: Point[][]; // Optional unpainted islands in an enclosed smart-filled region.
};
export type Partner = {
  id: string;
  userId?: string;
  name: string;
  accent: string;
  joinedAt: number;
  seat?: Seat;
};
export type BoardState = {
  template: TemplateId;
  strokes: Stroke[];
  revision: number;
  lessonStep?: number;
  lessonStamp?: number;
  lessonActor?: string;
};
export type Cursor = { by: string; x: number; y: number; name: string; color: string };

export type SelectionEdit = (
  | { action: 'move'; ids: string[]; dx: number; dy: number }
  | { action: 'visibility'; ids: string[]; visible: boolean }
  | { action: 'duplicate'; sources: string[]; copies: string[]; dx: number; dy: number }
) & { opId: string; revision: number; stamp: number; owner: Seat };

export type BoardMessage =
  | { kind: 'state-request'; from: string }
  | { kind: 'state'; from: string; to: string; board: BoardState }
  | { kind: 'state-sync'; from: string; to: string; board: BoardState }
  | { kind: 'stroke-start'; from: string; stroke: Stroke }
  | { kind: 'stroke-points'; from: string; id: string; points: Point[] }
  | { kind: 'stroke-end'; from: string; id: string }
  | { kind: 'undo'; from: string; id: string }
  | { kind: 'selection-edit'; from: string; edit: SelectionEdit }
  | { kind: 'lesson-step'; from: string; revision: number; step: number; stamp: number }
  | { kind: 'reset'; from: string; template: TemplateId; revision: number }
  | { kind: 'lasso-gesture'; from: string; seat: Seat; mode: 'paint' | 'outline' | 'drag'; points: Point[]; color: string; done: boolean; ids?: string[]; dx?: number; dy?: number }
  | { kind: 'cursor'; from: string; x: number; y: number; name: string; color: string }
  | { kind: 'reaction'; from: string; name: string; value: string };
