import type { Stroke } from './types';

function clamp01(value: number) { return Math.min(1, Math.max(0, value)); }

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)) as [number, number, number];
}

export function setHexChannel(hex: string, channel: number, value: number): string {
  const rgb = channels(hex);
  rgb[channel] = Math.round(Math.max(0, Math.min(255, value)));
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');
}

export function getHexChannels(hex: string): [number, number, number] { return channels(hex); }

export function mixHex(first: string, second: string, amount: number): string {
  const from = channels(first);
  const to = channels(second);
  const fraction = clamp01(amount);
  return `#${from.map((channel, index) =>
    Math.round(channel + (to[index] - channel) * fraction).toString(16).padStart(2, '0')).join('')}`;
}

function gradientAxis(stroke: Stroke) {
  const points = stroke.points;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs), right = Math.max(...xs);
  const top = Math.min(...ys), bottom = Math.max(...ys);
  const distance = Math.max(right - left, bottom - top, stroke.size * 3, 1);
  const angle = (stroke.gradient?.angle ?? 0) * Math.PI / 180;
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance;
  const midX = (left + right) / 2, midY = (top + bottom) / 2;
  return { x1: midX - dx / 2, y1: midY - dy / 2, x2: midX + dx / 2, y2: midY + dy / 2 };
}

// Cache the gradient geometry once per painted stroke; airbrush can stamp
// hundreds of samples and must not re-scan every point per stamp.
export function gradientSampler(stroke: Stroke): (x: number, y: number) => string {
  if (!stroke.gradient) return () => stroke.color;
  const { x1, y1, x2, y2 } = gradientAxis(stroke);
  const dx = x2 - x1, dy = y2 - y1;
  const denominator = dx * dx + dy * dy;
  const from = channels(stroke.color), to = channels(stroke.gradient.to);
  return (x, y) => {
    const fraction = clamp01(((x - x1) * dx + (y - y1) * dy) / denominator);
    return '#' + from.map((channel, index) =>
      Math.round(channel + (to[index] - channel) * fraction).toString(16).padStart(2, '0')).join('');
  };
}


export function strokePaint(ctx: CanvasRenderingContext2D, stroke: Stroke): string | CanvasGradient {
  if (!stroke.gradient) return stroke.color;
  const { x1, y1, x2, y2 } = gradientAxis(stroke);
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, stroke.color);
  gradient.addColorStop(1, stroke.gradient.to);
  return gradient;
}

// Sampling reflects the color visible against Draw Date's warm paper,
// including translucent brushes, rather than returning transparent black.
export function colorOverPaper(rgba: ArrayLike<number>): string {
  const alpha = rgba[3] / 255;
  const paper = [255, 253, 250];
  return '#' + paper.map((channel, index) =>
    Math.round(rgba[index] * alpha + channel * (1 - alpha))
      .toString(16).padStart(2, '0')).join('');
}
