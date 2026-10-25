import { gradientSampler, strokePaint } from './colorPaint';
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

type Sample = { x: number; y: number; p: number };

function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}

function pressure(value?: number) {
  return value === undefined ? 0.68 : clamp(value, 0, 1);
}

// A seeded generator makes textured strokes look the same on both partners' screens.
// No random brush state or generated particle coordinates need to cross the network.
function seeded(seedText: string): () => number {
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    seed = Math.imul(seed ^ seedText.charCodeAt(i), 16777619);
  }
  return () => {
    seed += 0x6d2b79f5;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleStroke(points: Point[]): Sample[] {
  if (points.length === 1) return [{ x: points[0].x, y: points[0].y, p: pressure(points[0].p) }];

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  const spacing = Math.max(2.25, total / 2200);
  const samples: Sample[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const before = points[Math.max(0, i - 1)];
    const after = points[Math.min(points.length - 1, i + 2)];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(length / spacing));
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const curve = (p0: number, p1: number, p2: number, p3: number) =>
        0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
          (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
      samples.push({
        x: clamp(curve(before.x, a.x, b.x, after.x), 0, 1000),
        y: clamp(curve(before.y, a.y, b.y, after.y), 0, 700),
        p: pressure(a.p) + (pressure(b.p) - pressure(a.p)) * t,
      });
    }
  }
  const last = points[points.length - 1];
  samples.push({ x: last.x, y: last.y, p: pressure(last.p) });
  return samples;
}

function radiusAt(sample: Sample, size: number, variability: number): number {
  return Math.max(0.32, size * 0.5 * (1 + variability * (sample.p - 0.55)));
}

// A single filled ribbon avoids the dark overlapping circles common in marker
// and watercolor emulations. It also gives pen/stylus pressure real width variation.
function paintRibbon(
  ctx: CanvasRenderingContext2D,
  samples: Sample[],
  color: string | CanvasGradient,
  size: number,
  alpha: number,
  variability = 0.7,
  wobble = 0,
  seed = 0,
) {
  if (!samples.length || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (samples.length === 1) {
    ctx.arc(samples[0].x, samples[0].y, radiusAt(samples[0], size, variability), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  for (let i = 0; i < samples.length; i++) {
    const previous = samples[Math.max(i - 1, 0)];
    const next = samples[Math.min(i + 1, samples.length - 1)];
    const distance = Math.hypot(next.x - previous.x, next.y - previous.y) || 1;
    const nx = -(next.y - previous.y) / distance;
    const ny = (next.x - previous.x) / distance;
    // A stable pseudo-grain value; the same stroke never shimmers on repaint.
    const noise = Math.sin((i + 1) * 8.173 + seed * 0.00001) *
      Math.cos((i + 3) * 5.873 + seed * 0.00003);
    const r = radiusAt(samples[i], size, variability) * (1 + wobble * noise);
    left.push({ x: samples[i].x + nx * r, y: samples[i].y + ny * r });
    right.push({ x: samples[i].x - nx * r, y: samples[i].y - ny * r });
  }
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
  const tail = samples[samples.length - 1];
  const preTail = samples[samples.length - 2];
  const tailRadius = radiusAt(tail, size, variability);
  const tailAngle = Math.atan2(tail.y - preTail.y, tail.x - preTail.x);
  ctx.quadraticCurveTo(tail.x + Math.cos(tailAngle) * tailRadius,
    tail.y + Math.sin(tailAngle) * tailRadius, right[right.length - 1].x, right[right.length - 1].y);
  for (let i = right.length - 2; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  const head = samples[0];
  const postHead = samples[1];
  const headRadius = radiusAt(head, size, variability);
  const headAngle = Math.atan2(head.y - postHead.y, head.x - postHead.x);
  ctx.quadraticCurveTo(head.x + Math.cos(headAngle) * headRadius,
    head.y + Math.sin(headAngle) * headRadius, left[0].x, left[0].y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function speckle(ctx: CanvasRenderingContext2D, samples: Sample[], stroke: Stroke,
  alpha: number, density: number, radiusFactor: number) {
  const random = seeded(`${stroke.id}:${stroke.brush ?? 'ink'}:grain`);
  ctx.save();
  ctx.fillStyle = strokePaint(ctx, stroke);
  ctx.globalAlpha = alpha;
  for (let i = 0; i < samples.length; i += density) {
    const sample = samples[i];
    const radius = stroke.size * radiusFactor * (0.45 + sample.p);
    for (let n = 0; n < 3; n++) {
      const angle = random() * Math.PI * 2;
      const offset = (random() - random()) * radius;
      const x = sample.x + Math.cos(angle) * offset;
      const y = sample.y + Math.sin(angle) * offset;
      const dot = 0.35 + random() * 1.3;
      ctx.fillRect(x, y, dot, dot);
    }
  }
  ctx.restore();
}

function radialColor(hex: string, alpha: number) {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}

function airbrush(ctx: CanvasRenderingContext2D, samples: Sample[], stroke: Stroke, opacity: number) {
  const colorAt = gradientSampler(stroke);
  ctx.save();
  let previousX = Number.NEGATIVE_INFINITY;
  let previousY = Number.NEGATIVE_INFINITY;
  for (const sample of samples) {
    const radius = stroke.size * (1.7 + sample.p * 0.6);
    if (Math.hypot(sample.x - previousX, sample.y - previousY) < radius * 0.25) continue;
    const gradient = ctx.createRadialGradient(sample.x, sample.y, 0, sample.x, sample.y, radius);
    const shade = colorAt(sample.x, sample.y);
    gradient.addColorStop(0, radialColor(shade, 0.16 * opacity));
    gradient.addColorStop(0.38, radialColor(shade, 0.095 * opacity));
    gradient.addColorStop(1, radialColor(shade, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(sample.x - radius, sample.y - radius, radius * 2, radius * 2);
    previousX = sample.x;
    previousY = sample.y;
  }
  ctx.restore();
}

function sparkles(ctx: CanvasRenderingContext2D, samples: Sample[], stroke: Stroke, opacity: number) {
  const random = seeded(`${stroke.id}:sparkles`);
  const colorAt = gradientSampler(stroke);
  ctx.save();
  for (let i = 0; i < samples.length; i += 7) {
    const sample = samples[i];
    const spread = stroke.size * (0.2 + sample.p * 0.55);
    const x = sample.x + (random() - random()) * spread;
    const y = sample.y + (random() - random()) * spread;
    const r = Math.max(1.3, stroke.size * (0.08 + random() * 0.18));
    ctx.globalAlpha = (0.25 + random() * 0.65) * opacity;
    ctx.fillStyle = random() > 0.52 ? '#fff2b5' : colorAt(x, y);
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + r * 0.2, y - r * 0.2, x + r, y);
    ctx.quadraticCurveTo(x + r * 0.2, y + r * 0.2, x, y + r);
    ctx.quadraticCurveTo(x - r * 0.2, y + r * 0.2, x - r, y);
    ctx.quadraticCurveTo(x - r * 0.2, y - r * 0.2, x, y - r);
    ctx.fill();
  }
  ctx.restore();
}

export function paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (!stroke.points.length) return;
  if (stroke.tool === 'fill') {
    ctx.save();
    ctx.globalCompositeOperation = stroke.blend === 'multiply' || stroke.blend === 'screen' ? stroke.blend : 'source-over';
    ctx.globalAlpha = clamp(stroke.opacity ?? 1, 0.1, 1);
    ctx.fillStyle = strokePaint(ctx, stroke);
    ctx.beginPath();
    const rings = [stroke.points, ...(stroke.holes ?? [])];
    for (const ring of rings) {
      if (ring.length < 3) continue;
      ctx.moveTo(ring[0].x, ring[0].y);
      for (let i = 1; i < ring.length; i++) ctx.lineTo(ring[i].x, ring[i].y);
      ctx.closePath();
    }
    ctx.fill('evenodd');
    ctx.restore();
    return;
  }
  const samples = sampleStroke(stroke.points);
  const opacity = clamp(stroke.opacity ?? 1, 0.1, 1);
  ctx.save();

  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    paintRibbon(ctx, samples, '#000000', stroke.size, 1, 0.1);
    ctx.restore();
    return;
  }

  // Blending happens inside the shared transparent ink layer. Each partner
  // replays the same stroke order, and older strokes default to normal ink.
  ctx.globalCompositeOperation = stroke.blend === 'multiply' || stroke.blend === 'screen'
    ? stroke.blend : 'source-over';
  const color = strokePaint(ctx, stroke);
  switch (stroke.brush ?? 'ink') {
    case 'pencil':
      paintRibbon(ctx, samples, color, stroke.size * 0.76, opacity * 0.72, 0.92, 0.08);
      speckle(ctx, samples, stroke, opacity * 0.28, 3, 0.42);
      break;
    case 'marker':
      paintRibbon(ctx, samples, color, stroke.size * 1.15, opacity * 0.60, 0.23);
      paintRibbon(ctx, samples, color, stroke.size * 0.80, opacity * 0.10, 0.26);
      break;
    case 'watercolor':
      paintRibbon(ctx, samples, color, stroke.size * 1.55, opacity * 0.17, 0.28, 0.22, 2381);
      paintRibbon(ctx, samples, color, stroke.size * 1.20, opacity * 0.23, 0.30, 0.15, 953);
      paintRibbon(ctx, samples, color, stroke.size * 0.80, opacity * 0.13, 0.48, 0.12, 593);
      speckle(ctx, samples, stroke, opacity * 0.18, 2, 0.75);
      break;
    case 'crayon':
      paintRibbon(ctx, samples, color, stroke.size * 1.05, opacity * 0.67, 0.5, 0.36, 8271);
      speckle(ctx, samples, stroke, opacity * 0.48, 1, 0.65);
      break;
    case 'airbrush':
      airbrush(ctx, samples, stroke, opacity);
      break;
    case 'glitter':
      paintRibbon(ctx, samples, color, stroke.size * 0.45, opacity * 0.35, 0.25);
      sparkles(ctx, samples, stroke, opacity);
      break;
    case 'ink':
    default:
      paintRibbon(ctx, samples, color, stroke.size, opacity, 0.92);
  }
  ctx.restore();
}

// Smart fills sit underneath linework, so tapping an enclosed shape never hides
// its outline. Preserve order within both groups for shared deterministic replay.
export function paintArtwork(ctx: CanvasRenderingContext2D, strokes: readonly Stroke[]) {
  for (const stroke of strokes) if (!stroke.hidden && stroke.tool === 'fill') paintStroke(ctx, stroke);
  for (const stroke of strokes) if (!stroke.hidden && stroke.tool !== 'fill') paintStroke(ctx, stroke);
}
