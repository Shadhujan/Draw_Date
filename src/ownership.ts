import type { Point, Stroke } from './types';

// Internal only. The studio deliberately renders no visual dividing line.
export type Seat = 'host' | 'guest';
export const BOARD_WIDTH = 1000;
export const BOARD_HEIGHT = 700;
export const HALF = BOARD_WIDTH / 2;

export function otherSeat(seat: Seat): Seat {
  return seat === 'host' ? 'guest' : 'host';
}

export function seatBounds(seat: Seat) {
  return seat === 'host' ? { left: 0, right: HALF } : { left: HALF, right: BOARD_WIDTH };
}

export function inSeat(point: Pick<Point, 'x' | 'y'>, seat: Seat): boolean {
  const { left, right } = seatBounds(seat);
  return point.x >= left && point.x <= right && point.y >= 0 && point.y <= BOARD_HEIGHT;
}

export function pointsInSeat(points: readonly Point[], seat: Seat): boolean {
  return points.length > 0 && points.every((point) => inSeat(point, seat));
}

export function isSeat(value: unknown): value is Seat {
  return value === 'host' || value === 'guest';
}

// Pre-ownership sketches remain visible but cannot be modified. That preserves
// old drawings without guessing which anonymous browser originally made them.
export function canEditStroke(stroke: Stroke, seat: Seat | null): boolean {
  return seat !== null && stroke.owner === seat && !stroke.hidden;
}

// Sutherland-Hodgman clips a filled vector region at the invisible middle seam.
// Only the ownership-allowed half of a newly painted shape is stored.
export function clipFillPolygon(points: readonly Point[], seat: Seat): Point[] {
  const { left, right } = seatBounds(seat);
  let clipped = [...points];
  for (const [cutoff, keepGreater] of [[left, true], [right, false]] as const) {
    const output: Point[] = [];
    for (let i = 0; i < clipped.length; i++) {
      const a = clipped[i];
      const b = clipped[(i + 1) % clipped.length];
      const aInside = keepGreater ? a.x >= cutoff : a.x <= cutoff;
      const bInside = keepGreater ? b.x >= cutoff : b.x <= cutoff;
      const intersection = () => {
        const t = (cutoff - a.x) / (b.x - a.x);
        return { x: cutoff, y: a.y + (b.y - a.y) * t };
      };
      if (aInside && bInside) output.push(b);
      else if (aInside && !bInside) output.push(intersection());
      else if (!aInside && bInside) output.push(intersection(), b);
    }
    clipped = output;
    if (!clipped.length) return [];
  }
  const clean: Point[] = [];
  for (const point of clipped) {
    const last = clean[clean.length - 1];
    if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 0.01) clean.push(point);
  }
  if (clean.length > 1 && Math.hypot(clean[0].x - clean[clean.length - 1].x,
    clean[0].y - clean[clean.length - 1].y) < 0.01) clean.pop();
  return clean.length >= 3 ? clean : [];
}

export function ownedFill(stroke: Stroke, seat: Seat): Stroke | null {
  if (stroke.tool !== 'fill') return null;
  const polygon = clipFillPolygon(stroke.points, seat);
  if (polygon.length < 3) return null;
  const holes = stroke.holes?.map((ring) => clipFillPolygon(ring, seat))
    .filter((ring) => ring.length >= 3);
  return { ...stroke, owner: seat, points: polygon, ...(holes?.length ? { holes } : { holes: undefined }) };
}
