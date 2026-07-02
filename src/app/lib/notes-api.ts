import { supabase } from './supabase';
import { getCurrentUser } from './auth-helper';
import type { Note } from '../types';

// Notes API - anotações livres do usuário (texto/áudio transcrito) por dia
export const notesApi = {
  getAll: async (): Promise<Note[]> => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch notes:', error);
      throw new Error(error.message);
    }
    return data || [];
  },

  create: async (note: { date: string; content: string }): Promise<Note> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notes')
      .insert({
        date: note.date,
        content: note.content,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create note:', error);
      throw new Error(error.message);
    }
    return data;
  },

  update: async (id: string, updates: Partial<Pick<Note, 'content'>>): Promise<Note> => {
    const { data, error } = await supabase
      .from('notes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update note:', error);
      throw new Error(error.message);
    }
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('notes').delete().eq('id', id);

    if (error) {
      console.error('Failed to delete note:', error);
      throw new Error(error.message);
    }
  },
};
