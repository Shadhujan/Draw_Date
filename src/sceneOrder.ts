import type { Stroke } from './types';

/**
 * Keep historical (unsequenced) drawings in their stored order. New marks use
 * one timestamp + stable id tie-break, so peers converge even when messages
 * arrive in a different order. Editing a stroke does not move it in the stack.
 */
export function chronologicalStrokes(strokes: readonly Stroke[]): Stroke[] {
  return strokes.map((stroke, index) => ({ stroke, index })).sort((a, b) => {
    const left = a.stroke.createdAt;
    const right = b.stroke.createdAt;
    if (left === undefined || right === undefined) {
      if (left === undefined && right === undefined) return a.index - b.index;
      return left === undefined ? -1 : 1;
    }
    return left - right || a.stroke.id.localeCompare(b.stroke.id);
  }).map(({ stroke }) => stroke);
}

function latestVersion(local: Stroke | undefined, incoming: Stroke): Stroke {
  if (!local) return incoming;
  const old = local.lastEdit ?? 0;
  const next = incoming.lastEdit ?? 0;
  if (old > next || (old === next && (local.lastEditor ?? '') > (incoming.lastEditor ?? ''))) {
    return local;
  }
  // Keep creation order even if an older client sends an edit without it.
  return incoming.createdAt === undefined && local.createdAt !== undefined
    ? { ...incoming, createdAt: local.createdAt } : incoming;
}

/** Union by ID. Never silently evict older art during state reconciliation. */
export function mergeStrokes(local: readonly Stroke[], incoming: readonly Stroke[]): Stroke[] {
  const ours = new Map(local.map((stroke) => [stroke.id, stroke]));
  const known = new Set(incoming.map((stroke) => stroke.id));
  return chronologicalStrokes([
    ...incoming.map((stroke) => latestVersion(ours.get(stroke.id), stroke)),
    ...local.filter((stroke) => !known.has(stroke.id)),
  ]);
}
