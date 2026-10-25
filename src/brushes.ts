import { strokePaint } from './colorPaint';
import type { BrushStyle, Point, Stroke } from './types';

export const brushChoices: { id: BrushStyle; name: string; description: string }[] = [
  { id: 'ink', name: 'Ink', description: 'Clean flowing lines' },
  { id: 'pencil', name: 'Pencil', description: 'Soft graphite grain' },
  { id: 'marker', name: 'Marker', description: 'Velvety translucent ink' },
  { id: 'watercolor', name: 'Watercolor', description: 'Gentle pigment blooms' },
  { id: 'crayon', name: 'Crayon', description: 'Playful wax texture' },
  { id: 'airbrush', name: 'Airbrush', description: 'Feather-soft shading' },
  { id: 'glitter', name: 'Sparkle', description: 'Little glowing flecks' },
];

type Sample = { x: number; y: number; pressure: number };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function seeded(text: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < text.length; i++) state = Math.imul(state ^ text.charCodeAt(i), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

// Linear, arc-length-based resampling avoids the self-intersecting Catmull-Rom
// ribbons and sharp wedges previously seen when the pointer doubled back.
function samples(points: Point[], brushSize: number): Sample[] {
  if (!points.length) return [];
  const result: Sample[] = [{ x: points[0].x, y: points[0].y, pressure: points[0].p ?? 0.68 }];
  const spacing = Math.max(0.8, Math.min(2.6, brushSize * 0.16));
  let pendingDistance = 0;
  for (let i = 1; i < points.length && result.length < 6000; i++) {
    const a = points[i - 1], b = points[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length < 0.01) continue;
    let distance = spacing - pendingDistance;
    while (distance <= length && result.length < 6000) {
      const t = distance / length;
      result.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        pressure: (a.p ?? 0.68) + ((b.p ?? 0.68) - (a.p ?? 0.68)) * t,
      });
      distance += spacing;
    }
    pendingDistance = length - (distance - spacing);
  }
  const last = points[points.length - 1];
  if (result.length < 6000 && (result[result.length - 1].x !== last.x || result[result.length - 1].y !== last.y)) {
    result.push({ x: last.x, y: last.y, pressure: last.p ?? 0.68 });
  }
  return result;
}

function stampRadius(brush: BrushStyle, size: number, pressure: number) {
  const widths: Record<BrushStyle, number> = {
    ink: 0.52, pencil: 0.39, marker: 0.66, watercolor: 0.86,
    crayon: 0.58, airbrush: 1.15, glitter: 0.33,
  };
  return Math.max(0.45, size * widths[brush] * (0.75 + clamp(pressure, 0, 1) * 0.45));
}

// Work in a tightly cropped temporary canvas. Every dab first paints at full
// alpha into ONE stroke mask; opacity is applied only when that completed mask
// is composited. An individual stroke therefore cannot darken where its dabs
// happen to overlap. Separate strokes may still deliberately build pigment.
function maskFor(ctx: CanvasRenderingContext2D, stroke: Stroke, brush: BrushStyle) {
  const transform = ctx.getTransform();
  const scale = Math.max(0.1, Math.max(Math.abs(transform.a), Math.abs(transform.d)));
  const margin = stroke.size * (brush === 'airbrush' ? 4 : brush === 'watercolor' ? 2.8 : 1.5) + 4;
  const xs = stroke.points.map((p) => p.x), ys = stroke.points.map((p) => p.y);
  const left = Math.max(0, Math.floor((Math.min(...xs) - margin) * scale + transform.e));
  const top = Math.max(0, Math.floor((Math.min(...ys) - margin) * scale + transform.f));
  const right = Math.min(ctx.canvas.width, Math.ceil((Math.max(...xs) + margin) * scale + transform.e));
  const bottom = Math.min(ctx.canvas.height, Math.ceil((Math.max(...ys) + margin) * scale + transform.f));
  if (right <= left || bottom <= top) return null;
  const canvas = document.createElement('canvas');
  canvas.width = right - left;
  canvas.height = bottom - top;
  const ink = canvas.getContext('2d');
  if (!ink) return null;
  ink.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e - left, transform.f - top);
  return { canvas, ink, left, top };
}

function dottedMask(ctx: CanvasRenderingContext2D, marks: Sample[], stroke: Stroke, brush: BrushStyle) {
  ctx.fillStyle = '#000';
  for (const sample of marks) {
    const radius = stampRadius(brush, stroke.size, sample.pressure);
    ctx.beginPath();
    ctx.arc(sample.x, sample.y, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function grainMask(ctx: CanvasRenderingContext2D, marks: Sample[], stroke: Stroke, brush: 'pencil' | 'crayon') {
  const rand = seeded(`${stroke.id}:${brush}:texture`);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.globalAlpha = brush === 'pencil' ? 0.34 : 0.72;
  const count = brush === 'pencil' ? 2 : 4;
  for (let i = 0; i < marks.length; i += brush === 'pencil' ? 3 : 2) {
    const s = marks[i];
    const radius = stampRadius(brush, stroke.size, s.pressure);
    for (let n = 0; n < count; n++) {
      const theta = rand() * 2 * Math.PI;
      const distance = rand() * radius;
      const x = s.x + Math.cos(theta) * distance;
      const y = s.y + Math.sin(theta) * distance;
      const d = brush === 'crayon' ? 0.5 + rand() * 1.1 : 0.25 + rand() * 0.6;
      ctx.fillRect(x, y, d, d);
    }
  }
  ctx.restore();
}

function glitterMask(ctx: CanvasRenderingContext2D, marks: Sample[], stroke: Stroke) {
  const random = seeded(`${stroke.id}:sparkle`);
  ctx.fillStyle = '#000';
  for (let i = 0; i < marks.length; i += 6) {
    const s = marks[i];
    const r = Math.max(0.9, stroke.size * (0.09 + random() * 0.20));
    const x = s.x + (random() - random()) * stroke.size * 0.4;
    const y = s.y + (random() - random()) * stroke.size * 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y);
    ctx.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r);
    ctx.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y);
    ctx.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r);
    ctx.fill();
  }
}

export function paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (!stroke.points.length || stroke.hidden) return;
  if (stroke.tool === 'fill') {
    ctx.save();
    ctx.globalCompositeOperation = stroke.blend === 'multiply' || stroke.blend === 'screen' ? stroke.blend : 'source-over';
    ctx.globalAlpha = clamp(stroke.opacity ?? 1, 0.1, 1);
    ctx.fillStyle = strokePaint(ctx, stroke);
    ctx.beginPath();
    for (const ring of [stroke.points, ...(stroke.holes ?? [])]) {
      if (ring.length < 3) continue;
      ctx.moveTo(ring[0].x, ring[0].y);
      for (let i = 1; i < ring.length; i++) ctx.lineTo(ring[i].x, ring[i].y);
      ctx.closePath();
    }
    ctx.fill('evenodd');
    ctx.restore();
    return;
  }
  const brush = stroke.tool === 'eraser' ? 'ink' : stroke.brush ?? 'ink';
  const layer = maskFor(ctx, stroke, brush);
  if (!layer) return;
  const { canvas, ink, left, top } = layer;
  const marks = samples(stroke.points, stroke.size);
  if (stroke.brush === 'glitter' && stroke.tool !== 'eraser') glitterMask(ink, marks, stroke);
  else dottedMask(ink, marks, stroke, brush);
  if (stroke.tool !== 'eraser') {
    if (brush === 'pencil' || brush === 'crayon') grainMask(ink, marks, stroke, brush);
    ink.globalCompositeOperation = 'source-in';
    ink.globalAlpha = 1;
    ink.fillStyle = strokePaint(ink, stroke);
    ink.fillRect(0, 0, 1000, 700);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = stroke.tool === 'eraser'
    ? 'destination-out' : stroke.blend === 'multiply' || stroke.blend === 'screen' ? stroke.blend : 'source-over';
  const baseAlpha: Record<BrushStyle, number> = {
    ink: 1, pencil: 0.8, marker: 0.66, watercolor: 0.48,
    crayon: 0.9, airbrush: 0.42, glitter: 0.94,
  };
  ctx.globalAlpha = stroke.tool === 'eraser' ? 1 : clamp(stroke.opacity ?? 1, 0.1, 1) * baseAlpha[brush];
  if (brush === 'airbrush' || brush === 'watercolor') {
    const blur = Math.min(24, stroke.size * (brush === 'airbrush' ? 0.75 : 0.16));
    ctx.filter = `blur(${blur * Math.max(0.5, ctx.canvas.width / 1000)}px)`;
  }
  ctx.drawImage(canvas, left, top);
  ctx.restore();
}

export function paintArtwork(ctx: CanvasRenderingContext2D, strokes: readonly Stroke[]) {
  // All tools share one chronological stack. A late fill paints over earlier
  // lines; a later brush stroke paints over that fill. Ownership clipping is
  // applied by layers.ts before reaching this renderer.
  for (const stroke of strokes) paintStroke(ctx, stroke);
}
