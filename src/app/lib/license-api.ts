import { supabase } from './supabase';
import { getCurrentUser } from './auth-helper';
import type { License, AccessStatus } from '../types';

export const licenseApi = {
  // Buscar licença do usuário
  get: async (): Promise<License | null> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch license:', error);
      throw new Error(error.message);
    }
    
    return data;
  },

  // Criar licença inicial (trial)
  createTrial: async (): Promise<License> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    if (!user.email) throw new Error('User email not found');

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 10); // 10 dias de trial

    const { data, error } = await supabase
      .from('licenses')
      .insert({
        user_id: user.id,
        user_email: user.email,
        license_type: 'trial',
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to create trial license:', error);
      throw new Error(error.message);
    }
    
    return data;
  },

  // Atualizar licença
  update: async (updates: Partial<License>): Promise<License> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('licenses')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Failed to update license:', error);
      throw new Error(error.message);
    }
    
    return data;
  },

  // Verificar acesso
  checkAccess: (license: License | null): AccessStatus => {
    if (!license) {
      return {
        hasAccess: false,
        reason: 'Sem Licença',
        daysRemaining: 0,
        displayText: '🚫 Sem Acesso',
        licenseType: 'free'
      };
    }

    const now = new Date();

    // Vitalício sempre tem acesso
    if (license.license_type === 'lifetime') {
      return {
        hasAccess: true,
        reason: 'Licença Vitalícia',
        daysRemaining: null,
        displayText: '💎 Vitalício',
        licenseType: 'lifetime'
      };
    }

    // Trial
    if (license.license_type === 'trial') {
      if (!license.trial_ends_at) {
        return {
          hasAccess: false,
          reason: 'Trial Inválido',
          daysRemaining: 0,
          displayText: '⏰ Trial Inválido',
          licenseType: 'trial'
        };
      }

      const trialEnd = new Date(license.trial_ends_at);
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (now < trialEnd) {
        return {
          hasAccess: true,
          reason: 'Trial Ativo',
          daysRemaining: daysRemaining,
          displayText: `🎁 ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''} restante${daysRemaining !== 1 ? 's' : ''}`,
          licenseType: 'trial'
        };
      } else {
        return {
          hasAccess: false,
          reason: 'Trial Expirado',
          daysRemaining: 0,
          displayText: '⏰ Trial Expirado',
          licenseType: 'trial'
        };
      }
    }

    // Mensal ou Anual
    if (license.license_type === 'monthly' || license.license_type === 'annual') {
      if (!license.subscription_ends_at) {
        return {
          hasAccess: false,
          reason: 'Assinatura Inválida',
          daysRemaining: 0,
          displayText: '❌ Plano Inválido',
          licenseType: license.license_type
        };
      }

      const subEnd = new Date(license.subscription_ends_at);
      
      if (license.subscription_status === 'active' && now < subEnd) {
        const planName = license.license_type === 'monthly' ? 'Mensal' : 'Anual';
        return {
          hasAccess: true,
          reason: 'Assinatura Ativa',
          daysRemaining: null,
          displayText: `✅ ${planName}`,
          licenseType: license.license_type
        };
      } else {
        return {
          hasAccess: false,
          reason: 'Assinatura Expirada',
          daysRemaining: 0,
          displayText: '❌ Plano Expirado',
          licenseType: license.license_type
        };
      }
    }

    // Sem licença
    return {
      hasAccess: false,
      reason: 'Sem Licença',
      daysRemaining: 0,
      displayText: '🚫 Sem Acesso',
      licenseType: 'free'
    };
  }
};