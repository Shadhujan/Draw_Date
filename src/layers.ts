import { paintArtwork, paintStroke } from './brushes';
import { HALF, type Seat } from './ownership';
import type { Stroke } from './types';

export type PigmentLayer = 'legacy' | Seat;
export type LayerSet = Record<PigmentLayer, HTMLCanvasElement>;

function createLayer(width: number, height: number): HTMLCanvasElement {
  const layer = document.createElement('canvas');
  layer.width = width;
  layer.height = height;
  return layer;
}

function clippedLayer(ctx: CanvasRenderingContext2D, seat: Seat | 'legacy',
  width: number, height: number, action: () => void) {
  ctx.save();
  ctx.setTransform(width / 1000, 0, 0, height / 700, 0, 0);
  if (seat !== 'legacy') {
    ctx.beginPath();
    ctx.rect(seat === 'host' ? 0 : HALF, 0, HALF, 700);
    ctx.clip();
  }
  action();
  ctx.restore();
}

export function buildLayers(strokes: readonly Stroke[], width: number, height: number): LayerSet {
  const layers: LayerSet = {
    legacy: createLayer(width, height), host: createLayer(width, height), guest: createLayer(width, height),
  };
  (['legacy', 'host', 'guest'] as const).forEach((seat) => {
    const ctx = layers[seat].getContext('2d');
    if (!ctx) return;
    const owned = strokes.filter((stroke) => (stroke.owner ?? 'legacy') === seat);
    clippedLayer(ctx, seat, width, height, () => paintArtwork(ctx, owned));
  });
  return layers;
}

/** Incrementally paint a newly appended stroke. Edits, resets, and any
 * reordering still trigger a complete rebuild so no stale pixels remain. */
export function advanceLayers(
  layers: LayerSet, before: readonly Stroke[], after: readonly Stroke[], width: number, height: number,
): LayerSet {
  if (after.length !== before.length + 1 ||
      !before.every((stroke, i) => stroke === after[i])) return buildLayers(after, width, height);
  const stroke = after[after.length - 1];
  const seat = stroke.owner ?? 'legacy';
  const ctx = layers[seat].getContext('2d');
  if (ctx) clippedLayer(ctx, seat, width, height, () => paintStroke(ctx, stroke));
  return layers;
}

export function compositeLayers(ctx: CanvasRenderingContext2D, layers: LayerSet,
  extras: readonly Stroke[] = []) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(layers.legacy, 0, 0);
  for (const seat of ['host', 'guest'] as const) {
    const draftStrokes = extras.filter((stroke) => stroke.owner === seat);
    if (!draftStrokes.length) {
      ctx.drawImage(layers[seat], 0, 0);
      continue;
    }
    if (!draftStrokes.some((stroke) => stroke.tool === 'eraser')) {
      // Ordinary strokes can be previewed without copying a full-size canvas.
      ctx.drawImage(layers[seat], 0, 0);
      clippedLayer(ctx, seat, ctx.canvas.width, ctx.canvas.height, () => {
        draftStrokes.forEach((stroke) => paintStroke(ctx, stroke));
      });
      continue;
    }
    // Erasing must operate on the owner's transparent pigment before the two
    // halves are combined. It cannot punch through the other owner's ink.
    const preview = createLayer(ctx.canvas.width, ctx.canvas.height);
    const previewCtx = preview.getContext('2d');
    if (!previewCtx) continue;
    previewCtx.drawImage(layers[seat], 0, 0);
    clippedLayer(previewCtx, seat, preview.width, preview.height, () => {
      draftStrokes.forEach((stroke) => paintStroke(previewCtx, stroke));
    });
    ctx.drawImage(preview, 0, 0);
  }
  ctx.restore();
}

export function renderArtwork(ctx: CanvasRenderingContext2D, strokes: readonly Stroke[]) {
  compositeLayers(ctx, buildLayers(strokes, ctx.canvas.width, ctx.canvas.height));
}
