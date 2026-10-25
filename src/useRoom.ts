import { useCallback, useEffect, useRef, useState } from 'react';
import { appendStroke, isPoint, isStroke, isTemplate, loadBoard, sanitizeBoard, saveBoard } from './board';
import { joinChannel, realtimeConfigured } from './realtime';
import { canEditStroke, inSeat, isSeat, otherSeat, ownedFill, pointsInSeat } from './ownership';
import { validLessonStep } from './guidedLesson';
import { applySelectionEdit, isSelectionEdit, limitTranslation, MAX_SELECTION } from './selection';
import type { BoardMessage, BoardState, Cursor, Partner, Point, Seat, SelectionEdit, Stroke, TemplateId } from './types';

type Connection = 'solo' | 'connecting' | 'connected' | 'error' | 'full' | 'expired';
type Reaction = { id: string; value: string; name: string };
type EditIntent =
  | { action: 'move'; ids: string[]; dx: number; dy: number }
  | { action: 'visibility'; ids: string[]; visible: boolean }
  | { action: 'duplicate'; sources: string[]; copies: string[]; dx: number; dy: number };
type UndoRecord =
  | { action: 'stroke'; id: string }
  | { action: 'move'; ids: string[]; dx: number; dy: number }
  | { action: 'visibility'; ids: string[]; visible: boolean };

function latestStroke(local: Stroke | undefined, incoming: Stroke): Stroke {
  if (!local) return incoming;
  const localStamp = local.lastEdit ?? 0;
  const incomingStamp = incoming.lastEdit ?? 0;
  if (localStamp > incomingStamp ||
      (localStamp === incomingStamp && (local.lastEditor ?? '') > (incoming.lastEditor ?? ''))) return local;
  return incoming;
}


export function useRoom(roomId: string, displayName: string) {
  const myId = useRef(crypto.randomUUID()).current;
  const [board, setBoard] = useState<BoardState>(() => loadBoard(roomId));
  // A Supabase admission result, not the nickname or the order of Presence events,
  // permanently determines which invisible half this device may edit.
  const [seat, setSeat] = useState<Seat | null>(realtimeConfigured ? null : 'host');
  const seatRef = useRef<Seat | null>(seat);
  seatRef.current = seat;
  const boardRef = useRef(board);
  const [connection, setConnection] = useState<Connection>(realtimeConfigured ? 'connecting' : 'solo');
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const retryConnection = useCallback(() => {
    if (!realtimeConfigured) return;
    setConnection('connecting');
    setConnectionAttempt((attempt) => attempt + 1);
  }, []);
  const [members, setMembers] = useState<Partner[]>([]);
  const [cursors, setCursors] = useState<Cursor[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const remoteDrafts = useRef(new Map<string, Stroke>());
  const [draftVersion, setDraftVersion] = useState(0);
  const [remoteLassos, setRemoteLassos] = useState<
    { from: string; seat: Seat; mode: 'paint' | 'outline' | 'drag'; points: Point[]; color: string; ids?: string[]; dx?: number; dy?: number }[]>([]);
  const lassoTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const network = useRef<ReturnType<typeof joinChannel>>(null);
  const seenEdits = useRef(new Set<string>());
  const logicalStamp = useRef(Date.now());
  const history = useRef<UndoRecord[]>([]);
  const [undoDepth, setUndoDepth] = useState(0);

  const partner: Partner = {
    id: myId,
    name: displayName,
    accent: '#d16f95',
    joinedAt: useRef(Date.now()).current,
  };

  const updateBoard = useCallback((change: (current: BoardState) => BoardState) => {
    const next = change(boardRef.current);
    boardRef.current = next;
    setBoard(next);
    saveBoard(roomId, next);
  }, [roomId]);

  const send = useCallback((message: BoardMessage) => {
    network.current?.send(message);
  }, []);

  const remember = useCallback((action: UndoRecord) => {
    history.current = [...history.current.slice(-79), action];
    setUndoDepth(history.current.length);
  }, []);

  // A move/edit is a small, atomic message. We don't resend all the pixels or
  // 2,000 individual pointer coordinates every time a selected stroke moves.
  const publishEdit = useCallback((intent: EditIntent) => {
    if (!seatRef.current) return;
    const edit = { ...intent, owner: seatRef.current, revision: boardRef.current.revision,
      stamp: ++logicalStamp.current, opId: crypto.randomUUID() } as SelectionEdit;
    updateBoard((current) => ({ ...current,
      strokes: applySelectionEdit(current.strokes, edit, myId) }));
    send({ kind: 'selection-edit', from: myId, edit });
  }, [myId, send, updateBoard]);


  useEffect(() => {
    if (!realtimeConfigured) return;
    let active = true;
    const connection = joinChannel(roomId, partner, {
      onSeat(admittedSeat) {
        if (active) { seatRef.current = admittedSeat; setSeat(admittedSeat); }
      },
      onStatus(status) {
        if (active) setConnection(status);
      },
      onMembers(next) {
        if (!active) return;
        setMembers(next);
        // Backend admission enforces two distinct users; presence may contain
        // multiple tabs from the same user and must not reject them.
      },
      onMessage(message) {
        if (!active || !message || message.from === myId) return;
        switch (message.kind) {
          case 'state-request':
            network.current?.send({ kind: 'state', from: myId, to: message.from, board: boardRef.current });
            break;
          case 'state':
          case 'state-sync': {
            if (message.to !== myId) break;
            const incoming = sanitizeBoard(message.board);
            if (!incoming) break;
            if (incoming.revision > boardRef.current.revision) {
              history.current = [];
              setUndoDepth(0);
            }
            updateBoard((current) => {
              if (incoming.revision > current.revision) return incoming;
              if (incoming.revision < current.revision) return current;
              const ours = new Map(current.strokes.map((stroke) => [stroke.id, stroke]));
              const known = new Set(incoming.strokes.map((stroke) => stroke.id));
              const merged = incoming.strokes.map((stroke) => latestStroke(ours.get(stroke.id), stroke));
              const unshared = current.strokes.filter((stroke) => !known.has(stroke.id));
              const aStamp = incoming.lessonStamp ?? 0;
              const bStamp = current.lessonStamp ?? 0;
              const newer = aStamp > bStamp || (aStamp === bStamp &&
                (incoming.lessonActor ?? '') >= (current.lessonActor ?? '')) ? incoming : current;
              return {
                ...incoming, lessonStep: newer.lessonStep ?? 0,
                lessonStamp: newer.lessonStamp, lessonActor: newer.lessonActor,
                // Hidden status and transforms survive rejoin instead of being
                // resurrected by the previous union-only reconciliation.
                strokes: [...merged, ...unshared].slice(-300),
              };
            });
            // Respond once to a reconnecting peer with the merged snapshot,
            // so strokes made offline reach both devices after reconnection.
            // state-sync is an acknowledgement and is never echoed again.
            if (message.kind === 'state') {
              network.current?.send({ kind: 'state-sync', from: myId, to: message.from, board: boardRef.current });
            }
            break;
          }
          case 'stroke-start':
            if (!seatRef.current || !isStroke(message.stroke) ||
                message.stroke.owner !== otherSeat(seatRef.current) ||
                message.stroke.by !== message.from ||
                !pointsInSeat(message.stroke.points, message.stroke.owner) ||
                remoteDrafts.current.has(message.stroke.id)) break;
            remoteDrafts.current.set(message.stroke.id, message.stroke);
            setDraftVersion((current) => current + 1);
            break;
          case 'stroke-points': {
            if (!Array.isArray(message.points) || message.points.length > 50 ||
                !message.points.every(isPoint)) break;
            const stroke = remoteDrafts.current.get(message.id);
            if (!stroke || stroke.by !== message.from || !stroke.owner ||
                !pointsInSeat(message.points, stroke.owner)) break;
            remoteDrafts.current.set(message.id, {
              ...stroke,
              points: [...stroke.points, ...message.points].slice(0, 2000),
            });
            setDraftVersion((current) => current + 1);
            break;
          }
          case 'stroke-end': {
            const stroke = remoteDrafts.current.get(message.id);
            if (!stroke || stroke.by !== message.from) break;
            remoteDrafts.current.delete(message.id);
            updateBoard((current) => ({ ...current, strokes: appendStroke(current.strokes, stroke) }));
            setDraftVersion((current) => current + 1);
            break;
          }
          case 'undo':
            // Compatibility with the original MVP's undo events.
            updateBoard((current) => ({ ...current, strokes: current.strokes.filter((stroke) => stroke.id !== message.id) }));
            break;
          case 'selection-edit': {
            if (typeof message.from !== 'string' || message.from.length > 128 ||
                !isSelectionEdit(message.edit) || seenEdits.current.has(message.edit.opId) ||
                message.edit.revision !== boardRef.current.revision || !seatRef.current ||
                message.edit.owner !== otherSeat(seatRef.current)) break;
            seenEdits.current.add(message.edit.opId);
            if (seenEdits.current.size > 500) seenEdits.current.clear();
            logicalStamp.current = Math.max(logicalStamp.current, message.edit.stamp);
            updateBoard((current) => ({ ...current,
              strokes: applySelectionEdit(current.strokes, message.edit, message.from) }));
            break;
          }
          case 'lasso-gesture': {
            if (!seatRef.current || message.seat !== otherSeat(seatRef.current) ||
                (message.mode !== 'paint' && message.mode !== 'outline' && message.mode !== 'drag') ||
                typeof message.from !== 'string' || message.from.length > 128 ||
                typeof message.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(message.color) ||
                !Array.isArray(message.points) || message.points.length > 220 ||
                !message.points.every(isPoint) ||
                (message.done ? message.points.length !== 0 : !pointsInSeat(message.points, message.seat)) ||
                typeof message.done !== 'boolean' || (message.mode === 'drag' && !message.done && (
                  !Array.isArray(message.ids) || message.ids.length === 0 || message.ids.length > MAX_SELECTION ||
                  !message.ids.every((id) => typeof id === 'string' && id.length > 0 && id.length < 128) ||
                  !message.ids.every((id) => boardRef.current.strokes.some((stroke) => stroke.id === id && stroke.owner === message.seat)) ||
                  typeof message.dx !== 'number' || !Number.isFinite(message.dx) || Math.abs(message.dx) > 1000 ||
                  typeof message.dy !== 'number' || !Number.isFinite(message.dy) || Math.abs(message.dy) > 700
                ))) break;
            const previous = lassoTimers.current.get(message.from);
            if (previous) clearTimeout(previous);
            lassoTimers.current.delete(message.from);
            if (message.done) {
              setRemoteLassos((items) => items.filter((item) => item.from !== message.from));
            } else {
              const draft = { from: message.from, seat: message.seat, mode: message.mode,
                points: message.points, color: message.color, ids: message.ids,
                dx: message.dx, dy: message.dy };
              setRemoteLassos((items) => [...items.filter((item) => item.from !== message.from), draft]);
              // A disconnected partner must not leave a permanent ghost outline.
              lassoTimers.current.set(message.from, setTimeout(() => {
                setRemoteLassos((items) => items.filter((item) => item.from !== message.from));
                lassoTimers.current.delete(message.from);
              }, 2200));
            }
            break;
          }
          case 'lesson-step': {
            if (typeof message.from !== 'string' || message.from.length > 128 ||
                !Number.isSafeInteger(message.revision) ||
                message.revision !== boardRef.current.revision ||
                !validLessonStep(boardRef.current.template, message.step) ||
                !Number.isSafeInteger(message.stamp) || message.stamp < 1) break;
            logicalStamp.current = Math.max(logicalStamp.current, message.stamp);
            updateBoard((current) => {
              const previous = current.lessonStamp ?? 0;
              if (message.stamp < previous || (message.stamp === previous &&
                  message.from <= (current.lessonActor ?? ''))) return current;
              return { ...current, lessonStep: message.step, lessonStamp: message.stamp,
                lessonActor: message.from };
            });
            break;
          }
          case 'reset':
            if (!isTemplate(message.template) || !Number.isSafeInteger(message.revision) ||
                message.revision <= boardRef.current.revision) break;
            updateBoard(() => ({ template: message.template, strokes: [], revision: message.revision, lessonStep: 0 }));
            remoteDrafts.current.clear();
            setRemoteLassos([]);
            lassoTimers.current.forEach(clearTimeout);
            lassoTimers.current.clear();
            history.current = [];
            setUndoDepth(0);
            setDraftVersion((current) => current + 1);
            break;
          case 'cursor':
            if (typeof message.x !== 'number' || typeof message.y !== 'number' ||
                !Number.isFinite(message.x) || !Number.isFinite(message.y)) break;
            setCursors((all) => [...all.filter((cursor) => cursor.by !== message.from), {
              by: message.from,
              x: Math.max(0, Math.min(1000, message.x)),
              y: Math.max(0, Math.min(700, message.y)),
              name: message.name.slice(0, 24),
              color: '#8876d6',
            }]);
            break;
          case 'reaction':
            setReactions((all) => [...all.slice(-3), {
              id: crypto.randomUUID(),
              name: message.name.slice(0, 24),
              value: message.value === 'heart' ? '\u2665' : '\u2728',
            }]);
            break;
        }
      },
    });
    network.current = connection;
    return () => {
      active = false;
      if (network.current === connection) network.current = null;
      connection?.close();
      lassoTimers.current.forEach(clearTimeout);
      lassoTimers.current.clear();
    };
  // Intentional: this subscription is scoped to the room and participant identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, myId, updateBoard, connectionAttempt]);

  useEffect(() => {
    if (!reactions.length) return;
    const timer = window.setTimeout(() => setReactions((current) => current.slice(1)), 2400);
    return () => window.clearTimeout(timer);
  }, [reactions]);

  const addStroke = useCallback((stroke: Stroke) => {
    updateBoard((current) => ({ ...current, strokes: appendStroke(current.strokes, stroke) }));
  }, [updateBoard]);

  const begin = useCallback((stroke: Stroke) => {
    if (!seatRef.current || stroke.owner !== seatRef.current ||
        !pointsInSeat(stroke.points, seatRef.current)) return;
    send({ kind: 'stroke-start', from: myId, stroke });
  }, [send, myId]);

  const points = useCallback((id: string, additions: Point[]) => {
    if (additions.length) send({ kind: 'stroke-points', from: myId, id, points: additions });
  }, [send, myId]);

  const end = useCallback((stroke: Stroke) => {
    if (!seatRef.current || stroke.owner !== seatRef.current ||
        !pointsInSeat(stroke.points, seatRef.current)) return;
    addStroke(stroke);
    remember({ action: 'stroke', id: stroke.id });
    send({ kind: 'stroke-end', from: myId, id: stroke.id });
  }, [send, addStroke, myId, remember]);

  // A completed fill is a single vector event, not a flood of pixel messages.
  const addFill = useCallback((stroke: Stroke, revision: number): boolean => {
    const currentSeat = seatRef.current;
    if (!currentSeat || boardRef.current.revision !== revision || !isStroke(stroke) ||
        stroke.tool !== 'fill' || stroke.by !== myId) return false;
    const clipped = ownedFill(stroke, currentSeat);
    if (!clipped || !isStroke(clipped)) return false;
    stroke = clipped;
    addStroke(stroke);
    remember({ action: 'stroke', id: stroke.id });
    send({ kind: 'stroke-start', from: myId, stroke });
    send({ kind: 'stroke-end', from: myId, id: stroke.id });
    return true;
  }, [addStroke, remember, send, myId]);

  const setLessonStep = useCallback((step: number) => {
    const before = boardRef.current;
    if (!validLessonStep(before.template, step) || (before.lessonStep ?? 0) === step) return;
    const stamp = ++logicalStamp.current;
    updateBoard((current) => ({ ...current, lessonStep: step, lessonStamp: stamp, lessonActor: myId }));
    send({ kind: 'lesson-step', from: myId, revision: before.revision, step, stamp });
  }, [myId, send, updateBoard]);

  const undo = useCallback(() => {
    const last = history.current.pop();
    if (last) setUndoDepth(history.current.length);
    if (last?.action === 'move') {
      publishEdit({ action: 'move', ids: last.ids, dx: last.dx, dy: last.dy });
    } else if (last?.action === 'visibility') {
      publishEdit({ action: 'visibility', ids: last.ids, visible: last.visible });
    } else {
      const id = last?.action === 'stroke' ? last.id :
        [...boardRef.current.strokes].reverse().find((stroke) => canEditStroke(stroke, seatRef.current))?.id;
      if (id) publishEdit({ action: 'visibility', ids: [id], visible: false });
    }
  }, [myId, publishEdit]);

  const moveSelection = useCallback((ids: string[], dx: number, dy: number) => {
    const live = ids.filter((id) => boardRef.current.strokes.some((s) => s.id === id && canEditStroke(s, seatRef.current)));
    if (!live.length || live.length > MAX_SELECTION) return;
    if (!seatRef.current) return;
    const delta = limitTranslation(boardRef.current.strokes, live, dx, dy, seatRef.current);
    if (Math.hypot(delta.dx, delta.dy) <= 0.6) return;
    publishEdit({ action: 'move', ids: live, dx: delta.dx, dy: delta.dy });
    remember({ action: 'move', ids: live, dx: -delta.dx, dy: -delta.dy });
  }, [publishEdit, remember]);

  const deleteSelection = useCallback((ids: string[]) => {
    const live = ids.filter((id) => boardRef.current.strokes.some((s) => s.id === id && canEditStroke(s, seatRef.current)));
    if (!live.length || live.length > MAX_SELECTION) return;
    publishEdit({ action: 'visibility', ids: live, visible: false });
    remember({ action: 'visibility', ids: live, visible: true });
  }, [publishEdit, remember]);

  const duplicateSelection = useCallback((ids: string[]): string[] => {
    const live = ids.filter((id) => boardRef.current.strokes.some((s) => s.id === id && canEditStroke(s, seatRef.current)));
    if (!live.length || live.length > MAX_SELECTION) return [];
    const copies = live.map(() => crypto.randomUUID());
    if (!seatRef.current) return [];
    const delta = limitTranslation(boardRef.current.strokes, live, 24, 24, seatRef.current);
    publishEdit({ action: 'duplicate', sources: live, copies, dx: delta.dx, dy: delta.dy });
    remember({ action: 'visibility', ids: copies, visible: false });
    return copies;
  }, [publishEdit, remember]);

  const changeTemplate = useCallback((template: TemplateId) => {
    const revision = Math.max(boardRef.current.revision + 1, Date.now());
    updateBoard(() => ({ template, strokes: [], revision, lessonStep: 0 }));
    history.current = [];
    setUndoDepth(0);
    remoteDrafts.current.clear();
    setDraftVersion((current) => current + 1);
    send({ kind: 'reset', from: myId, template, revision });
  }, [updateBoard, send, myId]);

  const sendLassoPreview = useCallback((mode: 'paint' | 'outline' | 'drag', points: Point[] | null, color: string, ids?: string[], dx?: number, dy?: number) => {
    const currentSeat = seatRef.current;
    if (!currentSeat) return;
    const safePoints = (points ?? []).slice(-220);
    if (!safePoints.every((point) => inSeat(point, currentSeat))) return;
    send({ kind: 'lasso-gesture', from: myId, seat: currentSeat, mode,
      points: safePoints, color, done: points === null,
      ...(mode === 'drag' && points !== null ? { ids, dx, dy } : {}) });
  }, [myId, send]);

  const sendCursor = useCallback((x: number, y: number) => {
    send({ kind: 'cursor', from: myId, x, y, name: displayName, color: partner.accent });
  }, [myId, displayName, send, partner.accent]);

  const react = useCallback((value: 'heart' | 'sparkle') => {
    setReactions((all) => [...all.slice(-3), { id: crypto.randomUUID(), name: 'You', value: value === 'heart' ? '\u2665' : '\u2728' }]);
    send({ kind: 'reaction', from: myId, name: displayName, value });
  }, [send, myId, displayName]);

  return {
    board, connection, retryConnection, members, cursors, reactions, myId, seat,
    remoteDrafts: remoteDrafts.current, remoteLassos, sendLassoPreview, draftVersion,
    begin, points, end, addFill, setLessonStep, undo, canUndo: undoDepth > 0 || board.strokes.some((stroke) => canEditStroke(stroke, seat)),
    moveSelection, deleteSelection, duplicateSelection,
    changeTemplate, sendCursor, react,
  };
}
