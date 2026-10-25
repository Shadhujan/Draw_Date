import type { Stroke, TemplateId } from './types';

export type LessonStep = { title: string; hint: string };

export const lessonSteps: Record<TemplateId, LessonStep[]> = {
  heart: [
    { title: 'A big heart', hint: 'Follow the outside edge from the top, all the way around.' },
    { title: 'The little cheeks', hint: 'Give both sides a soft, happy curve.' },
    { title: 'The tiny heart', hint: 'Trace the little heart in the middle.' },
    { title: 'A happy smile', hint: 'Add a gentle smile under the little heart.' },
    { title: 'Finishing sparkles', hint: 'A few sparkles make it feel extra special.' },
  ],
  flowers: [
    { title: 'Plant the stems', hint: 'Start with two long, slightly wiggly stems.' },
    { title: 'Grow the leaves', hint: 'Follow the leaf outlines on both sides.' },
    { title: 'Draw the petals', hint: 'Trace the round flower and the pointed petals.' },
    { title: 'Little details', hint: 'Add the center of the flower.' },
    { title: 'The garden line', hint: 'Finish with a soft, curving ground line.' },
  ],
  bunny: [
    { title: 'Floppy ears', hint: 'Trace two tall, playful bunny ears.' },
    { title: 'Round little face', hint: 'Follow the soft oval around the cheeks.' },
    { title: 'Sleepy eyes', hint: 'Add the eyes, nose and smile.' },
    { title: 'Whiskers & blush', hint: 'Give your bunny its whiskers.' },
    { title: 'A cozy hug', hint: 'Draw the body and a few floating hearts.' },
  ],
  blank: [],
};

export function lessonCount(template: TemplateId): number {
  return lessonSteps[template].length;
}

export function validLessonStep(template: TemplateId, step: unknown): step is number {
  return Number.isInteger(step) && Number(step) >= 0 &&
    Number(step) < Math.max(1, lessonCount(template));
}

// A guide-progress hint, NOT an accuracy grade. Small nearby segments count as
// traced. This runs locally and never transfers pen telemetry to a service.
export function traceCoverage(svg: SVGSVGElement | null, step: number, strokes: readonly Stroke[]): number {
  if (!svg) return 0;
  const shapes = Array.from(svg.querySelectorAll<SVGGeometryElement>(`[data-guide-step="${step}"] path, [data-guide-step="${step}"] circle`));
  if (!shapes.length) return 0;
  const cell = 24;
  const grid = new Map<number, { x: number; y: number }[]>();
  const index = (x: number, y: number) => Math.floor(y / cell) * 128 + Math.floor(x / cell);
  for (const stroke of strokes) {
    if (stroke.tool !== 'pen' || stroke.hidden) continue;
    for (let i = 0; i < stroke.points.length; i++) {
      const a = stroke.points[i];
      const b = stroke.points[Math.min(i + 1, stroke.points.length - 1)];
      const parts = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / 12));
      for (let j = 0; j < parts; j++) {
        const t = j / parts;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        const key = index(x, y);
        const bucket = grid.get(key) ?? [];
        bucket.push({ x, y });
        grid.set(key, bucket);
      }
    }
  }
  let found = 0;
  let count = 0;
  for (const shape of shapes) {
    let length = 0;
    try { length = shape.getTotalLength(); } catch { continue; }
    if (!Number.isFinite(length) || length < 1) continue;
    const samples = Math.max(5, Math.min(150, Math.ceil(length / 18)));
    for (let i = 0; i < samples; i++) {
      const p = shape.getPointAtLength((length * i) / samples);
      count++;
      const cx = Math.floor(p.x / cell);
      const cy = Math.floor(p.y / cell);
      let matched = false;
      for (let yy = cy - 1; yy <= cy + 1 && !matched; yy++) {
        for (let xx = cx - 1; xx <= cx + 1 && !matched; xx++) {
          const bucket = grid.get(yy * 128 + xx) ?? [];
          matched = bucket.some((sample) => (sample.x - p.x) ** 2 + (sample.y - p.y) ** 2 < 19 ** 2);
        }
      }
      if (matched) found++;
    }
  }
  return count ? Math.round(found / count * 100) : 0;
}
