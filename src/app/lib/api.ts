import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from './supabase';
import type { Task, RescueProtocol, Settings } from '../types';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-7e5f77a8`;

async function getHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  
  console.log('=== API Request Debug ===');
  console.log('Session exists:', !!session);
  console.log('Access token exists:', !!accessToken);
  if (accessToken) {
    console.log('Token preview:', accessToken.substring(0, 50) + '...');
  } else {
    console.error('⚠️ No access token found! User might not be logged in.');
  }
  console.log('Session user:', session?.user?.email);
  
  if (!accessToken) {
    throw new Error('No access token - user not authenticated');
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  };
}

// Tasks API
export const tasksApi = {
  getAll: async (): Promise<Task[]> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/tasks`, { headers });
    const data = await response.json();
    if (!response.ok) {
      console.error('Failed to fetch tasks:', data);
      throw new Error(data.error || 'Failed to fetch tasks');
    }
    return data.tasks || [];
  },

  getByDate: async (date: string): Promise<Task[]> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/tasks/${date}`, { headers });
    const data = await response.json();
    if (!response.ok) {
      console.error('Failed to fetch tasks by date:', data);
      throw new Error(data.error || 'Failed to fetch tasks');
    }
    return data.tasks || [];
  },

  create: async (task: Omit<Task, 'id' | 'completed' | 'completed_at' | 'created_at'>): Promise<Task> => {
    console.log('🌐 API: Criando tarefa...', task);
    const headers = await getHeaders();
    console.log('🌐 API: Headers preparados');
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(task)
    });
    console.log('🌐 API: Response status:', response.status);
    const data = await response.json();
    console.log('🌐 API: Response data:', data);
    if (!response.ok) {
      console.error('❌ API: Failed to create task:', data);
      throw new Error(data.error || 'Failed to create task');
    }
    return data.task;
  },

  update: async (id: string, updates: Partial<Task>): Promise<Task> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Failed to update task:', data);
      throw new Error(data.error || 'Failed to update task');
    }
    return data.task;
  },

  delete: async (id: string): Promise<void> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) {
      const data = await response.json();
      console.error('Failed to delete task:', data);
      throw new Error(data.error || 'Failed to delete task');
    }
  }
};

// Rescues API
export const rescuesApi = {
  getAll: async (): Promise<RescueProtocol[]> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/rescues`, { headers });
    const data = await response.json();
    if (!response.ok) {
      console.error('Failed to fetch rescues:', data);
      throw new Error(data.error || 'Failed to fetch rescues');
    }
    return data.rescues || [];
  },

  create: async (rescue: Omit<RescueProtocol, 'id' | 'date'>): Promise<RescueProtocol> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/rescues`, {
      method: 'POST',
      headers,
      body: JSON.stringify(rescue)
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Failed to create rescue:', data);
      throw new Error(data.error || 'Failed to create rescue');
    }
    return data.rescue;
  }
};

// Settings API
export const settingsApi = {
  get: async (): Promise<Settings> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/settings`, { headers });
    const data = await response.json();
    if (!response.ok) {
      console.error('Failed to fetch settings:', data);
      throw new Error(data.error || 'Failed to fetch settings');
    }
    return data.settings;
  },

  update: async (settings: Settings): Promise<Settings> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(settings)
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Failed to update settings:', data);
      throw new Error(data.error || 'Failed to update settings');
    }
    return data.settings;
  }
};