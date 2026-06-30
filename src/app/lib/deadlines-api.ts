import { supabase } from './supabase';
import { getCurrentUser } from './auth-helper';
import type { Deadline } from '../types';

export const deadlinesApi = {
  // Listar todas as deadlines do usuário
  async getAll(): Promise<Deadline[]> {
    const { data, error } = await supabase
      .from('deadlines_41f917a5')
      .select('*')
      .order('deadline_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Buscar por ID
  async getById(id: string): Promise<Deadline | null> {
    const { data, error } = await supabase
      .from('deadlines_41f917a5')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Criar nova deadline
  async create(deadline: {
    title: string;
    deadline_date: string;
    notes?: string;
  }): Promise<Deadline> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('deadlines_41f917a5')
      .insert({
        user_id: user.id,
        title: deadline.title,
        deadline_date: deadline.deadline_date,
        notes: deadline.notes || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Atualizar deadline
  async update(id: string, updates: {
    title?: string;
    deadline_date?: string;
    notes?: string;
  }): Promise<Deadline> {
    const { data, error } = await supabase
      .from('deadlines_41f917a5')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Marcar como concluída
  async complete(id: string): Promise<Deadline> {
    const { data, error } = await supabase
      .from('deadlines_41f917a5')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Deletar deadline
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('deadlines_41f917a5')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Contar deadlines por status
  async count(): Promise<{
    total: number;
    pending: number;
    overdue: number;
    completed: number;
  }> {
    const deadlines = await this.getAll();
    const now = new Date();
    
    const pending = deadlines.filter(d => 
      d.status === 'pending' && new Date(d.deadline_date) >= now
    ).length;
    
    const overdue = deadlines.filter(d => 
      d.status === 'pending' && new Date(d.deadline_date) < now
    ).length;
    
    const completed = deadlines.filter(d => 
      d.status === 'completed'
    ).length;

    return {
      total: deadlines.length,
      pending,
      overdue,
      completed
    };
  }
};

// Função utilitária para calcular dias restantes
export function calcularDiasRestantes(deadlineDate: string, language: 'pt' | 'en' = 'pt'): {
  dias: number;
  horas: number;
  texto: string;
  textoHoras: string;
  cor: string;
} {
  const hoje = new Date();
  
  const deadline = new Date(deadlineDate);
  deadline.setHours(23, 59, 59, 999); // Final do dia da deadline
  
  const diffMs = deadline.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHoras = Math.ceil(diffMs / (1000 * 60 * 60));
  
  let texto: string;
  let textoHoras: string;
  let cor: string;
  
  if (diffDias < 0) {
    const diasAtrasados = Math.abs(diffDias);
    const dayLabel = language === 'pt' 
      ? (diasAtrasados > 1 ? 'dias' : 'dia')
      : (diasAtrasados > 1 ? 'days' : 'day');
    const overdueLabel = language === 'pt' ? 'Atrasado' : 'Overdue';
    texto = `${overdueLabel} ${diasAtrasados} ${dayLabel}`;
    textoHoras = '';
    cor = '#F44336';
  } else if (diffDias === 0) {
    texto = language === 'pt' ? 'Vence hoje!' : 'Due today!';
    const hourLabel = language === 'pt' 
      ? (diffHoras > 1 ? 'horas' : 'hora')
      : (diffHoras > 1 ? 'hours' : 'hour');
    const remainingLabel = language === 'pt' ? 'Faltam' : 'Remaining';
    textoHoras = `${remainingLabel} ${diffHoras} ${hourLabel}`;
    cor = '#F44336';
  } else if (diffDias === 1) {
    texto = language === 'pt' ? 'Vence amanhã' : 'Due tomorrow';
    const horasRestantes = diffHoras - 24;
    const hourLabel = language === 'pt' 
      ? (horasRestantes > 1 ? 'horas' : 'hora')
      : (horasRestantes > 1 ? 'hours' : 'hour');
    const remainingLabel = language === 'pt' ? 'Faltam' : 'Remaining';
    textoHoras = `${remainingLabel} ${horasRestantes} ${hourLabel}`;
    cor = '#FF5722';
  } else {
    const dayLabel = language === 'pt' ? 'dias' : 'days';
    const hourLabel = language === 'pt' ? 'horas' : 'hours';
    const remainingLabel = language === 'pt' ? 'Faltam' : 'Remaining';
    texto = `${remainingLabel} ${diffDias} ${dayLabel}`;
    textoHoras = `${remainingLabel} ${diffHoras} ${hourLabel}`;
    if (diffDias <= 7) {
      cor = '#FF9800';
    } else if (diffDias <= 30) {
      cor = '#8B7355';
    } else {
      cor = '#6B6B6B';
    }
  }
  
  return { dias: diffDias, horas: diffHoras, texto, textoHoras, cor };
}