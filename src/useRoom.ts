import { useCallback, useEffect, useRef, useState } from 'react';
import { appendStroke, isPoint, isStroke, isTemplate, loadBoard, sanitizeBoard, saveBoard } from './board';
import { joinChannel, realtimeConfigured } from './realtime';
import type { BoardMessage, BoardState, Cursor, Partner, Point, Stroke, TemplateId } from './types';

type Connection = 'solo' | 'connecting' | 'connected' | 'error' | 'full';
type Reaction = { id: string; value: string; name: string };

export function useRoom(roomId: string, displayName: string) {
  const myId = useRef(crypto.randomUUID()).current;
  const [board, setBoard] = useState<BoardState>(() => loadBoard(roomId));
  const boardRef = useRef(board);
  const [connection, setConnection] = useState<Connection>(realtimeConfigured ? 'connecting' : 'solo');
  const [members, setMembers] = useState<Partner[]>([]);
  const [cursors, setCursors] = useState<Cursor[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const remoteDrafts = useRef(new Map<string, Stroke>());
  const [draftVersion, setDraftVersion] = useState(0);
  const network = useRef<ReturnType<typeof joinChannel>>(null);
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

  useEffect(() => {
    if (!realtimeConfigured) return;
    let active = true;
    const connection = joinChannel(roomId, partner, {
      onStatus(status) {
        if (active) setConnection(status);
      },
      onMembers(next) {
        if (!active) return;
        setMembers(next);
        if (next.length > 2 && !next.slice(0, 2).some((item) => item.id === myId)) {
          setConnection('full');
        } else {
          setConnection((current) => current === 'full' ? 'connected' : current);
        }
      },
      onMessage(message) {
        if (!active || !message || message.from === myId) return;
        switch (message.kind) {
          case 'state-request':
            network.current?.send({ kind: 'state', from: myId, to: message.from, board: boardRef.current });
            break;
          case 'state': {
            if (message.to !== myId) break;
            const incoming = sanitizeBoard(message.board);
            if (!incoming) break;
            updateBoard((current) => {
              if (incoming.revision > current.revision) return incoming;
              if (incoming.revision < current.revision) return current;
              const known = new Set(incoming.strokes.map((stroke) => stroke.id));
              const unshared = current.strokes.filter((stroke) => !known.has(stroke.id));
              return {
                ...incoming,
                strokes: [...incoming.strokes, ...unshared].slice(-300),
              };
            });
            break;
          }
          case 'stroke-start':
            if (!isStroke(message.stroke) || remoteDrafts.current.has(message.stroke.id)) break;
            remoteDrafts.current.set(message.stroke.id, message.stroke);
            setDraftVersion((current) => current + 1);
            break;
          case 'stroke-points': {
            if (!Array.isArray(message.points) || message.points.length > 50 ||
                !message.points.every(isPoint)) break;
            const stroke = remoteDrafts.current.get(message.id);
            if (!stroke) break;
            remoteDrafts.current.set(message.id, {
              ...stroke,
              points: [...stroke.points, ...message.points].slice(0, 2000),
            });
            setDraftVersion((current) => current + 1);
            break;
          }
          case 'stroke-end': {
            const stroke = remoteDrafts.current.get(message.id);
            if (!stroke) break;
            remoteDrafts.current.delete(message.id);
            updateBoard((current) => ({ ...current, strokes: appendStroke(current.strokes, stroke) }));
            setDraftVersion((current) => current + 1);
            break;
          }
          case 'undo':
            updateBoard((current) => ({ ...current, strokes: current.strokes.filter((stroke) => stroke.id !== message.id) }));
            break;
          case 'reset':
            if (!isTemplate(message.template) || !Number.isSafeInteger(message.revision)) break;
            updateBoard((current) => message.revision > current.revision
              ? { template: message.template, strokes: [], revision: message.revision }
              : current);
            remoteDrafts.current.clear();
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
    };
  // Intentional: this subscription is scoped to the room and participant identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, myId, updateBoard]);

  useEffect(() => {
    if (!reactions.length) return;
    const timer = window.setTimeout(() => setReactions((current) => current.slice(1)), 2400);
    return () => window.clearTimeout(timer);
  }, [reactions]);

  const addStroke = useCallback((stroke: Stroke) => {
    updateBoard((current) => ({ ...current, strokes: appendStroke(current.strokes, stroke) }));
  }, [updateBoard]);

  const begin = useCallback((stroke: Stroke) => {
    send({ kind: 'stroke-start', from: myId, stroke });
  }, [send, myId]);

  const points = useCallback((id: string, additions: Point[]) => {
    if (additions.length) send({ kind: 'stroke-points', from: myId, id, points: additions });
  }, [send, myId]);

  const end = useCallback((stroke: Stroke) => {
    addStroke(stroke);
    send({ kind: 'stroke-end', from: myId, id: stroke.id });
  }, [send, addStroke, myId]);

  const undo = useCallback(() => {
    const mine = [...boardRef.current.strokes].reverse().find((stroke) => stroke.by === myId);
    if (!mine) return;
    updateBoard((current) => ({ ...current, strokes: current.strokes.filter((stroke) => stroke.id !== mine.id) }));
    send({ kind: 'undo', from: myId, id: mine.id });
  }, [updateBoard, send, myId]);

  const changeTemplate = useCallback((template: TemplateId) => {
    const revision = Math.max(boardRef.current.revision + 1, Date.now());
    updateBoard(() => ({ template, strokes: [], revision }));
    remoteDrafts.current.clear();
    setDraftVersion((current) => current + 1);
    send({ kind: 'reset', from: myId, template, revision });
  }, [updateBoard, send, myId]);

  const sendCursor = useCallback((x: number, y: number) => {
    send({ kind: 'cursor', from: myId, x, y, name: displayName, color: partner.accent });
  }, [myId, displayName, send, partner.accent]);

  const react = useCallback((value: 'heart' | 'sparkle') => {
    setReactions((all) => [...all.slice(-3), { id: crypto.randomUUID(), name: 'You', value: value === 'heart' ? '\u2665' : '\u2728' }]);
    send({ kind: 'reaction', from: myId, name: displayName, value });
  }, [send, myId, displayName]);

  return {
    board, connection, members, cursors, reactions, myId,
    remoteDrafts: remoteDrafts.current, draftVersion,
    begin, points, end, undo, changeTemplate, sendCursor, react,
  };
}
