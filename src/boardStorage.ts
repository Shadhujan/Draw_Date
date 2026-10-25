import type { BoardState } from './types';

// IndexedDB keeps large drawings safe when localStorage's usual ~5 MB limit
// is reached. Writes are serialized per room so an older snapshot cannot
// overwrite a newer one if the browser finishes transactions out of order.
const DB_NAME = 'draw-date-artwork-v1';
const STORE = 'rooms';
let openPromise: Promise<IDBDatabase> | null = null;
const writes = new Map<string, Promise<void>>();

function database(): Promise<IDBDatabase> {
  if (!openPromise) {
    openPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((error) => { openPromise = null; throw error; });
  }
  return openPromise!;
}

export async function loadDurableBoard(roomId: string): Promise<BoardState | null> {
  try {
    const db = await database();
    const raw = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(roomId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return raw as BoardState | null;
  } catch { return null; }
}

export function saveDurableBoard(roomId: string, board: BoardState): void {
  const previous = writes.get(roomId) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    const db = await database();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(board, roomId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  });
  writes.set(roomId, next);
  void next.catch(() => { console.warn('Draw Date could not save this room to device storage.'); });
}
