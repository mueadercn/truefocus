import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { tasksApi, rescuesApi, settingsApi } from '../lib/supabase-api';
import { notesApi } from '../lib/notes-api';
import { licenseApi } from '../lib/license-api';
import { deadlinesApi } from '../lib/deadlines-api';
import { clearUserCache } from '../lib/auth-helper';
import {
  cacheReplaceAll,
  cachePut,
  cacheDelete,
  cacheGetAll,
  cacheSetSettings,
  cacheGetSettings,
  cacheSetLicense,
  cacheGetLicense,
  enqueueOp,
  clearOfflineData,
} from '../lib/offline-db';
import {
  initSyncManager,
  subscribeSync,
  flushQueue,
  markFullSync,
  refreshSyncStatus,
  scheduleFlush,
  withTimeout,
  isOnline,
  type SyncStatus,
} from '../lib/sync-manager';
import type { Task, RescueProtocol, Settings, User, License, AccessStatus, Deadline, Note } from '../types';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// Gera um id local (UUID) para criações offline; a mesma id é usada ao sincronizar
function genLocalId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return (crypto as any).randomUUID();
    }
  } catch {
    /* noop */
  }
  // Fallback: UUID v4 válido (colunas `uuid` do Postgres aceitam) para WebViews antigas
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Debounce helper for settings updates
let settingsUpdateTimeout: NodeJS.Timeout | null = null;

interface AppContextType {
  user: User | null;
  tasks: Task[];
  rescues: RescueProtocol[];
  deadlines: Deadline[];
  notes: Note[];
  settings: Settings;
  license: License | null;
  accessStatus: AccessStatus;
  selectedDate: string;
  loading: boolean;
  syncStatus: SyncStatus;
  manualSync: () => Promise<void>;
  setSelectedDate: (date: string) => void;
  resetToToday: () => void;
  addTask: (task: Omit<Task, 'id' | 'completed' | 'completed_at' | 'created_at'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  addRescue: (rescue: Omit<RescueProtocol, 'id' | 'date'>) => Promise<void>;
  addDeadline: (input: { title: string; deadline_date: string; notes?: string }) => Promise<void>;
  updateDeadline: (id: string, updates: { title?: string; deadline_date?: string; notes?: string }) => Promise<void>;
  completeDeadline: (id: string) => Promise<void>;
  deleteDeadline: (id: string) => Promise<void>;
  addNote: (date: string, content: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshRescues: () => Promise<void>;
  refreshDeadlines: () => Promise<void>;
  refreshNotes: () => Promise<void>;
  refreshLicense: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const dopamineInsights = [
  "Todo pico de prazer cria uma dívida de dor equivalente",
  "Super-estimulação não energiza. Ela drena.",
  "Leak de dopamina = gastar atenção em prazer barato",
  "Seu cérebro mantém homeostase: UP → DOWN → Baseline",
  "Escolher dor agora = prazer depois. É a inversão do buraco.",
  "Momentum é perecível. Use-o antes que desapareça.",
  "1 alvo focal > 10 tarefas dispersas",
  "Não existe almoço grátis neurológico",
  "Armazenar dopamina = tratar como moeda preciosa",
  "Buraco de dopamina não é fraqueza. É déficit temporário."
];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rescues, setRescues] = useState<RescueProtocol[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [settings, setSettings] = useState<Settings>({
    theme: 'dark',
    notifications: true,
    sound: true,
    language: 'en'
  });
  const [license, setLicense] = useState<License | null>(null);
  const [accessStatus, setAccessStatus] = useState<AccessStatus>({
    hasAccess: true, // Start with true to avoid blocking during load
    reason: 'Loading',
    daysRemaining: null,
    displayText: 'Loading...',
    licenseType: 'trial'
  });
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    online: isOnline(),
    lastSync: null,
    pending: 0,
    syncing: false,
  });

  // CRITICAL FIX: Prevent multiple simultaneous auth checks (prevents lock errors)
  const isCheckingSession = React.useRef(false);
  const isLoadingData = React.useRef(false);

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      // Prevent multiple simultaneous calls
      if (isCheckingSession.current) {
        console.log('⏭️ Skipping session check - already in progress');
        return;
      }
      
      isCheckingSession.current = true;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 AppContext: Checking session...', { hasSession: !!session });
        
        if (session?.user) {
          // LOCAL-FIRST: entra NA HORA usando a sessão salva + a licença do cache.
          // A licença fresca vem depois (loadData cache-first + refreshLicense em 2º plano),
          // sem segurar a abertura do app esperando a rede (era o delay de ~8s offline).
          const cachedLicense = await cacheGetLicense<License>();
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name,
            license_type: cachedLicense?.license_type || 'trial',
            trial_ends_at: cachedLicense?.trial_ends_at || null,
            subscription_ends_at: cachedLicense?.subscription_ends_at || null,
          });
        }
      } catch (error) {
        // Silently ignore lock errors - they're caused by React Strict Mode double-mounting
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('⏭️ Skipped session check due to concurrent request (this is normal in dev mode)');
        } else {
          console.error('❌ Error checking session:', error);
        }
      } finally {
        setLoading(false);
        isCheckingSession.current = false;
      }
    };
    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state changed:', event, session?.user?.email);
      if (session?.user) {
        // LOCAL-FIRST: seta o usuário na hora (sessão + licença do cache), sem esperar a rede.
        const cachedLicense = await cacheGetLicense<License>();
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name,
          license_type: cachedLicense?.license_type || 'trial',
          trial_ends_at: cachedLicense?.trial_ends_at || null,
          subscription_ends_at: cachedLicense?.subscription_ends_at || null,
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load initial data when user is authenticated
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      if (isLoadingData.current) {
        console.log('⏭️ Skipping data load - already in progress');
        return;
      }
      isLoadingData.current = true;

      try {
        // 1) LOCAL-FIRST: renderiza IMEDIATAMENTE o que está no aparelho (IndexedDB).
        // Offline ou online, os dados aparecem na hora — nunca esperamos a rede.
        const [cTasks, cRescues, cDeadlines, cNotes, cSettings, cLicense] = await Promise.all([
          cacheGetAll<Task>('tasks'),
          cacheGetAll<RescueProtocol>('rescues'),
          cacheGetAll<Deadline>('deadlines'),
          cacheGetAll<Note>('notes'),
          cacheGetSettings<Settings>(),
          cacheGetLicense<License>(),
        ]);
        if (cTasks.length) setTasks(cTasks);
        if (cRescues.length) setRescues(cRescues);
        if (cDeadlines.length) setDeadlines(cDeadlines);
        if (cNotes.length) setNotes(cNotes);
        if (cSettings) setSettings(cSettings);
        if (cLicense) {
          setLicense(cLicense);
          setAccessStatus(licenseApi.checkAccess(cLicense)); // acesso pela DATA da licença em cache
        }
        setLoading(false); // já pode usar o app, mesmo offline

        // 2) BACKGROUND: atualiza do servidor (com timeout). Se responder, atualiza
        // state + cache (Supabase = backup); se falhar/offline, seguimos no cache local.
        void refreshAllFromServer();
        void refreshLicense();

        // 3) Sobe as mudanças offline pendentes (fila) em segundo plano.
        scheduleFlush();
      } catch (error) {
        console.error('💥 ERRO NO CARREGAMENTO (local-first):', error);
        setLoading(false);
      } finally {
        isLoadingData.current = false;
      }
    };
    
    // Adicionar pequeno delay para garantir que a sessão foi persistida
    const timer = setTimeout(loadData, 100);
    return () => clearTimeout(timer);
  }, [user]);

  // 🔄 AUTO-REFRESH LICENSE - a cada 30s
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      // Reavalia o acesso pela DATA da licença em cache — trava o trial vencido mesmo
      // offline, sem depender da rede.
      const cached = await cacheGetLicense<License>();
      if (cached) setAccessStatus(licenseApi.checkAccess(cached));
      // Tenta atualizar do servidor em segundo plano (nunca rebaixa em erro — ver refreshLicense).
      void refreshLicense();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // 🌐 SYNC MANAGER - detecta online/offline e sincroniza a fila automaticamente
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeSync((status) => setSyncStatus(status));
    const cleanup = initSyncManager(() => {
      // Ao reconectar e sincronizar, recarrega os dados frescos do servidor
      refreshAllFromServer();
    });

    return () => {
      unsubscribe();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Recarrega todas as entidades do servidor (com timeout) e atualiza o cache local.
  // Nunca lança nem trava — se offline, cada chamada falha e mantemos o cache.
  const refreshAllFromServer = async () => {
    try {
      const [tasksData, rescuesData, deadlinesData, notesData] = await Promise.all([
        withTimeout(tasksApi.getAll(), 8000).catch(() => null),
        withTimeout(rescuesApi.getAll(), 8000).catch(() => null),
        withTimeout(deadlinesApi.getAll(), 8000).catch(() => null),
        withTimeout(notesApi.getAll(), 8000).catch(() => null),
      ]);
      if (tasksData) { setTasks(tasksData); await cacheReplaceAll('tasks', tasksData); }
      if (rescuesData) { setRescues(rescuesData); await cacheReplaceAll('rescues', rescuesData); }
      if (deadlinesData) { setDeadlines(deadlinesData); await cacheReplaceAll('deadlines', deadlinesData); }
      if (notesData) { setNotes(notesData); await cacheReplaceAll('notes', notesData); }
      try {
        const settingsData = await withTimeout(settingsApi.get(), 8000);
        if (settingsData) { setSettings(settingsData); await cacheSetSettings(settingsData); }
      } catch { /* mantém settings do cache */ }
      await markFullSync();
    } catch (error) {
      console.error('Error refreshing from server:', error);
    }
  };

  // Sincronização manual (botão de refresh no menu)
  const manualSync = async () => {
    if (!isOnline()) {
      toast.error(settings.language === 'pt' ? 'Sem conexão no momento' : 'No connection right now');
      return;
    }
    await flushQueue();
    await refreshAllFromServer();
    toast.success(settings.language === 'pt' ? 'Sincronizado!' : 'Synced!');
  };

  const refreshTasks = async () => {
    try {
      const tasksData = await tasksApi.getAll();
      setTasks(tasksData);
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    }
  };

  const refreshRescues = async () => {
    try {
      const rescuesData = await rescuesApi.getAll();
      setRescues(rescuesData);
    } catch (error) {
      console.error('Error refreshing rescues:', error);
    }
  };

  const refreshDeadlines = async () => {
    try {
      const deadlinesData = await deadlinesApi.getAll();
      setDeadlines(deadlinesData);
    } catch (error) {
      console.error('Error refreshing deadlines:', error);
      // Silently fail if table doesn't exist yet
      if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST205') {
        console.warn('⚠️ Deadlines table not found - please create it in Supabase');
        setDeadlines([]);
      }
    }
  };

  const refreshNotes = async () => {
    try {
      const notesData = await notesApi.getAll();
      setNotes(notesData);
    } catch (error) {
      console.error('Error refreshing notes:', error);
    }
  };

  const addNote = async (date: string, content: string) => {
    const pt = settings.language === 'pt';
    const nowIso = new Date().toISOString();
    const optimistic: Note = {
      id: genLocalId(),
      user_id: user?.id || '',
      date,
      content,
      created_at: nowIso,
      updated_at: nowIso,
    };
    // LOCAL-FIRST: salva no aparelho + enfileira o backup + sincroniza em 2º plano
    setNotes(prev => [optimistic, ...prev]);
    await cachePut('notes', optimistic);
    await enqueueOp({ table: 'notes', action: 'insert', payload: optimistic });
    await refreshSyncStatus();
    scheduleFlush();
    toast.success(pt ? 'Anotação salva' : 'Note saved');
  };

  const deleteNote = async (id: string) => {
    const pt = settings.language === 'pt';
    setNotes(prev => prev.filter(n => n.id !== id));
    await cacheDelete('notes', id);
    await enqueueOp({ table: 'notes', action: 'delete', payload: { id } });
    await refreshSyncStatus();
    scheduleFlush();
    toast.success(pt ? 'Anotação excluída' : 'Note deleted');
  };

  const refreshLicense = async () => {
    if (!user) return;
    try {
      // Timeout evita "pendurar" quando o navigator.onLine mente que há conexão.
      const licenseData = await withTimeout(licenseApi.get(), 8000);
      setLicense(licenseData);
      setAccessStatus(licenseApi.checkAccess(licenseData));
      await cacheSetLicense(licenseData);
    } catch (error) {
      // Erro/timeout de REDE: nunca rebaixar o acesso por causa da rede. O bloqueio só
      // pode vir de (a) resposta bem-sucedida do servidor ou (b) a DATA da licença em cache.
      const cached = await cacheGetLicense<License>();
      if (cached) setAccessStatus(licenseApi.checkAccess(cached));
      // Sem cache: mantém o status atual (não trava).
    }
  };

  const addTask = async (task: Omit<Task, 'id' | 'completed' | 'completed_at' | 'created_at'>) => {
    const pt = settings.language === 'pt';
    const nowIso = new Date().toISOString();
    const optimistic: Task = {
      id: genLocalId(),
      text: task.text,
      category: task.category,
      duration_min: task.duration_min,
      date: task.date,
      mode: task.mode,
      completed: false,
      completed_at: null,
      created_at: nowIso,
    };

    // LOCAL-FIRST: salva no aparelho na hora (nunca falha), enfileira o backup e
    // dispara a sincronização em segundo plano.
    setTasks(prev => [...prev, optimistic]);
    await cachePut('tasks', optimistic);
    await enqueueOp({ table: 'tasks', action: 'insert', payload: { ...optimistic, user_id: user?.id } });
    await refreshSyncStatus();
    scheduleFlush();
    toast.success(pt ? 'Tarefa salva' : 'Task saved');
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const existing = tasks.find(t => t.id === id);
    const merged = existing ? { ...existing, ...updates } : null;
    // LOCAL-FIRST
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (merged) await cachePut('tasks', merged);
    await enqueueOp({ table: 'tasks', action: 'update', payload: { id, updates } });
    await refreshSyncStatus();
    scheduleFlush();
  };

  const deleteTask = async (id: string) => {
    const pt = settings.language === 'pt';
    setTasks(prev => prev.filter(t => t.id !== id));
    await cacheDelete('tasks', id);
    await enqueueOp({ table: 'tasks', action: 'delete', payload: { id } });
    await refreshSyncStatus();
    scheduleFlush();
    toast.success(pt ? 'Tarefa excluída' : 'Task deleted');
  };

  const completeTask = async (id: string) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      // Usar formatDate para garantir horário local correto (YYYY-MM-DD)
      const today = formatDate(new Date());
      const updates = {
        completed: true,
        completed_at: `${today}T${new Date().toLocaleTimeString('pt-BR', { hour12: false })}`,
      };

      // Otimista: marca como concluída na UI e no cache imediatamente
      const merged = { ...task, ...updates };
      setTasks(prev => prev.map(t => t.id === id ? merged : t));
      await cachePut('tasks', merged);

      // LOCAL-FIRST: já aplicado acima no state + cache; agora só enfileira o backup
      await enqueueOp({ table: 'tasks', action: 'update', payload: { id, updates } });
      await refreshSyncStatus();
      scheduleFlush();

      // Play sound if enabled
      if (settings.sound) {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0NVKzn77NeGQc+ltryy3ksBSh+zPDbkUAKE2Gy6OyrWBQLSKLi8sFuJAUuhM/z1oU1Bx1uvO/mnVQODlWs6PDOZRsHPJfe8s98LQYmfdDx3Y9ACxBes+nqqlgUC0mi4/K+byQFMIXP89eDNQccb7zv5Z5UDQ5VrOjwzmUbBzyX3vLPfC0GJn3Q8d2PQAsQXrPp6qpYFAtJouPyvm8kBTCFz/PXgzUHHG+87+WeVA0OVazo8M5lGwc8l97yz3wtBiZ90PHdj0ALEF6z6eqqWBQLSaLj8r5vJAUwhc/z14M1Bxxvvu/lnlQNDlWs6PDOZRsHPJfe8s98LQYmfdDx3Y9ACxBes+nqqlgUC0mi4/K+');
        audio.volume = 0.4;
        audio.play().catch(() => {});
      }

      // Show notification if enabled
      if (settings.notifications) {
        const random = Math.random();
        if (random < 0.4) {
          // 40% chance: Educational insight
          const insight = dopamineInsights[Math.floor(Math.random() * dopamineInsights.length)];
          toast.success('💡 Did you know?', {
            description: insight,
            duration: 5000
          });
        } else {
          // 60% chance: Congratulations
          toast.success('🎉 Task completed!', {
            description: 'One more step out of the hole. Keep storing dopamine.',
            duration: 3000
          });
        }
      }
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Error completing task');
      throw error;
    }
  };

  const addRescue = async (rescue: Omit<RescueProtocol, 'id' | 'date'>) => {
    const nowIso = new Date().toISOString();
    const optimistic: RescueProtocol = { ...rescue, id: genLocalId(), date: nowIso } as RescueProtocol;
    // LOCAL-FIRST
    setRescues(prev => [optimistic, ...prev]);
    await cachePut('rescues', optimistic);
    // Payload explícito com as colunas reais da tabela (evita erro no upsert)
    await enqueueOp({
      table: 'rescues',
      action: 'insert',
      payload: {
        id: optimistic.id,
        date: nowIso,
        user_id: user?.id,
        phase1_source: rescue.phase1_source,
        phase2_activity: rescue.phase2_activity,
        phase3_activity: rescue.phase3_activity,
        phase4_activity: rescue.phase4_activity,
        phase5_target: rescue.phase5_target,
        phase5_category: rescue.phase5_category,
        phase5_duration_min: rescue.phase5_duration_min,
        reflection_cause: rescue.reflection_cause,
        reflection_adjust: rescue.reflection_adjust,
        reflection_nugget: rescue.reflection_nugget,
        completed_date: rescue.completed_date,
      },
    });
    await refreshSyncStatus();
    scheduleFlush();
    toast.success('✅ Rescue complete!', {
      description: 'You got out of the hole. Now focus on your target for today.',
      duration: 4000,
    });
  };

  // ---- Deadlines (prazos) — local-first ----
  const addDeadline = async (input: { title: string; deadline_date: string; notes?: string }) => {
    const nowIso = new Date().toISOString();
    const optimistic: Deadline = {
      id: genLocalId(),
      user_id: user?.id || '',
      title: input.title,
      deadline_date: input.deadline_date,
      notes: input.notes || null,
      status: 'pending',
      created_at: nowIso,
      updated_at: nowIso,
      completed_at: null,
      notification_sent_30days: false,
      notification_sent_15days: false,
      notification_sent_7days: false,
      notification_sent_3days: false,
      notification_sent_1day: false,
    };
    setDeadlines(prev => [...prev, optimistic]);
    await cachePut('deadlines', optimistic);
    await enqueueOp({
      table: 'deadlines_41f917a5',
      action: 'insert',
      payload: {
        id: optimistic.id,
        user_id: user?.id,
        title: input.title,
        deadline_date: input.deadline_date,
        notes: input.notes || null,
        status: 'pending',
      },
    });
    await refreshSyncStatus();
    scheduleFlush();
  };

  const updateDeadline = async (id: string, updates: { title?: string; deadline_date?: string; notes?: string }) => {
    const existing = deadlines.find(d => d.id === id);
    const merged = existing ? { ...existing, ...updates, updated_at: new Date().toISOString() } : null;
    setDeadlines(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    if (merged) await cachePut('deadlines', merged);
    await enqueueOp({ table: 'deadlines_41f917a5', action: 'update', payload: { id, updates } });
    await refreshSyncStatus();
    scheduleFlush();
  };

  const completeDeadline = async (id: string) => {
    const existing = deadlines.find(d => d.id === id);
    const updates = { status: 'completed' as const, completed_at: new Date().toISOString() };
    const merged = existing ? { ...existing, ...updates } : null;
    setDeadlines(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    if (merged) await cachePut('deadlines', merged);
    await enqueueOp({ table: 'deadlines_41f917a5', action: 'update', payload: { id, updates } });
    await refreshSyncStatus();
    scheduleFlush();
  };

  const deleteDeadline = async (id: string) => {
    setDeadlines(prev => prev.filter(d => d.id !== id));
    await cacheDelete('deadlines', id);
    await enqueueOp({ table: 'deadlines_41f917a5', action: 'delete', payload: { id } });
    await refreshSyncStatus();
    scheduleFlush();
  };

  const updateSettings = async (newSettings: Settings) => {
    const pt = newSettings.language === 'pt';
    // LOCAL-FIRST: aplica e cacheia na hora (nunca falha/trava)
    setSettings(newSettings);
    await cacheSetSettings(newSettings);
    // Best-effort: tenta salvar no servidor em 2º plano (com timeout). Offline, fica local.
    try {
      const updated = await withTimeout(settingsApi.update(newSettings), 8000);
      setSettings(updated);
      await cacheSetSettings(updated);
    } catch {
      /* mantém local; sincroniza numa próxima vez online */
    }
    toast.success(pt ? 'Configurações salvas' : 'Settings updated');
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('⏱️ [LOGIN] STEP 1: Iniciando signInWithPassword...');
      const startTime = Date.now();
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log(`⏱️ [LOGIN] STEP 1 CONCLUÍDO em ${Date.now() - startTime}ms`);
      
      if (error) {
        console.error('❌ Erro no signInWithPassword:', error);
        throw new Error(error.message || 'Erro ao fazer login');
      }
      
      if (!data.session) {
        console.error('❌ Sessão inválida após login');
        throw new Error('Sessão inválida');
      }
      
      console.log('✅ Login bem-sucedido!');
      console.log('📧 Email:', data.user.email);
      
      console.log('⏱️ [LOGIN] STEP 2: Setando user no state...');
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name
      });
      console.log('⏱️ [LOGIN] STEP 2 CONCLUÍDO');
      console.log(`⏱️ [LOGIN] TEMPO TOTAL: ${Date.now() - startTime}ms`);
    } catch (error: any) {
      console.error('Error signing in:', error);
      throw new Error(error.message || 'Erro ao fazer login');
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      // Call backend to create user with email_confirm: true
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-41f917a5/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email, password, name })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar conta');
      }

      // After successful signup, sign in immediately
      await signIn(email, password);
    } catch (error: any) {
      console.error('Error signing up:', error);
      throw new Error(error.message || 'Erro ao criar conta');
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setTasks([]);
      setRescues([]);
      setNotes([]);
      setDeadlines([]);
      await clearOfflineData();
      setSettings({
        theme: 'dark',
        notifications: true,
        sound: true,
        language: 'en'
      });
      clearUserCache();
    } catch (error: any) {
      console.error('Error signing out:', error);
      throw new Error(error.message || 'Erro ao sair');
    }
  };

  const resetToToday = () => {
    setSelectedDate(formatDate(new Date()));
  };

  const value: AppContextType = {
    user,
    tasks,
    rescues,
    deadlines,
    notes,
    settings,
    license,
    accessStatus,
    selectedDate,
    loading,
    syncStatus,
    manualSync,
    setSelectedDate,
    resetToToday,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    addRescue,
    addDeadline,
    updateDeadline,
    completeDeadline,
    deleteDeadline,
    addNote,
    deleteNote,
    updateSettings,
    refreshTasks,
    refreshRescues,
    refreshDeadlines,
    refreshNotes,
    refreshLicense,
    signIn,
    signUp,
    signOut
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}