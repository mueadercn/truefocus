import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// Simple Supabase client - no complex configuration
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);