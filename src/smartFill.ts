import { renderArtwork } from './layers';
import type { BlendMode, PaintGradient, Point, Stroke } from './types';

// A small deterministic raster is used ONLY to detect a bounded area. The
// artwork itself is saved and synchronized as compact vector contours.
export const MASK_WIDTH = 500;
export const MASK_HEIGHT = 350;
const MAX_VECTOR_POINTS = 1800;
const MAX_HOLES = 12;

type Contour = Point[];
export type FillResult =
  | { ok: true; stroke: Stroke }
  | { ok: false; reason: 'open' | 'tiny' | 'complex' | 'unavailable' };

export type FillOptions = {
  color: string;
  opacity: number;
  gradient?: PaintGradient;
  blend?: BlendMode;
  by: string;
  id: string;
};

// The guide may be behind user ink on screen, but its solid SVG outlines can
// still serve as fill boundaries, even before someone traces them.
async function guideImage(guide: SVGSVGElement | null): Promise<HTMLImageElement | null> {
  if (!guide) return null;
  const clone = guide.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '1000');
  clone.setAttribute('height', '700');
  clone.removeAttribute('class');
  clone.querySelectorAll('[data-guide-step]').forEach((element) => element.removeAttribute('class'));
  const svg = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } catch {
    return null;
  } finally {
    // Blob may be revoked once the pixels are decoded by the browser.
    URL.revokeObjectURL(url);
  }
}

export async function createFillMask(strokes: readonly Stroke[], guide: SVGSVGElement | null): Promise<Uint8Array | null> {
  const canvas = document.createElement('canvas');
  canvas.width = MASK_WIDTH;
  canvas.height = MASK_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.setTransform(MASK_WIDTH / 1000, 0, 0, MASK_HEIGHT / 700, 0, 0);
  const image = await guideImage(guide);
  if (image) ctx.drawImage(image, 0, 0, 1000, 700);
  // Only outlines are barriers, not already filled shapes. Eraser strokes can
  // create intentional openings in the boundary.
  const ink = document.createElement('canvas');
  ink.width = MASK_WIDTH;
  ink.height = MASK_HEIGHT;
  const inkCtx = ink.getContext('2d');
  if (inkCtx) {
    renderArtwork(inkCtx, strokes.filter((stroke) => stroke.tool !== 'fill'));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(ink, 0, 0);
    ctx.restore();
  }
  const pixels = ctx.getImageData(0, 0, MASK_WIDTH, MASK_HEIGHT).data;
  const walls = new Uint8Array(MASK_WIDTH * MASK_HEIGHT);
  for (let i = 0; i < walls.length; i++) walls[i] = pixels[i * 4 + 3] >= 28 ? 1 : 0;
  // Close single-pixel gaps and diagonal leaks without introducing a costly
  // morphology library. Keeps outlined watercolor and textured ink fillable.
  const sealed = walls.slice();
  for (let y = 1; y < MASK_HEIGHT - 1; y++) {
    for (let x = 1; x < MASK_WIDTH - 1; x++) {
      const i = y * MASK_WIDTH + x;
      if (!walls[i]) continue;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) sealed[i + oy * MASK_WIDTH + ox] = 1;
      }
    }
  }
  return sealed;
}

function area(polygon: readonly Point[]): number {
  let n = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    n += a.x * b.y - b.x * a.y;
  }
  return n / 2;
}

function pointIn(point: Point, polygon: readonly Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) &&
      point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function distanceSq(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len));
  const x = a.x + t * dx - p.x, y = a.y + t * dy - p.y;
  return x * x + y * y;
}

function rdp(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let farthest = 0, selected = -1;
    for (let i = a + 1; i < b; i++) {
      const d = distanceSq(points[i], points[a], points[b]);
      if (d > farthest) { farthest = d; selected = i; }
    }
    if (selected !== -1 && farthest > tolerance * tolerance) {
      keep[selected] = 1;
      stack.push([a, selected], [selected, b]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}

function simplifyClosed(points: Point[], tolerance: number): Point[] {
  if (points.length <= 4) return points;
  const anchor = points[0];
  let opposite = 1, far = 0;
  for (let i = 1; i < points.length; i++) {
    const d = (points[i].x - anchor.x) ** 2 + (points[i].y - anchor.y) ** 2;
    if (d > far) { far = d; opposite = i; }
  }
  const left = rdp(points.slice(0, opposite + 1), tolerance);
  const right = rdp([...points.slice(opposite), points[0]], tolerance);
  return [...left.slice(0, -1), ...right.slice(0, -1)];
}

// Trace the boundary of a *single* flood-connected component. Signed winding
// distinguishes its outer edge from enclosed holes (for example a doughnut).
export function regionContours(walls: Uint8Array, at: Point): { outer: Contour; holes: Contour[] } | null {
  const w = MASK_WIDTH, h = MASK_HEIGHT;
  if (walls.length !== w * h) return null;
  const sx = Math.min(w - 1, Math.max(0, Math.floor(at.x / 2)));
  const sy = Math.min(h - 1, Math.max(0, Math.floor(at.y / 2)));
  const seed = sy * w + sx;
  if (walls[seed]) return null;
  const visited = new Uint8Array(w * h);
  const queue = new Uint32Array(w * h);
  let first = 0, last = 1, leaks = false;
  queue[0] = seed;
  visited[seed] = 1;
  while (first < last) {
    const pos = queue[first++];
    const x = pos % w, y = Math.floor(pos / w);
    if (!x || !y || x === w - 1 || y === h - 1) leaks = true;
    for (const next of [x > 0 ? pos - 1 : -1, x < w - 1 ? pos + 1 : -1,
      y > 0 ? pos - w : -1, y < h - 1 ? pos + w : -1]) {
      if (next >= 0 && !walls[next] && !visited[next]) {
        visited[next] = 1;
        queue[last++] = next;
      }
    }
  }
  if (leaks || last < 12) return null;

  const from: number[] = [], to: number[] = [], dir: number[] = [];
  const byStart = new Map<number, number[]>();
  const width = w + 1;
  const add = (a: number, b: number, direction: number) => {
    const id = from.length;
    from.push(a); to.push(b); dir.push(direction);
    const edges = byStart.get(a) ?? [];
    edges.push(id);
    byStart.set(a, edges);
  };
  for (let i = 0; i < last; i++) {
    const pos = queue[i], x = pos % w, y = Math.floor(pos / w);
    const a = y * width + x;
    if (!visited[pos - w]) add(a, a + 1, 0);
    if (!visited[pos + 1]) add(a + 1, a + width + 1, 1);
    if (!visited[pos + w]) add(a + width + 1, a + width, 2);
    if (!visited[pos - 1]) add(a + width, a, 3);
  }
  const used = new Uint8Array(from.length);
  const loops: Contour[] = [];
  const rank = (a: number, b: number) => [1, 0, 3, 2].indexOf((b - a + 4) % 4);
  for (let firstEdge = 0; firstEdge < from.length; firstEdge++) {
    if (used[firstEdge]) continue;
    let edge = firstEdge;
    const loop: Contour = [];
    let closed = false;
    while (!used[edge] && loop.length <= from.length) {
      used[edge] = 1;
      const vertex = from[edge];
      loop.push({ x: vertex % width * 2, y: Math.floor(vertex / width) * 2 });
      const end = to[edge];
      if (end === from[firstEdge]) { closed = true; break; }
      const candidates = (byStart.get(end) ?? []).filter((e) => !used[e]);
      if (!candidates.length) break;
      candidates.sort((a, b) => rank(dir[edge], dir[a]) - rank(dir[edge], dir[b]));
      edge = candidates[0];
    }
    if (closed && loop.length >= 3) loops.push(loop);
  }
  if (!loops.length) return null;
  loops.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  const outerRaw = loops.find((loop) => area(loop) > 0);
  if (!outerRaw) return null;
  const holesRaw = loops.filter((loop) => area(loop) < 0 && pointIn(loop[0], outerRaw));
  if (holesRaw.length > MAX_HOLES) return null;
  for (const tolerance of [1.25, 2, 3, 4.5, 7]) {
    const outer = simplifyClosed(outerRaw, tolerance);
    const holes = holesRaw.map((loop) => simplifyClosed(loop, tolerance)).filter((loop) => loop.length >= 3);
    if (outer.length >= 3 && outer.length + holes.reduce((s, p) => s + p.length, 0) <= MAX_VECTOR_POINTS) {
      return { outer, holes };
    }
  }
  return null;
}

export function fillFromWalls(walls: Uint8Array, at: Point, options: FillOptions): FillResult {
  const region = regionContours(walls, at);
  if (!region) return { ok: false, reason: 'open' };
  const size = Math.abs(area(region.outer));
  if (size < 50) return { ok: false, reason: 'tiny' };
  if (region.outer.length < 3 || region.outer.length > MAX_VECTOR_POINTS) return { ok: false, reason: 'complex' };
  return { ok: true, stroke: {
    id: options.id, by: options.by, tool: 'fill', color: options.color, size: 1,
    opacity: options.opacity, gradient: options.gradient, blend: options.blend,
    points: region.outer, ...(region.holes.length ? { holes: region.holes } : {}),
  } };
}

export async function makeSmartFill(strokes: readonly Stroke[], guide: SVGSVGElement | null,
  at: Point, options: FillOptions): Promise<FillResult> {
  try {
    const mask = await createFillMask(strokes, guide);
    return mask ? fillFromWalls(mask, at, options) : { ok: false, reason: 'unavailable' };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
