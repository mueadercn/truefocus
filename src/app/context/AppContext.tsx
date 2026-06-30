import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { tasksApi, rescuesApi, settingsApi } from '../lib/supabase-api';
import { licenseApi } from '../lib/license-api';
import { deadlinesApi } from '../lib/deadlines-api';
import { clearUserCache } from '../lib/auth-helper';
import type { Task, RescueProtocol, Settings, User, License, AccessStatus, Deadline } from '../types';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// Debounce helper for settings updates
let settingsUpdateTimeout: NodeJS.Timeout | null = null;

interface AppContextType {
  user: User | null;
  tasks: Task[];
  rescues: RescueProtocol[];
  deadlines: Deadline[];
  settings: Settings;
  license: License | null;
  accessStatus: AccessStatus;
  selectedDate: string;
  loading: boolean;
  setSelectedDate: (date: string) => void;
  resetToToday: () => void;
  addTask: (task: Omit<Task, 'id' | 'completed' | 'completed_at' | 'created_at'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  addRescue: (rescue: Omit<RescueProtocol, 'id' | 'date'>) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshRescues: () => Promise<void>;
  refreshDeadlines: () => Promise<void>;
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
        
        // REMOVED: Don't call getSession() again here - it causes lock conflicts
        // The session was already checked in the first useEffect
        // We can trust that if user is set, the session is valid
        
        console.log('📡 STEP 1: Loading tasks...');
        const tasksData = await tasksApi.getAll();
        console.log('✅ STEP 1 DONE: Tasks loaded:', tasksData.length);
        
        console.log('📡 STEP 2: Loading rescues...');
        const rescuesData = await rescuesApi.getAll();
        console.log('✅ STEP 2 DONE: Rescues loaded:', rescuesData.length);
        
        console.log('📡 STEP 3: Loading settings...');
        const settingsData = await settingsApi.get();
        console.log('✅ STEP 3 DONE: Settings loaded:', settingsData);
        
        console.log('📡 STEP 4: Loading deadlines...');
        const deadlinesData = await deadlinesApi.getAll();
        console.log('✅ STEP 4 DONE: Deadlines loaded:', deadlinesData.length);
        
        console.log('📡 STEP 5: Loading license...');
        const licenseData = await licenseApi.get();
        console.log('✅ STEP 5 DONE: License loaded:', licenseData);
        
        if (tasksData) {
          console.log('✅ Tarefas carregadas:', tasksData.length);
          setTasks(tasksData);
        }
        
        if (rescuesData) {
          console.log('✅ Resgates carregados:', rescuesData.length);
          setRescues(rescuesData);
        }
        
        if (settingsData) {
          console.log('✅ Configurações carregadas');
          setSettings(settingsData);
        }
        
        if (deadlinesData) {
          console.log('✅ Deadlines carregadas:', deadlinesData.length);
          setDeadlines(deadlinesData);
        }
        
        if (licenseData) {
          console.log('✅ Licença carregada:', licenseData);
          setLicense(licenseData);
          // Calculate and set access status
          const status = licenseApi.checkAccess(licenseData);
          console.log('✅ Status de acesso calculado:', status);
          setAccessStatus(status);
        } else {
          // No license found - set default status
          console.log('⚠️ Nenhuma licença encontrada');
          setLicense(null);
          const defaultStatus = licenseApi.checkAccess(null);
          setAccessStatus(defaultStatus);
        }
        
        console.log('✅ Dados carregados com sucesso!');
      } catch (error) {
        console.error('💥 ERRO NO CARREGAMENTO:', error);
        toast.error('Error loading data');
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
    try {
      console.log('📝 Criando tarefa:', task);
      const newTask = await tasksApi.create(task);
      console.log('✅ Tarefa criada com sucesso:', newTask);
      setTasks(prev => [...prev, newTask]);
      toast.success('Task created successfully!');
    } catch (error) {
      console.error('❌ Error adding task:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      toast.error('Error creating task');
      throw error;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const updatedTask = await tasksApi.update(id, updates);
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Error updating task');
      throw error;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await tasksApi.delete(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('Task deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Error deleting task');
      throw error;
    }
  };

  const completeTask = async (id: string) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      // Usar formatDate para garantir horário local correto (YYYY-MM-DD)
      const today = formatDate(new Date());
      
      const updatedTask = await tasksApi.update(id, {
        completed: true,
        completed_at: `${today}T${new Date().toLocaleTimeString('pt-BR', { hour12: false })}`
      });
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));

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
    settings,
    license,
    accessStatus,
    selectedDate,
    loading,
    setSelectedDate,
    resetToToday,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    addRescue,
    updateSettings,
    refreshTasks,
    refreshRescues,
    refreshDeadlines,
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