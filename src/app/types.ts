export interface Task {
  id: string;
  text: string;
  category?: 'Trabalho' | 'Exercício' | 'Estudo' | 'Pensamento Crítico' | 'Espiritualidade' | 'FOCUS - Modo Livre';
  duration_min?: number;
  date: string; // YYYY-MM-DD
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  mode: 'livre' | 'tempo';
  is_deadline?: boolean; // Flag para indicar que é uma tarefa de deadline
  deadline_id?: string; // ID da deadline relacionada
  order?: number; // Ordem de exibição (drag-and-drop)
}

export interface RescueProtocol {
  id: string;
  date: string; // ISO timestamp
  phase1_source: string;
  phase2_activity: string;
  phase3_activity: string;
  phase4_activity: string;
  phase4_duration_min?: number;
  phase5_target: string;
  phase5_category?: string;
  phase5_duration_min?: number;
  reflection_cause?: string;
  reflection_adjust?: string;
  reflection_nugget?: string;
  completed_date: string; // Date when rescue was completed (YYYY-MM-DD)
}

export interface Settings {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  sound: boolean;
  language: 'en' | 'pt';
}

export interface User {
  id: string;
  email: string;
  name?: string;
  license_type?: LicenseType;
  trial_ends_at?: string | null;
  subscription_ends_at?: string | null;
}

export type LicenseType = 'trial' | 'monthly' | 'annual' | 'lifetime' | 'free';

export interface License {
  id: string;
  user_id: string;
  user_email: string;
  license_type: LicenseType;
  
  // Trial
  trial_started_at: string | null;
  trial_ends_at: string | null;
  
  // Subscription (Monthly/Annual)
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  subscription_status: 'active' | 'canceled' | 'past_due' | null;
  
  // Stripe
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface AccessStatus {
  hasAccess: boolean;
  reason: string;
  daysRemaining: number | null;
  displayText: string;
  licenseType: LicenseType;
}

export interface Deadline {
  id: string;
  user_id: string;
  title: string;
  deadline_date: string; // ISO timestamp
  notes: string | null;
  status: 'pending' | 'completed' | 'overdue';
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  notification_sent_30days: boolean;
  notification_sent_15days: boolean;
  notification_sent_7days: boolean;
  notification_sent_3days: boolean;
  notification_sent_1day: boolean;
}