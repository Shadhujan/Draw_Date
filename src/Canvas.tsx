import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { paintStroke } from './brushes';
import { colorOverPaper } from './colorPaint';
import { limitTranslation, selectionBounds, strokesInsideLasso } from './selection';
import type { BlendMode, BrushStyle, CanvasMode, Point, Stroke } from './types';

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
  size: number;
  disabled?: boolean;
  onStart: (stroke: Stroke) => void;
  onPoints: (id: string, points: Point[]) => void;
  onEnd: (stroke: Stroke) => void;
  onCursor: (x: number, y: number) => void;
};

type LassoGesture =
  | { kind: 'outline'; points: Point[] }
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
  const painted = useRef<{ canvas: HTMLCanvasElement; strokes: Stroke[] } | null>(null);
  strokesRef.current = props.strokes;
  drafts.current = props.remoteDrafts;

  const render = useCallback(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d');
    if (!element || !ctx) return;

    // During a lasso move, preview translated vector strokes without editing
    // the board. A committed edit will invalidate the finished-stroke cache.
    const moving = selectionGesture.current?.kind === 'drag' ? selectionGesture.current : null;
    if (moving) {
      const selected = new Set(moving.ids);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, element.width, element.height);
      ctx.setTransform(element.width / WORLD_W, 0, 0, element.height / WORLD_H, 0, 0);
      for (const stroke of strokesRef.current) {
        if (stroke.hidden) continue;
        if (!selected.has(stroke.id)) {
          paintStroke(ctx, stroke);
        } else {
          paintStroke(ctx, { ...stroke, points: stroke.points.map((point) => ({
            ...point, x: point.x + moving.dx, y: point.y + moving.dy,
          })) });
        }
      }
      drafts.current.forEach((stroke) => paintStroke(ctx, stroke));
      if (current.current) paintStroke(ctx, current.current);
      drawSelection(ctx, strokesRef.current, props.selectedIds, moving);
      return;
    }

    // Cache finished strokes. Only the current pen and your partner's drafts
    // need repainting on every pointer move, even with textured brushes.
    const old = painted.current;
    const sameSize = old?.canvas.width === element.width && old?.canvas.height === element.height;
    if (!old || !sameSize) {
      const layer = document.createElement('canvas');
      layer.width = element.width;
      layer.height = element.height;
      const background = layer.getContext('2d');
      if (background) {
        background.setTransform(element.width / WORLD_W, 0, 0, element.height / WORLD_H, 0, 0);
        strokesRef.current.forEach((stroke) => { if (!stroke.hidden) paintStroke(background, stroke); });
      }
      painted.current = { canvas: layer, strokes: strokesRef.current };
    } else if (old.strokes !== strokesRef.current) {
      const next = strokesRef.current;
      // Fast path for appending strokes: leave the already painted layers alone.
      // Undo, resetting or history reconciliation will rebuild the full layer.
      const canAppend = next.length >= old.strokes.length &&
        old.strokes.every((stroke, index) => next[index] === stroke);
      const background = old.canvas.getContext('2d');
      if (background) {
        if (!canAppend) {
          background.setTransform(1, 0, 0, 1, 0, 0);
          background.clearRect(0, 0, old.canvas.width, old.canvas.height);
        }
        background.setTransform(old.canvas.width / WORLD_W, 0, 0, old.canvas.height / WORLD_H, 0, 0);
        (canAppend ? next.slice(old.strokes.length) : next).forEach((stroke) => { if (!stroke.hidden) paintStroke(background, stroke); });
      }
      painted.current = { canvas: old.canvas, strokes: next };
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, element.width, element.height);
    if (!painted.current) return;
    ctx.drawImage(painted.current.canvas, 0, 0);
    ctx.setTransform(element.width / WORLD_W, 0, 0, element.height / WORLD_H, 0, 0);
    drafts.current.forEach((stroke) => paintStroke(ctx, stroke));
    if (current.current) paintStroke(ctx, current.current);
    if (props.mode === 'lasso') drawSelection(ctx, strokesRef.current, props.selectedIds, selectionGesture.current);
  }, [props.mode, props.selectedIds]);

  const scheduleRender = useCallback(() => {
    if (renderRequest.current) return;
    renderRequest.current = requestAnimationFrame(() => {
      renderRequest.current = 0;
      render();
    });
  }, [render]);

  useEffect(() => { scheduleRender(); }, [props.strokes, props.draftVersion, props.mode, props.selectedIds, scheduleRender]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const resize = () => {
      const rect = element.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2.5);
      element.width = Math.round(rect.width * dpr);
      element.height = Math.round(rect.height * dpr);
      scheduleRender();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    return () => {
      observer.disconnect();
      if (renderRequest.current) cancelAnimationFrame(renderRequest.current);
    };
  }, [scheduleRender]);

  useImperativeHandle<CanvasHandle>(externalRef, () => ({
    async save(guide: SVGSVGElement | null) {
      if (!canvas.current) return;
      const out = document.createElement('canvas');
      out.width = 1600;
      out.height = 1120;
      const ctx = out.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#fffdfa';
      ctx.fillRect(0, 0, 1600, 1120);
      if (guide) {
        try {
          const svg = new XMLSerializer().serializeToString(guide);
          const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
          const image = new Image();
          image.src = svgUrl;
          await image.decode();
          ctx.globalAlpha = 0.45;
          ctx.drawImage(image, 0, 0, 1600, 1120);
          ctx.globalAlpha = 1;
          URL.revokeObjectURL(svgUrl);
        } catch { /* Keep the ink even if exporting the guide fails. */ }
      }
      // Paint on a separate transparent layer: an eraser must not punch holes
      // through the exported paper or the optional tracing guide.
      const ink = document.createElement('canvas');
      ink.width = out.width;
      ink.height = out.height;
      const inkCtx = ink.getContext('2d');
      if (!inkCtx) return;
      inkCtx.setTransform(1.6, 0, 0, 1.6, 0, 0);
      strokesRef.current.forEach((stroke) => { if (!stroke.hidden) paintStroke(inkCtx, stroke); });
      ctx.drawImage(ink, 0, 0);
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
    if (props.mode === 'lasso') {
      const region = selectionBounds(strokesRef.current, props.selectedIds);
      if (region && initial.x >= region.left - 7 && initial.x <= region.right + 7 &&
          initial.y >= region.top - 7 && initial.y <= region.bottom + 7) {
        selectionGesture.current = { kind: 'drag', ids: props.selectedIds, start: initial, dx: 0, dy: 0 };
      } else {
        selectionGesture.current = { kind: 'outline', points: [initial] };
        props.onSelectionChange([]);
      }
      pointerId.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      scheduleRender();
      return;
    }
    if (props.mode !== 'pen' && props.mode !== 'eraser') return;
    const stroke: Stroke = {
      id: crypto.randomUUID(), by: props.myId, tool: props.mode,
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
    props.onStart(stroke);
    scheduleRender();
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const next = point(event, rect);
    const now = performance.now();
    if (now - lastCursorAt.current >= CURSOR_MS) {
      props.onCursor(next.x, next.y);
      lastCursorAt.current = now;
    }
    if (pointerId.current !== event.pointerId) return;
    const gesture = selectionGesture.current;
    if (gesture?.kind === 'outline') {
      const last = gesture.points[gesture.points.length - 1];
      if (Math.hypot(next.x - last.x, next.y - last.y) >= 3) {
        // Keep the polygon compact for smooth selection on older phones.
        if (gesture.points.length >= 220) gesture.points = gesture.points.filter((_, i) => i % 2 === 0);
        gesture.points.push(next);
        scheduleRender();
      }
      return;
    }
    if (gesture?.kind === 'drag') {
      const requested = limitTranslation(strokesRef.current, gesture.ids,
        next.x - gesture.start.x, next.y - gesture.start.y);
      gesture.dx = requested.dx;
      gesture.dy = requested.dy;
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
        props.onSelectionChange(strokesInsideLasso(strokesRef.current, gesture.points));
      } else if (Math.hypot(gesture.dx, gesture.dy) > 0.6) {
        props.onMoveSelection(gesture.ids, gesture.dx, gesture.dy);
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
      aria-label={props.mode === 'lasso' ? 'Draw a loop to select strokes, then drag to move them' :
        props.mode === 'picker' ? 'Tap a painted area to sample its color' : 'Draw with your pointer, touch or pen'}
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
      style={{ cursor: props.disabled ? 'not-allowed' : props.mode === 'eraser' ? 'cell' : props.mode === 'lasso' && props.selectedIds.length ? 'move' : 'crosshair' }}
    />
  );
});
