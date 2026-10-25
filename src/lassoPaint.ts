import type { BlendMode, PaintGradient, Point, Stroke } from './types';

// Trace a freehand outline and close it into a movable vector-color region.
// This is deliberately separate from the existing lasso selection tool.
export function lassoPaintPolygon(outline: readonly Point[]): Point[] | null {
  if (!Array.isArray(outline) || outline.length < 3) return null;
  const clean: Point[] = [];
  for (const candidate of outline) {
    if (!candidate || !Number.isFinite(candidate.x) || !Number.isFinite(candidate.y) ||
        candidate.x < 0 || candidate.x > 1000 || candidate.y < 0 || candidate.y > 700) return null;
    const previous = clean[clean.length - 1];
    if (!previous || Math.hypot(candidate.x - previous.x, candidate.y - previous.y) >= 2) {
      clean.push({ x: candidate.x, y: candidate.y });
    }
  }
  if (clean.length > 3 && Math.hypot(clean[0].x - clean[clean.length - 1].x,
      clean[0].y - clean[clean.length - 1].y) < 5) clean.pop();
  if (clean.length < 3 || clean.length > 2000) return null;
  let twiceArea = 0;
  for (let i = 0; i < clean.length; i++) {
    const p = clean[i];
    const q = clean[(i + 1) % clean.length];
    twiceArea += p.x * q.y - p.y * q.x;
  }
  if (Math.abs(twiceArea) / 2 < 80) return null;
  return clean;
}

export function makeLassoPaint(outline: readonly Point[], ink: {
  id: string;
  by: string;
  color: string;
  opacity: number;
  gradient?: PaintGradient;
  blend?: BlendMode;
}): Stroke | null {
  const points = lassoPaintPolygon(outline);
  if (!points) return null;
  return {
    id: ink.id,
    by: ink.by,
    tool: 'fill',
    color: ink.color,
    size: 1,
    opacity: ink.opacity,
    ...(ink.gradient ? { gradient: ink.gradient } : {}),
    ...(ink.blend && ink.blend !== 'normal' ? { blend: ink.blend } : {}),
    points,
  };
}
