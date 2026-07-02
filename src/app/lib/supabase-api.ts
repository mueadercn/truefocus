import { supabase } from './supabase';
import { getCurrentUser } from './auth-helper';
import type { Task, RescueProtocol, Settings } from '../types';

// Helper to retry on lock errors
async function retryOnLockError<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isLockError = error?.message?.includes('Lock') || error?.name === 'AbortError';
      const isLastAttempt = i === maxRetries - 1;
      
      if (isLockError && !isLastAttempt) {
        console.log(`⏭️ Lock error detected, retrying (${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1))); // exponential backoff
        continue;
      }
      
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// Tasks API - usando Supabase diretamente
export const tasksApi = {
  getAll: async (): Promise<Task[]> => {
    return retryOnLockError(async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Failed to fetch tasks:', error);
        throw new Error(error.message);
      }
      return data || [];
    });
  },

  getByDate: async (date: string): Promise<Task[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Failed to fetch tasks by date:', error);
      throw new Error(error.message);
    }
    return data || [];
  },

  create: async (task: Omit<Task, 'id' | 'completed' | 'completed_at' | 'created_at'>): Promise<Task> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Insert task without 'source' field - it doesn't exist in database
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        text: task.text,
        category: task.category,
        duration_min: task.duration_min,
        date: task.date,
        mode: task.mode,
        completed: false,
        user_id: user.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to create task:', error);
      throw new Error(error.message);
    }
    return data;
  },

  update: async (id: string, updates: Partial<Task>): Promise<Task> => {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Failed to update task:', error);
      throw new Error(error.message);
    }
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Failed to delete task:', error);
      throw new Error(error.message);
    }
  }
};

// Rescues API
export const rescuesApi = {
  getAll: async (): Promise<RescueProtocol[]> => {
    const { data, error } = await supabase
      .from('rescues')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Failed to fetch rescues:', error);
      throw new Error(error.message);
    }
    return data || [];
  },

  create: async (rescue: Omit<RescueProtocol, 'id' | 'date'>): Promise<RescueProtocol> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('rescues')
      .insert({
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
        user_id: user.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to create rescue:', error);
      throw new Error(error.message);
    }
    return data;
  }
};

// Settings API
export const settingsApi = {
  get: async (): Promise<Settings> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Failed to fetch settings:', error);
      throw new Error(error.message);
    }
    
    // Get language from user metadata
    const language = user.user_metadata?.language || 'en';
    
    // Return default settings if not found
    if (!data) {
      return {
        theme: "dark",
        notifications: true,
        sound: true,
        language
      };
    }
    
    // Return settings with language from user metadata
    return {
      ...data,
      language
    };
  },

  update: async (settings: Settings): Promise<Settings> => {
    console.log('🔧 settingsApi.update - START', settings);
    
    try {
      const user = await getCurrentUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      console.log('👤 User authenticated:', user.id);

      const language = settings.language || 'en';

      // Persistir o idioma no metadata do usuário (é de onde o get() lê no próximo load).
      // Sem isto, o idioma volta ao padrão ao recarregar o app.
      try {
        await supabase.auth.updateUser({ data: { language } });
      } catch (langErr) {
        console.warn('Não foi possível persistir o idioma no metadata:', langErr);
      }

      // Check if settings exist first
      console.log('🔍 Checking if settings exist for user:', user.id);
      const { data: existing, error: checkError } = await supabase
        .from('settings')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Failed to check settings:', checkError);
        throw new Error(checkError.message);
      }

      console.log('📊 Settings exist?', !!existing);

      if (existing) {
        // Update existing settings
        console.log('🔄 Updating existing settings...');
        const { data, error } = await supabase
          .from('settings')
          .update({
            theme: settings.theme,
            notifications: settings.notifications,
            sound: settings.sound,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select('user_id, theme, notifications, sound, updated_at')
          .single();
        
        if (error) {
          console.error('❌ Failed to update settings:', error);
          throw new Error(error.message);
        }
        console.log('✅ Settings updated in DB:', data);
        
        return { ...data, language };
      } else {
        // Insert new settings
        console.log('➕ Inserting new settings...');
        const { data, error } = await supabase
          .from('settings')
          .insert({
            user_id: user.id,
            theme: settings.theme,
            notifications: settings.notifications,
            sound: settings.sound
          })
          .select('user_id, theme, notifications, sound, updated_at')
          .single();
        
        if (error) {
          console.error('❌ Failed to insert settings:', error);
          throw new Error(error.message);
        }
        console.log('✅ Settings inserted in DB:', data);
        
        return { ...data, language };
      }
    } catch (error) {
      console.error('💥 EXCEPTION in settingsApi.update:', error);
      throw error;
    }
  }
};