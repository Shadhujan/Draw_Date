import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import type { Point, Stroke, Tool } from './types';

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
  color: string;
  size: number;
  disabled?: boolean;
  onStart: (stroke: Stroke) => void;
  onPoints: (id: string, points: Point[]) => void;
  onEnd: (stroke: Stroke) => void;
  onCursor: (x: number, y: number) => void;
};

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const pts = stroke.points;
  if (!pts.length) return;
  ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const previous = pts[i - 1];
      const current = pts[i];
      ctx.quadraticCurveTo(previous.x, previous.y, (previous.x + current.x) / 2, (previous.y + current.y) / 2);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

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
  strokesRef.current = props.strokes;
  drafts.current = props.remoteDrafts;

  const render = useCallback(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d');
    if (!element || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, element.width, element.height);
    ctx.setTransform(element.width / WORLD_W, 0, 0, element.height / WORLD_H, 0, 0);
    strokesRef.current.forEach((stroke) => drawStroke(ctx, stroke));
    drafts.current.forEach((stroke) => drawStroke(ctx, stroke));
    if (current.current) drawStroke(ctx, current.current);
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
      const dpr = Math.min(devicePixelRatio || 1, 3);
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

  useImperativeHandle(externalRef, () => ({
    async save(guide) {
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

  function point(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(WORLD_W, (event.clientX - rect.left) / rect.width * WORLD_W)),
      y: Math.max(0, Math.min(WORLD_H, (event.clientY - rect.top) / rect.height * WORLD_H)),
      p: event.pressure,
    };
  }

  function flushPending() {
    if (!current.current || !pending.current.length) return;
    const additions = pending.current.splice(0, pending.current.length);
    props.onPoints(current.current.id, additions);
    lastPacketAt.current = performance.now();
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (props.disabled || current.current || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const initial = point(event);
    const stroke: Stroke = {
      id: crypto.randomUUID(), by: props.myId, tool: props.tool,
      color: props.color, size: props.tool === 'eraser' ? props.size * 2.8 : props.size,
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
    const next = point(event);
    const now = performance.now();
    if (now - lastCursorAt.current >= CURSOR_MS) {
      props.onCursor(next.x, next.y);
      lastCursorAt.current = now;
    }
    if (pointerId.current !== event.pointerId || !current.current) return;
    if (current.current.points.length >= MAX_POINTS) { pointerUp(event); return; }
    const previous = current.current.points[current.current.points.length - 1];
    if (Math.hypot(next.x - previous.x, next.y - previous.y) < 1) return;
    current.current = { ...current.current, points: [...current.current.points, next] };
    pending.current.push(next);
    scheduleRender();
    if (now - lastPacketAt.current >= DRAW_MS) flushPending();
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
      onContextMenu={(event) => event.preventDefault()}
      style={{ cursor: props.disabled ? 'not-allowed' : props.tool === 'eraser' ? 'cell' : 'crosshair' }}
    />
  );
});
