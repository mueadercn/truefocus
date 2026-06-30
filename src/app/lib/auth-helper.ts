import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

// Cache para evitar chamadas duplicadas
let cachedUser: User | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5000; // 5 segundos

// Promise para controlar chamadas simultâneas
let pendingUserRequest: Promise<User | null> | null = null;

/**
 * Get current authenticated user with retry on lock errors
 * Uses cache to prevent multiple simultaneous calls
 */
export async function getCurrentUser(): Promise<User | null> {
  // Return cached user if still valid
  const now = Date.now();
  if (cachedUser && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedUser;
  }

  // If there's already a pending request, wait for it
  if (pendingUserRequest) {
    return pendingUserRequest;
  }

  // Create new request with retry logic
  pendingUserRequest = (async () => {
    const maxRetries = 3;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        // First, check if we have a valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // If session is missing or expired, try to refresh
        if (!session || sessionError) {
          console.log('⚠️ Session missing or expired, attempting refresh...');
          const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !newSession) {
            console.error('❌ Failed to refresh session:', refreshError);
            // Clear cache and return null - user needs to login again
            cachedUser = null;
            cacheTimestamp = 0;
            throw new Error('Auth session missing! Please login again.');
          }
          
          console.log('✅ Session refreshed successfully');
        }
        
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          throw error;
        }
        
        // Update cache
        cachedUser = user;
        cacheTimestamp = Date.now();
        
        return user;
      } catch (error: any) {
        const isLockError = error?.message?.includes('Lock') || error?.name === 'AbortError';
        const isLastAttempt = i === maxRetries - 1;
        
        if (isLockError && !isLastAttempt) {
          console.log(`⏭️ Lock error in getCurrentUser, retrying (${i + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
          continue;
        }
        
        console.error('Error getting current user:', error);
        throw error;
      }
    }
    
    return null;
  })();

  try {
    return await pendingUserRequest;
  } finally {
    pendingUserRequest = null;
  }
}

/**
 * Clear cached user (call this after logout)
 */
export function clearUserCache() {
  cachedUser = null;
  cacheTimestamp = 0;
  pendingUserRequest = null;
}

/**
 * Get current session with retry on lock errors
 */
export async function getCurrentSession() {
  const maxRetries = 3;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      return session;
    } catch (error: any) {
      const isLockError = error?.message?.includes('Lock') || error?.name === 'AbortError';
      const isLastAttempt = i === maxRetries - 1;
      
      if (isLockError && !isLastAttempt) {
        console.log(`⏭️ Lock error in getCurrentSession, retrying (${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
        continue;
      }
      
      console.error('Error getting current session:', error);
      throw error;
    }
  }
  
  return null;
}