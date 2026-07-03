import { supabase } from './supabase';
import { getQueue, removeFromQueue, getQueueCount, setMeta, getMeta, type SyncOp } from './offline-db';

// Gerencia o estado online/offline e a fila de sincronização com o Supabase.

export interface SyncStatus {
  online: boolean;
  lastSync: number | null; // timestamp ms
  pending: number; // operações na fila
  syncing: boolean;
}

type Listener = (status: SyncStatus) => void;

let listeners: Listener[] = [];
let isFlushing = false;
let currentPending = 0;
let currentLastSync: number | null = null;

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

async function computeStatus(): Promise<SyncStatus> {
  currentPending = await getQueueCount();
  currentLastSync = await getMeta<number>('lastSync');
  return {
    online: isOnline(),
    lastSync: currentLastSync,
    pending: currentPending,
    syncing: isFlushing,
  };
}

function emit() {
  const status: SyncStatus = {
    online: isOnline(),
    lastSync: currentLastSync,
    pending: currentPending,
    syncing: isFlushing,
  };
  listeners.forEach((l) => {
    try {
      l(status);
    } catch {
      /* noop */
    }
  });
}

export function subscribeSync(cb: Listener): () => void {
  listeners.push(cb);
  // Empurra estado atual imediatamente
  computeStatus().then(emit);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

// Recalcula e emite o status atual (chamar após enfileirar uma operação offline)
export async function refreshSyncStatus(): Promise<void> {
  await computeStatus();
  emit();
}

// Envolve uma promise (ou thenable do supabase) com timeout — evita "pendurar" offline
// quando o navigator.onLine mente que há conexão.
export function withTimeout<T>(p: PromiseLike<T>, ms = 5000): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

// Executa uma única operação enfileirada contra o Supabase (sempre com timeout)
async function runOp(op: SyncOp): Promise<void> {
  if (op.action === 'insert') {
    // upsert para ser idempotente caso a operação seja reenviada
    const { error } = await withTimeout(supabase.from(op.table).upsert(op.payload));
    if (error) throw error;
  } else if (op.action === 'update') {
    const { error } = await withTimeout(
      supabase.from(op.table).update(op.payload.updates).eq('id', op.payload.id)
    );
    if (error) throw error;
  } else if (op.action === 'delete') {
    const { error } = await withTimeout(supabase.from(op.table).delete().eq('id', op.payload.id));
    if (error) throw error;
  }
}

// Processa a fila inteira. Retorna quantas foram sincronizadas.
export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  if (isFlushing || !isOnline()) {
    return { synced: 0, failed: 0 };
  }
  isFlushing = true;
  await computeStatus();
  emit();

  let synced = 0;
  let failed = 0;

  try {
    const queue = await getQueue();
    for (const op of queue) {
      try {
        await runOp(op);
        if (op.id != null) await removeFromQueue(op.id);
        synced++;
      } catch (e) {
        console.warn('sync-manager: operação falhou (mantida na fila):', op, e);
        failed++;
        // Para de processar no primeiro erro para preservar a ordem
        break;
      }
    }

    if (synced > 0) {
      currentLastSync = Date.now();
      await setMeta('lastSync', currentLastSync);
    }
  } finally {
    isFlushing = false;
    currentPending = await getQueueCount();
    emit();
  }

  return { synced, failed };
}

// Dispara um flush em segundo plano com debounce. Chamar após CADA escrita local —
// nunca com await bloqueante. Se estiver offline, o flush apenas não faz nada.
let flushTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleFlush(delay = 500): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, delay);
}

// Marca o momento de uma sincronização completa (após recarregar tudo do servidor)
export async function markFullSync(): Promise<void> {
  currentLastSync = Date.now();
  await setMeta('lastSync', currentLastSync);
  currentPending = await getQueueCount();
  emit();
}

// Inicializa os listeners de rede. Retorna função de limpeza.
export function initSyncManager(onReconnect?: () => void): () => void {
  const handleOnline = async () => {
    console.log('🌐 Conexão detectada — sincronizando...');
    const result = await flushQueue();
    if (result.synced > 0 && onReconnect) onReconnect();
    emit();
  };
  const handleOffline = () => {
    console.log('📴 Offline — mudanças serão enfileiradas.');
    emit();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Rede de segurança: tenta esvaziar a fila periodicamente (caso o evento 'online'
  // não dispare, ou o navigator.onLine tenha mentido e depois voltou de verdade).
  const periodic = setInterval(() => {
    if (isOnline()) void flushQueue();
  }, 20000);

  // Estado inicial + tenta esvaziar fila se já estiver online
  computeStatus().then(() => {
    emit();
    if (isOnline()) flushQueue();
  });

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    clearInterval(periodic);
  };
}
