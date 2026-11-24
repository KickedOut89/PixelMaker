import type { Sprite } from '../core/sprite';

/** Sprites are kept in the browser's IndexedDB so work survives closing the app. */
const DB_NAME = 'pixelmaker';
const DB_VERSION = 1;
const SPRITES = 'sprites';
const META = 'meta';
const LAST_OPEN = 'lastOpenId';

export interface SpriteSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  updatedAt: number;
}

type Stored = Sprite & { updatedAt: number };

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SPRITES)) db.createObjectStore(SPRITES, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Storage is blocked by another tab'));
    });
    // A failed open should be retried next time, not remembered forever.
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Storage transaction aborted'));
  });
}

export async function saveSprite(s: Sprite): Promise<void> {
  const record: Stored = { ...s, updatedAt: Date.now() };
  await run(SPRITES, 'readwrite', (st) => st.put(record));
}

export async function loadSprite(id: string): Promise<Sprite | null> {
  const record = await run<Stored | undefined>(SPRITES, 'readonly', (st) => st.get(id));
  if (!record) return null;
  const { updatedAt: _updatedAt, ...sprite } = record;
  return sprite;
}

export async function listSprites(): Promise<SpriteSummary[]> {
  const all = await run<Stored[]>(SPRITES, 'readonly', (st) => st.getAll());
  return all
    .map(({ id, name, width, height, updatedAt }) => ({ id, name, width, height, updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteSprite(id: string): Promise<void> {
  await run(SPRITES, 'readwrite', (st) => st.delete(id));
}

export async function getLastOpenId(): Promise<string | null> {
  return (await run<string | undefined>(META, 'readonly', (st) => st.get(LAST_OPEN))) ?? null;
}

export async function setLastOpenId(id: string): Promise<void> {
  await run(META, 'readwrite', (st) => st.put(id, LAST_OPEN));
}
