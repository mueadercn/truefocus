import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from './supabase';
import type { ParsedVoiceTask } from '../types';

// Prefixo correto da Edge Function realmente implantada (mesmo do signup)
const AI_URL = `https://${projectId}.supabase.co/functions/v1/make-server-41f917a5`;

/**
 * Envia a transcrição de voz para a IA (GPT-4o-mini via Edge Function)
 * e recebe de volta o compromisso interpretado (título, data, hora).
 */
export async function aiParseVoiceTask(
  transcript: string,
  currentDate: string
): Promise<ParsedVoiceTask> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token || publicAnonKey;

  const response = await fetch(`${AI_URL}/ai/parse-voice-task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ transcript, currentDate }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Failed to parse voice task:', data);
    throw new Error(data.error || 'Failed to parse voice task');
  }
  return data.result as ParsedVoiceTask;
}
