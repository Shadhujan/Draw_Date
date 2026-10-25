import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { paintStroke } from './brushes';
import { advanceLayers, buildLayers, compositeLayers, type LayerSet } from './layers';
import { inSeat, seatBounds } from './ownership';
import { colorOverPaper } from './colorPaint';
import { limitTranslation, selectionBounds, strokesInsideLasso } from './selection';
import { lassoPaintPolygon } from './lassoPaint';
import { chronologicalStrokes } from './sceneOrder';
import type { BlendMode, BrushStyle, CanvasMode, Point, Seat, Stroke } from './types';

const WORLD_W = 1000;
const WORLD_H = 700;
const MAX_POINTS = 2000;
const CURSOR_MS = 220;
const DRAW_MS = 85;

export type CanvasHandle = {
  save: (guide: SVGSVGElement | null) => void;
};

type Props = {
  strokes: Stroke[];
  remoteDrafts: Map<string, Stroke>;
  draftVersion: number;
  myId: string;
  seat: Seat | null;
  remoteLassos: { from: string; seat: Seat; mode: 'paint' | 'outline' | 'drag'; points: Point[]; color: string; ids?: string[]; dx?: number; dy?: number }[];
  onLassoPreview: (mode: 'paint' | 'outline' | 'drag', points: Point[] | null, color: string, ids?: string[], dx?: number, dy?: number) => void;
  mode: CanvasMode;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onMoveSelection: (ids: string[], dx: number, dy: number) => void;
  onDeleteSelection: () => void;
  brush: BrushStyle;
  opacity: number;
  color: string;
  gradientTo: string | null;
  gradientAngle: number;
  blend: BlendMode;
  onPickColor: (hex: string) => void;
  onFill: (point: Point) => void;
  onLassoPaint: (outline: Point[]) => void;
  size: number;
  disabled?: boolean;
  onStart: (stroke: Stroke) => Stroke | void;
  onPoints: (id: string, points: Point[]) => void;
  onEnd: (stroke: Stroke) => void;
  onCursor: (x: number, y: number) => void;
};

type LassoGesture =
  | { kind: 'outline'; points: Point[] }
  | { kind: 'paint'; points: Point[] }
  | { kind: 'drag'; ids: string[]; start: Point; dx: number; dy: number };

function drawSelection(ctx: CanvasRenderingContext2D, strokes: Stroke[], ids: string[], gesture: LassoGesture | null) {
  const outline = gesture?.kind === 'outline' ? gesture.points : null;
  const bounds = selectionBounds(strokes, ids);
  ctx.save();
  ctx.strokeStyle = '#b97c91';
  ctx.lineWidth = 2.3;
  ctx.lineJoin = 'round';
  ctx.setLineDash([8, 6]);
  if (outline && outline.length > 1) {
    ctx.beginPath();
    ctx.moveTo(outline[0].x, outline[0].y);
    for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i].x, outline[i].y);
    ctx.closePath();
    ctx.fillStyle = '#e69eb11b';
    ctx.fill();
    ctx.stroke();
  } else if (bounds) {
    const dx = gesture?.kind === 'drag' ? gesture.dx : 0;
    const dy = gesture?.kind === 'drag' ? gesture.dy : 0;
    const x = Math.max(0, bounds.left + dx);
    const y = Math.max(0, bounds.top + dy);
    const w = Math.min(WORLD_W, bounds.right + dx) - x;
    const h = Math.min(WORLD_H, bounds.bottom + dy) - y;
    ctx.fillStyle = '#f4aac610';
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    for (const [px, py] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#fffefd';
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawLiveLasso(ctx: CanvasRenderingContext2D, points: readonly Point[],
  seat: Seat, color: string, mode: 'paint' | 'outline') {
  if (points.length < 2) return;
  const bounds = seatBounds(seat);
  ctx.save();
  ctx.beginPath();
  ctx.rect(bounds.left, 0, bounds.right - bounds.left, 700);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.strokeStyle = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#bb7e96';
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.setLineDash([7, 5]);
  if (mode === 'paint' && points.length > 2) {
    ctx.closePath();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 0.95;
  }
  ctx.stroke();
  ctx.restore();
}

/** Rasterize a guide with its *computed* styling: classes in the app CSS
 * are not available inside a serialized standalone SVG image. */
async function drawGuideForExport(
  ctx: CanvasRenderingContext2D, guide: SVGSVGElement, width: number, height: number,
) {
  const clone = guide.cloneNode(true) as SVGSVGElement;
  function inlineComputed(source: Element, target: Element) {
    const computed = getComputedStyle(source);
    for (const property of [
      'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap',
      'stroke-linejoin', 'opacity', 'visibility', 'display',
    ]) {
      (target as SVGElement).style.setProperty(property, computed.getPropertyValue(property));
    }
    for (let i = 0; i < source.children.length; i++) {
      inlineComputed(source.children[i], target.children[i]);
    }
  }
  inlineComputed(guide, clone);
  // The CSS guide's overall opacity must only be applied once.
  const cssOpacity = Number.parseFloat(getComputedStyle(guide).opacity);
  const opacity = Number.isFinite(cssOpacity) ? Math.max(0, Math.min(1, cssOpacity)) : 1;
  clone.style.opacity = '1';
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], {
    type: 'image/svg+xml;charset=utf-8',
  }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(image, 0, 0, width, height);
    ctx.restore();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const DrawingCanvas = forwardRef<CanvasHandle, Props>(function DrawingCanvas(props, externalRef) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef(props.strokes);
  const drafts = useRef<Map<string, Stroke>>(props.remoteDrafts);
  const current = useRef<Stroke | null>(null);
  const selectionGesture = useRef<LassoGesture | null>(null);
  const pending = useRef<Point[]>([]);
  const lastPacketAt = useRef(0);
  const lastCursorAt = useRef(0);
  const pointerId = useRef<number | null>(null);
  const renderRequest = useRef(0);
  const latestRender = useRef<() => void>(() => {});
  const painted = useRef<{ layers: LayerSet; strokes: Stroke[]; width: number; height: number } | null>(null);
  // The pixel-exact pigment snapshot is shared by the live canvas and PNG export.
  const artworkSnapshot = useRef<HTMLCanvasElement | null>(null);
  const lastLassoAt = useRef(0);
  strokesRef.current = props.strokes;
  drafts.current = props.remoteDrafts;

  const render = useCallback(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d');
    if (!element || !ctx) return;
    const artwork = artworkSnapshot.current ?? document.createElement('canvas');
    if (artwork.width !== element.width || artwork.height !== element.height) {
      artwork.width = element.width;
      artwork.height = element.height;
    }
    artworkSnapshot.current = artwork;
    const artworkCtx = artwork.getContext('2d');
    if (!artworkCtx) return;
    const moving = selectionGesture.current?.kind === 'drag' ? selectionGesture.current : null;
    const painting = selectionGesture.current?.kind === 'paint' ? selectionGesture.current : null;
    const remoteMoves = props.remoteLassos.filter((preview) => preview.mode === 'drag' && preview.ids?.length);
    const previews: Stroke[] = [];
    drafts.current.forEach((stroke) => { if (stroke.owner) previews.push(stroke); });
    if (current.current) previews.push(current.current);
    if (painting && props.seat) {
      const path = lassoPaintPolygon(painting.points);
      if (path) previews.push({
        id: 'lasso-preview', by: props.myId, owner: props.seat, tool: 'fill',
        size: 1, color: props.color, opacity: Math.min(props.opacity, 0.42),
        points: path,
      });
    }
    // A partner can finish a newer mark while another brush is still moving.
    // In that case, preview the active brush at its *actual* creation depth;
    // otherwise it would jump behind the new mark at pointer-up.
    const newest = strokesRef.current[strokesRef.current.length - 1]?.createdAt ?? 0;
    const interleaved = previews.some((stroke) => stroke.createdAt !== undefined && stroke.createdAt < newest);
    if (!moving && !remoteMoves.length && interleaved) {
      compositeLayers(artworkCtx, buildLayers(
        chronologicalStrokes([...strokesRef.current, ...previews]), element.width, element.height,
      ));
    } else if (moving || remoteMoves.length) {
      // A transient selection move is rendered separately; the canonical board
      // is not mutated until pointer-up, and the artwork is still owner-clipped.
      const displaced = strokesRef.current.map((stroke) => {
        const preview = moving?.ids.includes(stroke.id) && stroke.owner === props.seat
          ? { dx: moving.dx, dy: moving.dy }
          : remoteMoves.find((item) => item.seat === stroke.owner && item.ids?.includes(stroke.id));
        if (!preview) return stroke;
        const dx = preview.dx ?? 0, dy = preview.dy ?? 0;
        return {
          ...stroke,
          points: stroke.points.map((point) => ({ ...point, x: point.x + dx, y: point.y + dy })),
          holes: stroke.holes?.map((ring) => ring.map((point) => ({
            ...point, x: point.x + dx, y: point.y + dy,
          }))),
        };
      });
      compositeLayers(artworkCtx, buildLayers(displaced, element.width, element.height), previews);
    } else {
      const cached = painted.current;
      if (!cached || cached.strokes !== strokesRef.current ||
          cached.width !== element.width || cached.height !== element.height) {
        const layers = cached && cached.width === element.width && cached.height === element.height
          ? advanceLayers(cached.layers, cached.strokes, strokesRef.current, element.width, element.height)
          : buildLayers(strokesRef.current, element.width, element.height);
        painted.current = {
          layers, strokes: strokesRef.current, width: element.width, height: element.height,
        };
      }
      if (painted.current) compositeLayers(artworkCtx, painted.current.layers, previews);
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, element.width, element.height);
    ctx.drawImage(artwork, 0, 0);
    ctx.setTransform(element.width / WORLD_W, 0, 0, element.height / WORLD_H, 0, 0);
    if (props.mode === 'lasso' && props.seat) {
      const editable = strokesRef.current.filter((stroke) => stroke.owner === props.seat);
      drawSelection(ctx, editable, props.selectedIds, selectionGesture.current);
    }
    if (painting && props.seat) drawLiveLasso(ctx, painting.points, props.seat, props.color, 'paint');
    for (const preview of props.remoteLassos) {
      if (preview.mode === 'drag') {
        const editable = strokesRef.current.filter((stroke) => stroke.owner === preview.seat);
        drawSelection(ctx, editable, preview.ids ?? [], {
          kind: 'drag', ids: preview.ids ?? [], start: { x: 0, y: 0 },
          dx: preview.dx ?? 0, dy: preview.dy ?? 0,
        });
      } else {
        drawLiveLasso(ctx, preview.points, preview.seat, preview.color, preview.mode);
      }
    }
    ctx.restore();
  }, [props.mode, props.selectedIds, props.myId, props.seat, props.color,
    props.opacity, props.remoteLassos]);

  // Keep the scheduler stable across React rerenders. Previously, every new
  // stroke changed the selection-array identity, recreated this callback, and
  // retriggered the ResizeObserver cleanup. That cleanup cancelled the queued
  // animation frame without clearing renderRequest, leaving the canvas blank
  // even while the stroke counter continued increasing.
  latestRender.current = render;
  const scheduleRender = useCallback(() => {
    if (renderRequest.current) return;
    renderRequest.current = requestAnimationFrame(() => {
      renderRequest.current = 0;
      latestRender.current();
    });
  }, []);

  useEffect(() => { scheduleRender(); }, [
    props.strokes, props.draftVersion, props.mode, props.selectedIds, props.remoteLassos,
    props.color, props.opacity, props.gradientTo, props.gradientAngle,
    props.blend, props.seat, scheduleRender,
  ]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const resize = () => {
      const rect = element.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2.5);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      // Writing canvas.width/height clears its pixels, even if unchanged.
      // Only resize when necessary, and rebuild the cached ink at that size.
      if (element.width === width && element.height === height) return;
      element.width = width;
      element.height = height;
      painted.current = null;
      artworkSnapshot.current = null;
      scheduleRender();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    return () => observer.disconnect();
  }, [scheduleRender]);

  useEffect(() => () => {
    if (renderRequest.current) {
      cancelAnimationFrame(renderRequest.current);
      renderRequest.current = 0;
    }
  }, []);

  useImperativeHandle(externalRef, () => ({
    async save(guide: SVGSVGElement | null) {
      // Render the same pigment snapshot used by the live canvas. This includes
      // in-progress local and remote strokes, unlike the old export that only
      // replayed committed events at a different resolution.
      latestRender.current();
      const artwork = artworkSnapshot.current;
      if (!artwork || !artwork.width || !artwork.height) return;
      // Freeze the exact live pigment pixels at the click. SVG decoding is
      // async; later strokes must not sneak into this downloaded snapshot.
      const frozen = document.createElement('canvas');
      frozen.width = artwork.width;
      frozen.height = artwork.height;
      const frozenCtx = frozen.getContext('2d');
      if (!frozenCtx) return;
      frozenCtx.drawImage(artwork, 0, 0);
      const out = document.createElement('canvas');
      out.width = artwork.width;
      out.height = artwork.height;
      const ctx = out.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#fffdfb';
      ctx.fillRect(0, 0, out.width, out.height);
      if (guide) {
        try { await drawGuideForExport(ctx, guide, out.width, out.height); }
        catch { /* The drawing must still download if the guide cannot rasterize. */ }
      }
      ctx.drawImage(frozen, 0, 0);
      const a = document.createElement('a');
      a.href = out.toDataURL('image/png');
      a.download = `our-doodle-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    },
  }), []);

  function point(event: PointerEvent | React.PointerEvent<HTMLCanvasElement>, rect: DOMRect): Point {
    const pressure = event.pressure > 0 ? event.pressure : 0.68;
    return {
      x: Math.max(0, Math.min(WORLD_W, (event.clientX - rect.left) / rect.width * WORLD_W)),
      y: Math.max(0, Math.min(WORLD_H, (event.clientY - rect.top) / rect.height * WORLD_H)),
      p: Math.min(1, Math.max(0, pressure)),
    };
  }

  function flushPending() {
    if (!current.current || !pending.current.length) return;
    while (pending.current.length) {
      props.onPoints(current.current.id, pending.current.splice(0, 50));
    }
    lastPacketAt.current = performance.now();
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (props.disabled || current.current || pointerId.current !== null || !event.isPrimary ||
        (event.pointerType === 'mouse' && event.button !== 0)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const initial = point(event, rect);
    if (!props.seat || !inSeat(initial, props.seat)) return;
    if (props.mode === 'picker') {
      const surface = event.currentTarget;
      const context = surface.getContext('2d');
      if (!context) return;
      const x = Math.max(0, Math.min(surface.width - 1, Math.floor((event.clientX - rect.left) / rect.width * surface.width)));
      const y = Math.max(0, Math.min(surface.height - 1, Math.floor((event.clientY - rect.top) / rect.height * surface.height)));
      try { props.onPickColor(colorOverPaper(context.getImageData(x, y, 1, 1).data)); }
      catch { /* Sampling can be unavailable if the browser blocks pixel access. */ }
      return;
    }
    if (props.mode === 'fill') {
      props.onFill(initial);
      return;
    }
    if (props.mode === 'lasso-paint') {
      selectionGesture.current = { kind: 'paint', points: [initial] };
      props.onLassoPreview('paint', [initial], props.color);
      pointerId.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      scheduleRender();
      return;
    }
    if (props.mode === 'lasso') {
      const region = selectionBounds(strokesRef.current, props.selectedIds);
      if (region && initial.x >= region.left - 7 && initial.x <= region.right + 7 &&
          initial.y >= region.top - 7 && initial.y <= region.bottom + 7) {
        selectionGesture.current = { kind: 'drag', ids: props.selectedIds, start: initial, dx: 0, dy: 0 };
        props.onLassoPreview('drag', [initial], props.color, props.selectedIds, 0, 0);
      } else {
        selectionGesture.current = { kind: 'outline', points: [initial] };
        props.onLassoPreview('outline', [initial], props.color);
        props.onSelectionChange([]);
      }
      pointerId.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      scheduleRender();
      return;
    }
    if (props.mode !== 'pen' && props.mode !== 'eraser') return;
    const stroke: Stroke = {
      id: crypto.randomUUID(), by: props.myId, owner: props.seat, tool: props.mode,
      createdAt: Date.now(),
      color: props.color, size: props.mode === 'eraser' ? Math.min(80, props.size * 2.3) : props.size,
      brush: props.brush, opacity: props.mode === 'eraser' ? 1 : props.opacity,
      ...(props.mode === 'pen' && props.gradientTo ? { gradient: { to: props.gradientTo, angle: props.gradientAngle } } : {}),
      ...(props.mode === 'pen' && props.blend !== 'normal' ? { blend: props.blend } : {}),
      points: [initial],
    };
    current.current = stroke;
    pointerId.current = event.pointerId;
    pending.current = [];
    event.currentTarget.setPointerCapture(event.pointerId);
    const stamped = props.onStart(stroke);
    if (stamped) current.current = stamped;
    scheduleRender();
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const next = point(event, rect);
    if (!props.seat || !inSeat(next, props.seat)) return;
    const now = performance.now();
    if (now - lastCursorAt.current >= CURSOR_MS) {
      props.onCursor(next.x, next.y);
      lastCursorAt.current = now;
    }
    if (pointerId.current !== event.pointerId) return;
    const gesture = selectionGesture.current;
    if (gesture?.kind === 'outline' || gesture?.kind === 'paint') {
      const last = gesture.points[gesture.points.length - 1];
      if (Math.hypot(next.x - last.x, next.y - last.y) >= 3) {
        // Keep the polygon compact for smooth selection on older phones.
        if (gesture.points.length >= 220) gesture.points = gesture.points.filter((_, i) => i % 2 === 0);
        gesture.points.push(next);
        if (now - lastLassoAt.current > 65) {
          props.onLassoPreview(gesture.kind === 'paint' ? 'paint' : 'outline', [...gesture.points], props.color);
          lastLassoAt.current = now;
        }
        scheduleRender();
      }
      return;
    }
    if (gesture?.kind === 'drag') {
      const requested = limitTranslation(strokesRef.current, gesture.ids,
        next.x - gesture.start.x, next.y - gesture.start.y, props.seat);
      gesture.dx = requested.dx;
      gesture.dy = requested.dy;
      if (now - lastLassoAt.current > 65) {
        props.onLassoPreview('drag', [next], props.color, gesture.ids, gesture.dx, gesture.dy);
        lastLassoAt.current = now;
      }
      scheduleRender();
      return;
    }
    if (!current.current) return;

    // Coalesced pen samples improve curves without creating extra strokes.
    // Broadcast is still throttled and chunked at the original 50-point limit.
    const native = event.nativeEvent;
    const samples = typeof native.getCoalescedEvents === 'function'
      ? native.getCoalescedEvents() : [];
    const incoming = samples.length ? [...samples, native] : [native];
    const additions: Point[] = [];
    for (const sample of incoming) {
      if (!current.current || current.current.points.length + additions.length >= MAX_POINTS) break;
      const nextPoint = point(sample, rect);
      const previous = additions[additions.length - 1] ??
        current.current.points[current.current.points.length - 1];
      if (Math.hypot(nextPoint.x - previous.x, nextPoint.y - previous.y) < 0.65) continue;
      additions.push(nextPoint);
    }
    if (additions.length && current.current) {
      // Do not mutate the object sent with stroke-start. The network may still
      // be serializing that message while coalesced samples arrive.
      current.current = { ...current.current, points: [...current.current.points, ...additions] };
      pending.current.push(...additions);
      scheduleRender();
    }
    if (now - lastPacketAt.current >= DRAW_MS || pending.current.length >= 45) flushPending();
    if (current.current?.points.length === MAX_POINTS) pointerUp(event);
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (pointerId.current !== event.pointerId) return;
    if (selectionGesture.current) {
      const gesture = selectionGesture.current;
      selectionGesture.current = null;
      pointerId.current = null;
      if (gesture.kind === 'outline') {
        props.onSelectionChange(strokesInsideLasso(strokesRef.current, gesture.points, props.seat!));
        props.onLassoPreview('outline', null, props.color);
      } else if (gesture.kind === 'paint') {
        props.onLassoPaint(gesture.points);
        props.onLassoPreview('paint', null, props.color);
      } else if (gesture.kind === 'drag') {
        if (Math.hypot(gesture.dx, gesture.dy) > 0.6)
          props.onMoveSelection(gesture.ids, gesture.dx, gesture.dy);
        props.onLassoPreview('drag', null, props.color);
      }
      scheduleRender();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }
    if (!current.current) return;
    flushPending();
    props.onEnd(current.current);
    current.current = null;
    pointerId.current = null;
    scheduleRender();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function pointerCancel(event: React.PointerEvent<HTMLCanvasElement>) {
    if (pointerId.current !== event.pointerId) return;
    if (selectionGesture.current) {
      selectionGesture.current = null;
      pointerId.current = null;
      props.onLassoPreview('outline', null, props.color);
      scheduleRender();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    } else {
      pointerUp(event);
    }
  }

  return (
    <canvas
      ref={canvas}
      className="drawing-canvas"
      aria-label={props.mode === 'lasso-paint' ? 'Trace a freehand outline to paint a filled shape' :
        props.mode === 'lasso' ? 'Draw a loop to select strokes, then drag to move them' :
        props.mode === 'picker' ? 'Tap a painted area to sample its color' :
        props.mode === 'fill' ? 'Tap inside a closed shape to fill it with color' : 'Draw with your pointer, touch or pen'}
      tabIndex={props.mode === 'lasso' ? 0 : -1}
      onKeyDown={(event) => {
        if (props.mode !== 'lasso') return;
        if (event.key === 'Escape') { event.preventDefault(); props.onSelectionChange([]); }
        if ((event.key === 'Backspace' || event.key === 'Delete') && props.selectedIds.length) {
          event.preventDefault(); props.onDeleteSelection();
        }
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerCancel}
      onContextMenu={(event: React.MouseEvent<HTMLCanvasElement>) => event.preventDefault()}
      style={{ cursor: props.disabled ? 'not-allowed' : props.mode === 'eraser' ? 'cell' : props.mode === 'fill' ? 'copy' : props.mode === 'lasso' && props.selectedIds.length ? 'move' : 'crosshair' }}
    />
  );
});
