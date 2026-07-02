import { openDB, type IDBPDatabase } from 'idb';

// Banco local (IndexedDB) para funcionamento offline.
// Armazena cópias dos dados do usuário e uma fila de sincronização.

const DB_NAME = 'truefocus-offline';
const DB_VERSION = 1;

export type EntityStore = 'tasks' | 'notes' | 'deadlines' | 'rescues';

// Operação enfileirada para sincronizar com o Supabase quando houver internet
export interface SyncOp {
  id?: number; // auto-increment (chave da fila)
  table: string; // nome da tabela no Supabase
  action: 'insert' | 'update' | 'delete';
  payload: any; // linha completa (insert), { id, updates } (update) ou { id } (delete)
  created_at: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tasks')) db.createObjectStore('tasks', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('deadlines')) db.createObjectStore('deadlines', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('rescues')) db.createObjectStore('rescues', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('sync_queue')) db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

// ---- Cache de entidades (leitura offline) ----

export async function cacheReplaceAll(store: EntityStore, items: any[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(store, 'readwrite');
    await tx.objectStore(store).clear();
    for (const item of items) {
      if (item && item.id) await tx.objectStore(store).put(item);
    }
    await tx.done;
  } catch (e) {
    console.warn(`offline-db: falha ao cachear ${store}`, e);
  }
}

export async function cachePut(store: EntityStore, item: any): Promise<void> {
  try {
    const db = await getDB();
    await db.put(store, item);
  } catch (e) {
    console.warn(`offline-db: falha ao gravar em ${store}`, e);
  }
}

export async function cacheDelete(store: EntityStore, id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(store, id);
  } catch (e) {
    console.warn(`offline-db: falha ao deletar de ${store}`, e);
  }
}

export async function cacheGetAll<T = any>(store: EntityStore): Promise<T[]> {
  try {
    const db = await getDB();
    return (await db.getAll(store)) as T[];
  } catch (e) {
    console.warn(`offline-db: falha ao ler ${store}`, e);
    return [];
  }
}

// ---- Settings (registro único) ----

export async function cacheSetSettings(settings: any): Promise<void> {
  try {
    const db = await getDB();
    await db.put('settings', { key: 'current', value: settings });
  } catch (e) {
    console.warn('offline-db: falha ao cachear settings', e);
  }
}

export async function cacheGetSettings<T = any>(): Promise<T | null> {
  try {
    const db = await getDB();
    const row = await db.get('settings', 'current');
    return row ? (row.value as T) : null;
  } catch {
    return null;
  }
}

// ---- Fila de sincronização ----

export async function enqueueOp(op: Omit<SyncOp, 'id' | 'created_at'>): Promise<void> {
  try {
    const db = await getDB();
    await db.add('sync_queue', { ...op, created_at: Date.now() });
  } catch (e) {
    console.warn('offline-db: falha ao enfileirar operação', e);
  }
}

export async function getQueue(): Promise<SyncOp[]> {
  try {
    const db = await getDB();
    const all = (await db.getAll('sync_queue')) as SyncOp[];
    return all.sort((a, b) => (a.id || 0) - (b.id || 0));
  } catch {
    return [];
  }
}

export async function removeFromQueue(queueId: number): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('sync_queue', queueId);
  } catch (e) {
    console.warn('offline-db: falha ao remover da fila', e);
  }
}

export async function getQueueCount(): Promise<number> {
  try {
    const db = await getDB();
    return await db.count('sync_queue');
  } catch {
    return 0;
  }
}

// ---- Metadados (última sincronização etc.) ----

export async function setMeta(key: string, value: any): Promise<void> {
  try {
    const db = await getDB();
    await db.put('meta', { key, value });
  } catch (e) {
    console.warn('offline-db: falha ao gravar meta', e);
  }
}

export async function getMeta<T = any>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    const row = await db.get('meta', key);
    return row ? (row.value as T) : null;
  } catch {
    return null;
  }
}

// Limpa todos os dados locais (ex.: no logout)
export async function clearOfflineData(): Promise<void> {
  try {
    const db = await getDB();
    for (const store of ['tasks', 'notes', 'deadlines', 'rescues', 'settings', 'sync_queue', 'meta']) {
      await db.clear(store as any);
    }
  } catch (e) {
    console.warn('offline-db: falha ao limpar dados', e);
  }
}
