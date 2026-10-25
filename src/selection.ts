import type { Point, SelectionEdit, Stroke } from './types';

export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 700;
export const MAX_SELECTION = 80;

export type Bounds = { left: number; top: number; right: number; bottom: number };

function boundsOfPoints(points: readonly Point[]): Bounds | null {
  if (!points.length) return null;
  let left = Infinity; let top = Infinity;
  let right = -Infinity; let bottom = -Infinity;
  for (const point of points) {
    left = Math.min(left, point.x);
    right = Math.max(right, point.x);
    top = Math.min(top, point.y);
    bottom = Math.max(bottom, point.y);
  }
  return { left, right, top, bottom };
}

export function selectionBounds(strokes: readonly Stroke[], selectedIds: readonly string[]): Bounds | null {
  const ids = new Set(selectedIds);
  let bounds: Bounds | null = null;
  for (const stroke of strokes) {
    if (!ids.has(stroke.id) || stroke.hidden) continue;
    const rect = boundsOfPoints(stroke.points);
    if (!rect) continue;
    const pad = Math.max(7, stroke.size * (stroke.brush === 'airbrush' ? 2.2 : 0.9));
    bounds = bounds ? {
      left: Math.min(bounds.left, rect.left - pad),
      top: Math.min(bounds.top, rect.top - pad),
      right: Math.max(bounds.right, rect.right + pad),
      bottom: Math.max(bounds.bottom, rect.bottom + pad),
    } : { left: rect.left - pad, top: rect.top - pad, right: rect.right + pad, bottom: rect.bottom + pad };
  }
  return bounds;
}

function boxesOverlap(a: Bounds, b: Bounds) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

function inside(point: Point, polygon: readonly Point[]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]; const b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) &&
        point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
}

function direction(a: Point, b: Point, c: Point) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function crosses(a: Point, b: Point, c: Point, d: Point) {
  const ab1 = direction(a, b, c), ab2 = direction(a, b, d);
  const cd1 = direction(c, d, a), cd2 = direction(c, d, b);
  return (ab1 === 0 || ab2 === 0 || (ab1 < 0) !== (ab2 < 0)) &&
    (cd1 === 0 || cd2 === 0 || (cd1 < 0) !== (cd2 < 0)) &&
    Math.min(a.x, b.x) <= Math.max(c.x, d.x) && Math.max(a.x, b.x) >= Math.min(c.x, d.x) &&
    Math.min(a.y, b.y) <= Math.max(c.y, d.y) && Math.max(a.y, b.y) >= Math.min(c.y, d.y);
}

function polygonArea(points: readonly Point[]) {
  let twiceArea = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]; const b = points[(i + 1) % points.length];
    twiceArea += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twiceArea) / 2;
}

// This MVP lasso selects entire vector strokes touching the loop, not raster pixels.
// Check both inside points and crossings so a loop can select a long stroke
// even when both endpoints sit outside the lasso.
export function strokesInsideLasso(strokes: readonly Stroke[], polygon: readonly Point[]): string[] {
  if (polygon.length < 3 || polygonArea(polygon) < 65) return [];
  const region = boundsOfPoints(polygon);
  if (!region) return [];
  const result: string[] = [];
  for (const stroke of strokes) {
    if (stroke.hidden || stroke.tool !== 'pen' || result.length >= MAX_SELECTION) continue;
    const box = boundsOfPoints(stroke.points);
    if (!box || !boxesOverlap({
      left: box.left - stroke.size, right: box.right + stroke.size,
      top: box.top - stroke.size, bottom: box.bottom + stroke.size,
    }, region)) continue;
    if (stroke.points.some((point) => inside(point, polygon))) {
      result.push(stroke.id);
      continue;
    }
    let hit = false;
    for (let s = 1; s < stroke.points.length && !hit; s++) {
      const a = stroke.points[s - 1]; const b = stroke.points[s];
      for (let p = 0; p < polygon.length; p++) {
        if (crosses(a, b, polygon[p], polygon[(p + 1) % polygon.length])) {
          hit = true;
          break;
        }
      }
    }
    if (hit) result.push(stroke.id);
  }
  return result;
}

export function limitTranslation(strokes: readonly Stroke[], ids: readonly string[], dx: number, dy: number) {
  const selected = new Set(ids);
  let left = Infinity; let top = Infinity;
  let right = -Infinity; let bottom = -Infinity;
  for (const stroke of strokes) {
    if (!selected.has(stroke.id) || stroke.hidden) continue;
    for (const point of stroke.points) {
      left = Math.min(left, point.x); top = Math.min(top, point.y);
      right = Math.max(right, point.x); bottom = Math.max(bottom, point.y);
    }
  }
  if (left === Infinity) return { dx: 0, dy: 0 };
  return {
    dx: Math.max(-left, Math.min(CANVAS_WIDTH - right, dx)),
    dy: Math.max(-top, Math.min(CANVAS_HEIGHT - bottom, dy)),
  };
}

function shifted(stroke: Stroke, dx: number, dy: number, stamp: number, actor: string): Stroke {
  return {
    ...stroke, lastEdit: stamp, lastEditor: actor,
    points: stroke.points.map((point) => ({ ...point, x: Math.max(0, Math.min(CANVAS_WIDTH, point.x + dx)),
      y: Math.max(0, Math.min(CANVAS_HEIGHT, point.y + dy)) })),
  };
}

export function applySelectionEdit(strokes: readonly Stroke[], edit: SelectionEdit, actor: string): Stroke[] {
  if (edit.action === 'move') {
    const targets = new Set(edit.ids);
    return strokes.map((stroke) => targets.has(stroke.id) && !stroke.hidden
      ? shifted(stroke, edit.dx, edit.dy, edit.stamp, actor) : stroke);
  }
  if (edit.action === 'visibility') {
    const targets = new Set(edit.ids);
    return strokes.map((stroke) => targets.has(stroke.id)
      ? { ...stroke, hidden: !edit.visible, lastEdit: edit.stamp, lastEditor: actor } : stroke);
  }
  const originals = new Map(strokes.map((stroke) => [stroke.id, stroke]));
  const seen = new Set(originals.keys());
  const copies: Stroke[] = [];
  edit.sources.forEach((id, index) => {
    const source = originals.get(id);
    const newId = edit.copies[index];
    if (!source || source.hidden || seen.has(newId)) return;
    copies.push({ ...shifted(source, edit.dx, edit.dy, edit.stamp, actor),
      id: newId, by: actor, hidden: false });
    seen.add(newId);
  });
  return [...strokes, ...copies].slice(-300);
}

function validIds(ids: unknown): ids is string[] {
  return Array.isArray(ids) && ids.length > 0 && ids.length <= MAX_SELECTION &&
    ids.every((id) => typeof id === 'string' && id.length > 0 && id.length < 128) &&
    new Set(ids).size === ids.length;
}

export function isSelectionEdit(value: unknown): value is SelectionEdit {
  if (!value || typeof value !== 'object') return false;
  const edit = value as Record<string, unknown>;
  if (typeof edit.opId !== 'string' || edit.opId.length < 8 || edit.opId.length > 128 ||
      !Number.isSafeInteger(edit.revision) || Number(edit.revision) < 0 ||
      !Number.isSafeInteger(edit.stamp) || Number(edit.stamp) < 1) return false;
  if (edit.action === 'visibility') return validIds(edit.ids) && typeof edit.visible === 'boolean';
  if (edit.action === 'move') return validIds(edit.ids) &&
    typeof edit.dx === 'number' && Number.isFinite(edit.dx) && Math.abs(edit.dx) <= CANVAS_WIDTH &&
    typeof edit.dy === 'number' && Number.isFinite(edit.dy) && Math.abs(edit.dy) <= CANVAS_HEIGHT;
  return edit.action === 'duplicate' && validIds(edit.sources) && validIds(edit.copies) &&
    edit.sources.length === edit.copies.length &&
    typeof edit.dx === 'number' && Number.isFinite(edit.dx) && Math.abs(edit.dx) <= CANVAS_WIDTH &&
    typeof edit.dy === 'number' && Number.isFinite(edit.dy) && Math.abs(edit.dy) <= CANVAS_HEIGHT;
}
