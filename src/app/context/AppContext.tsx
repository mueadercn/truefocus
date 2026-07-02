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
  enqueueOp,
  clearOfflineData,
} from '../lib/offline-db';
import {
  initSyncManager,
  subscribeSync,
  flushQueue,
  markFullSync,
  refreshSyncStatus,
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
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
          // Load license data when loading user
          console.log('🔍 AppContext: Loading license data for user:', session.user.email);
          
          try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('License query timeout after 8 seconds')), 8000)
            );
            
            const queryPromise = supabase
              .from('licenses')
              .select('license_type, trial_ends_at, subscription_ends_at')
              .eq('user_id', session.user.id)
              .single();
            
            const { data: licenseData, error: licenseError } = await Promise.race([
              queryPromise,
              timeoutPromise
            ]) as any;
            
            console.log('✅ AppContext: License data loaded:', {
              licenseData,
              licenseError,
              userId: session.user.id
            });
            
            const userData = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name,
              license_type: licenseData?.license_type || 'trial',
              trial_ends_at: licenseData?.trial_ends_at,
              subscription_ends_at: licenseData?.subscription_ends_at
            };
            
            console.log('✅ AppContext: User object created:', userData);
            setUser(userData);
          } catch (error) {
            console.error('❌ AppContext: Error loading license data in checkSession:', error);
            // Set user with trial as fallback
            const userData = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name,
              license_type: 'trial' as const,
              trial_ends_at: null,
              subscription_ends_at: null
            };
            console.log('⚠️ AppContext: Using fallback user data (checkSession):', userData);
            setUser(userData);
          }
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
        // Load license data when auth state changes
        console.log('🔍 AppContext: Loading license data (auth change) for:', session.user.email);
        console.log('🔍 STEP A: Iniciando try/catch...');
        
        try {
          console.log('🔍 STEP B: Criando timeout promise...');
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => {
              console.log('⏰ TIMEOUT TRIGGERED! Query took more than 8 seconds');
              reject(new Error('License query timeout after 8 seconds'));
            }, 8000)
          );
          
          console.log('🔍 STEP C: Criando query promise...');
          const queryPromise = supabase
            .from('licenses')
            .select('license_type, trial_ends_at, subscription_ends_at')
            .eq('user_id', session.user.id)
            .single();
          
          console.log('🔍 STEP D: Iniciando Promise.race...');
          const { data: licenseData, error: licenseError } = await Promise.race([
            queryPromise,
            timeoutPromise
          ]) as any;
          
          console.log('🔍 STEP E: Promise.race completo!');
          console.log('✅ AppContext: License data loaded (auth change):', {
            licenseData,
            licenseError
          });
          
          const userData = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name,
            license_type: licenseData?.license_type || 'trial',
            trial_ends_at: licenseData?.trial_ends_at,
            subscription_ends_at: licenseData?.subscription_ends_at
          };
          
          console.log('✅ AppContext: User object created (auth change):', userData);
          setUser(userData);
        } catch (error) {
          console.log('🔍 STEP F: Entrou no CATCH!');
          console.error('❌ AppContext: Error loading license data:', error);
          // Set user with trial as fallback
          const userData = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name,
            license_type: 'trial' as const,
            trial_ends_at: null,
            subscription_ends_at: null
          };
          console.log('⚠️ AppContext: Using fallback user data:', userData);
          setUser(userData);
        }
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
      // Prevent multiple simultaneous data loads
      if (isLoadingData.current) {
        console.log('⏭️ Skipping data load - already in progress');
        return;
      }
      
      isLoadingData.current = true;
      
      try {
        console.log('🔄 Iniciando carregamento de dados...');
        setLoading(true);

        // Carrega cada entidade de forma resiliente: se a rede falhar (offline),
        // usa a cópia local do IndexedDB. Se tiver rede, atualiza a cópia local.
        let allOnline = true;

        // Tasks
        try {
          const tasksData = await tasksApi.getAll();
          setTasks(tasksData);
          await cacheReplaceAll('tasks', tasksData);
        } catch (e) {
          allOnline = false;
          console.warn('⚠️ Tasks offline - usando cache local', e);
          setTasks(await cacheGetAll<Task>('tasks'));
        }

        // Rescues
        try {
          const rescuesData = await rescuesApi.getAll();
          setRescues(rescuesData);
          await cacheReplaceAll('rescues', rescuesData);
        } catch (e) {
          allOnline = false;
          console.warn('⚠️ Rescues offline - usando cache local', e);
          setRescues(await cacheGetAll<RescueProtocol>('rescues'));
        }

        // Deadlines
        try {
          const deadlinesData = await deadlinesApi.getAll();
          setDeadlines(deadlinesData);
          await cacheReplaceAll('deadlines', deadlinesData);
        } catch (e) {
          allOnline = false;
          console.warn('⚠️ Deadlines offline - usando cache local', e);
          setDeadlines(await cacheGetAll<Deadline>('deadlines'));
        }

        // Notes
        try {
          const notesData = await notesApi.getAll();
          setNotes(notesData);
          await cacheReplaceAll('notes', notesData);
        } catch (e) {
          console.warn('⚠️ Notes offline/indisponível - usando cache local', e);
          setNotes(await cacheGetAll<Note>('notes'));
        }

        // Settings
        try {
          const settingsData = await settingsApi.get();
          if (settingsData) {
            setSettings(settingsData);
            await cacheSetSettings(settingsData);
          }
        } catch (e) {
          const cachedSettings = await cacheGetSettings<Settings>();
          if (cachedSettings) setSettings(cachedSettings);
        }

        // License (somente online; offline mantém acesso permissivo já definido)
        try {
          const licenseData = await licenseApi.get();
          if (licenseData) {
            setLicense(licenseData);
            setAccessStatus(licenseApi.checkAccess(licenseData));
          } else {
            setLicense(null);
            setAccessStatus(licenseApi.checkAccess(null));
          }
        } catch (e) {
          console.warn('⚠️ Licença offline - mantendo acesso atual', e);
        }

        // Se estamos online, tenta esvaziar a fila de mudanças offline e marca sync
        if (isOnline() && allOnline) {
          await flushQueue();
          await markFullSync();
        }

        console.log('✅ Dados carregados (online:', allOnline, ')');
      } catch (error) {
        console.error('💥 ERRO NO CARREGAMENTO:', error);
      } finally {
        console.log('🏁 FINALIZANDO LOADING...');
        setLoading(false);
        isLoadingData.current = false;
      }
    };
    
    // Adicionar pequeno delay para garantir que a sessão foi persistida
    const timer = setTimeout(loadData, 100);
    return () => clearTimeout(timer);
  }, [user]);

  // 🔄 AUTO-REFRESH LICENSE - Check every 30 seconds for admin changes
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Starting license auto-refresh (every 30s)');
    
    const interval = setInterval(async () => {
      console.log('🔄 Auto-refreshing license...');
      await refreshLicense();
    }, 30000); // 30 seconds

    return () => {
      console.log('🛑 Stopping license auto-refresh');
      clearInterval(interval);
    };
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

  // Recarrega todas as entidades do servidor e atualiza o cache local
  const refreshAllFromServer = async () => {
    try {
      const [tasksData, rescuesData, deadlinesData] = await Promise.all([
        tasksApi.getAll().catch(() => null),
        rescuesApi.getAll().catch(() => null),
        deadlinesApi.getAll().catch(() => null),
      ]);
      if (tasksData) { setTasks(tasksData); await cacheReplaceAll('tasks', tasksData); }
      if (rescuesData) { setRescues(rescuesData); await cacheReplaceAll('rescues', rescuesData); }
      if (deadlinesData) { setDeadlines(deadlinesData); await cacheReplaceAll('deadlines', deadlinesData); }
      try {
        const notesData = await notesApi.getAll();
        setNotes(notesData);
        await cacheReplaceAll('notes', notesData);
      } catch { /* notes opcional */ }
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
    // Offline: cria localmente e enfileira para sincronizar depois
    if (!isOnline()) {
      const nowIso = new Date().toISOString();
      const optimistic: Note = {
        id: genLocalId(),
        user_id: user?.id || '',
        date,
        content,
        created_at: nowIso,
        updated_at: nowIso,
      };
      setNotes(prev => [optimistic, ...prev]);
      await cachePut('notes', optimistic);
      await enqueueOp({ table: 'notes', action: 'insert', payload: optimistic });
      await refreshSyncStatus();
      toast.success(pt ? 'Anotação salva (offline)' : 'Note saved (offline)');
      return;
    }
    try {
      const newNote = await notesApi.create({ date, content });
      setNotes(prev => [newNote, ...prev]);
      await cachePut('notes', newNote);
      toast.success(pt ? 'Anotação salva!' : 'Note saved!');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error(pt ? 'Erro ao salvar anotação' : 'Error saving note');
      throw error;
    }
  };

  const deleteNote = async (id: string) => {
    const pt = settings.language === 'pt';
    // Otimista: remove da UI e do cache imediatamente
    setNotes(prev => prev.filter(n => n.id !== id));
    await cacheDelete('notes', id);
    if (!isOnline()) {
      await enqueueOp({ table: 'notes', action: 'delete', payload: { id } });
      await refreshSyncStatus();
      toast.success(pt ? 'Anotação excluída (offline)' : 'Note deleted (offline)');
      return;
    }
    try {
      await notesApi.delete(id);
      toast.success(pt ? 'Anotação excluída' : 'Note deleted');
    } catch (error) {
      console.error('Error deleting note:', error);
      // Enfileira para tentar novamente quando reconectar
      await enqueueOp({ table: 'notes', action: 'delete', payload: { id } });
      await refreshSyncStatus();
    }
  };

  const refreshLicense = async () => {
    try {
      if (!user) return;
      const licenseData = await licenseApi.get();
      setLicense(licenseData);
      const status = licenseApi.checkAccess(licenseData);
      setAccessStatus(status);
    } catch (error) {
      console.error('Error refreshing license:', error);
      const defaultStatus: AccessStatus = {
        hasAccess: false,
        reason: 'Error',
        daysRemaining: 0,
        displayText: '🚫 Erro',
        licenseType: 'free'
      };
      setAccessStatus(defaultStatus);
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

    // Offline: cria localmente e enfileira
    if (!isOnline()) {
      setTasks(prev => [...prev, optimistic]);
      await cachePut('tasks', optimistic);
      await enqueueOp({
        table: 'tasks',
        action: 'insert',
        payload: { ...optimistic, user_id: user?.id },
      });
      await refreshSyncStatus();
      toast.success(pt ? 'Tarefa salva (offline)' : 'Task saved (offline)');
      return;
    }

    try {
      const newTask = await tasksApi.create(task);
      setTasks(prev => [...prev, newTask]);
      await cachePut('tasks', newTask);
      toast.success('Task created successfully!');
    } catch (error) {
      console.error('❌ Error adding task:', error);
      toast.error('Error creating task');
      throw error;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const existing = tasks.find(t => t.id === id);
    const merged = existing ? { ...existing, ...updates } : null;

    // Otimista: aplica na UI e no cache
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (merged) await cachePut('tasks', merged);

    if (!isOnline()) {
      await enqueueOp({ table: 'tasks', action: 'update', payload: { id, updates } });
      await refreshSyncStatus();
      return;
    }
    try {
      const updatedTask = await tasksApi.update(id, updates);
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      await cachePut('tasks', updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
      await enqueueOp({ table: 'tasks', action: 'update', payload: { id, updates } });
      await refreshSyncStatus();
    }
  };

  const deleteTask = async (id: string) => {
    const pt = settings.language === 'pt';
    // Otimista
    setTasks(prev => prev.filter(t => t.id !== id));
    await cacheDelete('tasks', id);

    if (!isOnline()) {
      await enqueueOp({ table: 'tasks', action: 'delete', payload: { id } });
      await refreshSyncStatus();
      toast.success(pt ? 'Tarefa excluída (offline)' : 'Task deleted (offline)');
      return;
    }
    try {
      await tasksApi.delete(id);
      toast.success('Task deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
      await enqueueOp({ table: 'tasks', action: 'delete', payload: { id } });
      await refreshSyncStatus();
    }
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

      if (!isOnline()) {
        await enqueueOp({ table: 'tasks', action: 'update', payload: { id, updates } });
        await refreshSyncStatus();
      } else {
        try {
          const updatedTask = await tasksApi.update(id, updates);
          setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
          await cachePut('tasks', updatedTask);
        } catch (error) {
          console.error('Error completing task online, queuing:', error);
          await enqueueOp({ table: 'tasks', action: 'update', payload: { id, updates } });
          await refreshSyncStatus();
        }
      }

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
    try {
      const newRescue = await rescuesApi.create(rescue);
      setRescues(prev => [newRescue, ...prev]);
      toast.success('✅ Rescue complete!', {
        description: 'You got out of the hole. Now focus on your target for today.',
        duration: 4000
      });
    } catch (error) {
      console.error('Error adding rescue:', error);
      toast.error('Error saving rescue');
      throw error;
    }
  };

  const updateSettings = async (newSettings: Settings) => {
    try {
      console.log('⚙️ UPDATING SETTINGS:', newSettings);
      const updated = await settingsApi.update(newSettings);
      console.log('✅ SETTINGS UPDATED:', updated);
      setSettings(updated);
      toast.success('Settings updated');
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      toast.error('Error updating settings');
      throw error;
    }
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