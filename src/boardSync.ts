import { sanitizeBoard, isStroke } from './board';
import type { BoardMessage, BoardState, Stroke } from './types';

// Supabase Free allows 256 KB Broadcast payloads. Keep snapshots well below
// that ceiling, even with JSON envelope/Unicode overhead. Larger boards are
// transmitted in independently validated, ordered parts instead of truncated.
const MAX_PACKET_BYTES = 96 * 1024;
const MAX_PARTS = 4096;
const STALE_MS = 40_000;
const encoder = new TextEncoder();

export type SnapshotPart = Extract<BoardMessage, { kind: 'state-part' }>;
export type IncomingSnapshot = {
  board: Omit<BoardState, 'strokes'>;
  parts: Map<number, Stroke[]>;
  count: number;
  startedAt: number;
  from: string;
  to: string;
  reply: 'state' | 'state-sync';
};

export function snapshotPackets(
  kind: 'state' | 'state-sync', from: string, to: string, board: BoardState,
): BoardMessage[] {
  const simple: BoardMessage = { kind, from, to, board };
  if (encoder.encode(JSON.stringify(simple)).length <= MAX_PACKET_BYTES) return [simple];

  const { strokes, ...metadata } = board;
  const chunks: Stroke[][] = [];
  let group: Stroke[] = [];
  let bytes = 0;
  for (const stroke of strokes) {
    const size = encoder.encode(JSON.stringify(stroke)).length + 2;
    if (group.length && bytes + size > MAX_PACKET_BYTES) {
      chunks.push(group);
      group = [];
      bytes = 0;
    }
    group.push(stroke);
    bytes += size;
  }
  if (group.length) chunks.push(group);
  if (!chunks.length || chunks.length > MAX_PARTS) throw new Error('Drawing too large to synchronize safely');

  const transferId = crypto.randomUUID();
  return chunks.map((part, index): BoardMessage => ({
    kind: 'state-part', from, to, transferId, reply: kind,
    index, count: chunks.length, board: metadata, strokes: part,
  }));
}

/** Assemble only complete, structurally valid snapshots; never apply partial art. */
export function receiveSnapshotPart(
  pending: Map<string, IncomingSnapshot>, message: SnapshotPart, recipient: string,
): { board: BoardState; from: string; reply: 'state' | 'state-sync' } | null {
  const now = Date.now();
  for (const [key, item] of pending) if (now - item.startedAt > STALE_MS) pending.delete(key);
  if (message.to !== recipient || typeof message.from !== 'string' ||
      typeof message.transferId !== 'string' || message.transferId.length < 8 ||
      message.transferId.length > 128 ||
      (message.reply !== 'state' && message.reply !== 'state-sync') ||
      !Number.isInteger(message.index) || !Number.isInteger(message.count) ||
      message.count < 1 || message.count > MAX_PARTS ||
      message.index < 0 || message.index >= message.count ||
      !Array.isArray(message.strokes) || !message.strokes.length ||
      !message.strokes.every(isStroke) ||
      !message.board || typeof message.board !== 'object') return null;

  const key = `${message.from}:${message.transferId}`;
  let entry = pending.get(key);
  if (!entry) {
    entry = { board: message.board, parts: new Map(), count: message.count,
      startedAt: now, from: message.from, to: message.to, reply: message.reply };
    pending.set(key, entry);
  }
  // Discard inconsistent/mutated multipart envelopes instead of mixing rooms.
  if (entry.count !== message.count || entry.reply !== message.reply ||
      JSON.stringify(entry.board) !== JSON.stringify(message.board)) {
    pending.delete(key);
    return null;
  }
  entry.parts.set(message.index, message.strokes);
  if (entry.parts.size !== entry.count) return null;
  pending.delete(key);
  const strokes: Stroke[] = [];
  for (let i = 0; i < entry.count; i++) {
    const part = entry.parts.get(i);
    if (!part) return null;
    strokes.push(...part);
  }
  const board = sanitizeBoard({ ...entry.board, strokes });
  return board ? { board, from: entry.from, reply: entry.reply } : null;
}
