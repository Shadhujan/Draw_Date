import { BLEND_MODES, BRUSH_IDS } from './types';
import type { BoardState, Point, Stroke, TemplateId } from './types';

const ROOM_RE = /^[a-f0-9]{32}$/;
const MAX_STROKES = 300;
const MAX_POINTS = 2000;

export function isRoomId(value: string | null): value is string {
  return typeof value === 'string' && ROOM_RE.test(value);
}

export function createRoomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function emptyBoard(): BoardState {
  return { template: 'heart', strokes: [], revision: 0 };
}

export function isPoint(value: unknown): value is Point {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return typeof p.x === 'number' && Number.isFinite(p.x) && p.x >= 0 && p.x <= 1000 &&
    typeof p.y === 'number' && Number.isFinite(p.y) && p.y >= 0 && p.y <= 700 &&
    (p.p === undefined || (typeof p.p === 'number' && Number.isFinite(p.p) && p.p >= 0 && p.p <= 1));
}

export function isTemplate(value: unknown): value is TemplateId {
  return value === 'heart' || value === 'flowers' || value === 'bunny' || value === 'blank';
}

export function isStroke(value: unknown): value is Stroke {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return typeof s.id === 'string' && s.id.length < 128 && typeof s.by === 'string' &&
    (s.tool === 'pen' || s.tool === 'eraser') && typeof s.color === 'string' && /^#[\da-fA-F]{6}$/.test(s.color) &&
    typeof s.size === 'number' && Number.isFinite(s.size) && s.size > 0 && s.size <= 80 &&
    (s.brush === undefined || BRUSH_IDS.some((brush) => brush === s.brush)) &&
    (s.opacity === undefined || (typeof s.opacity === 'number' && Number.isFinite(s.opacity) && s.opacity >= 0.1 && s.opacity <= 1)) &&
    (s.blend === undefined || BLEND_MODES.some((mode) => mode === s.blend)) &&
    (s.gradient === undefined || (s.gradient !== null && typeof s.gradient === 'object' &&
      typeof (s.gradient as Record<string, unknown>).to === 'string' &&
      /^#[\da-fA-F]{6}$/.test((s.gradient as Record<string, string>).to) &&
      typeof (s.gradient as Record<string, unknown>).angle === 'number' &&
      Number.isFinite((s.gradient as Record<string, number>).angle) &&
      (s.gradient as Record<string, number>).angle >= 0 &&
      (s.gradient as Record<string, number>).angle <= 360)) &&
    (s.hidden === undefined || typeof s.hidden === 'boolean') &&
    (s.lastEdit === undefined || (typeof s.lastEdit === 'number' && Number.isSafeInteger(s.lastEdit) && s.lastEdit >= 0)) &&
    (s.lastEditor === undefined || (typeof s.lastEditor === 'string' && s.lastEditor.length < 128)) &&
    Array.isArray(s.points) &&
    s.points.length > 0 && s.points.length <= MAX_POINTS && s.points.every(isPoint);
}

export function sanitizeBoard(value: unknown): BoardState | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as Record<string, unknown>;
  if (!isTemplate(b.template) || !Array.isArray(b.strokes) || b.strokes.length > MAX_STROKES ||
      !b.strokes.every(isStroke) || !Number.isSafeInteger(b.revision) || Number(b.revision) < 0) return null;
  return { template: b.template, strokes: b.strokes, revision: Number(b.revision) };
}

export function loadBoard(room: string): BoardState {
  try {
    const value = JSON.parse(localStorage.getItem(`doodle-date-board:${room}`) || 'null') as unknown;
    return sanitizeBoard(value) || emptyBoard();
  } catch {
    return emptyBoard();
  }
}

export function saveBoard(room: string, board: BoardState): void {
  try { localStorage.setItem(`doodle-date-board:${room}`, JSON.stringify(board)); } catch { /* Storage is optional. */ }
}

export function appendStroke(strokes: Stroke[], stroke: Stroke): Stroke[] {
  if (strokes.some((item) => item.id === stroke.id)) return strokes;
  return [...strokes, stroke].slice(-MAX_STROKES);
}

