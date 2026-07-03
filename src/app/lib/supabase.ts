import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// Local-first: a sessão fica SEMPRE salva no aparelho (localStorage). O usuário só
// "sai" pelo botão Sair. autoRefreshToken renova o token quando há internet; offline,
// a sessão salva continua valendo e os dados vêm do IndexedDB.
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);