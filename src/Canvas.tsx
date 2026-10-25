import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { paintStroke } from './brushes';
import type { BrushStyle, Point, Stroke, Tool } from './types';

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
  tool: Tool;
  brush: BrushStyle;
  opacity: number;
  color: string;
  size: number;
  disabled?: boolean;
  onStart: (stroke: Stroke) => void;
  onPoints: (id: string, points: Point[]) => void;
  onEnd: (stroke: Stroke) => void;
  onCursor: (x: number, y: number) => void;
};

export const DrawingCanvas = forwardRef<CanvasHandle, Props>(function DrawingCanvas(props, externalRef) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef(props.strokes);
  const drafts = useRef<Map<string, Stroke>>(props.remoteDrafts);
  const current = useRef<Stroke | null>(null);
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
        strokesRef.current.forEach((stroke) => paintStroke(background, stroke));
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
        (canAppend ? next.slice(old.strokes.length) : next).forEach((stroke) => paintStroke(background, stroke));
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
  }, []);

  const scheduleRender = useCallback(() => {
    if (renderRequest.current) return;
    renderRequest.current = requestAnimationFrame(() => {
      renderRequest.current = 0;
      render();
    });
  }, [render]);

  useEffect(() => { scheduleRender(); }, [props.strokes, props.draftVersion, scheduleRender]);

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
      const source = canvas.current;
      if (!source) return;
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
      ctx.drawImage(source, 0, 0, 1600, 1120);
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
    if (props.disabled || current.current || !event.isPrimary ||
        (event.pointerType === 'mouse' && event.button !== 0)) return;
    const initial = point(event, event.currentTarget.getBoundingClientRect());
    const stroke: Stroke = {
      id: crypto.randomUUID(), by: props.myId, tool: props.tool,
      color: props.color, size: props.tool === 'eraser' ? Math.min(80, props.size * 2.3) : props.size,
      brush: props.brush, opacity: props.tool === 'eraser' ? 1 : props.opacity,
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
    if (pointerId.current !== event.pointerId || !current.current) return;

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
    if (pointerId.current !== event.pointerId || !current.current) return;
    flushPending();
    props.onEnd(current.current);
    current.current = null;
    pointerId.current = null;
    scheduleRender();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <canvas
      ref={canvas}
      className="drawing-canvas"
      aria-label="Draw with your pointer, touch or pen"
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onContextMenu={(event: React.MouseEvent<HTMLCanvasElement>) => event.preventDefault()}
      style={{ cursor: props.disabled ? 'not-allowed' : props.tool === 'eraser' ? 'cell' : 'crosshair' }}
    />
  );
});
