import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

// Regular client for user operations with session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'luma-auth'
  }
})

// Admin client for memory operations (bypasses RLS) - singleton pattern to prevent conflicts
let _sbAdmin: any = null;

const createAdminClient = () => {
  if (_sbAdmin) return _sbAdmin;
  
  _sbAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storageKey: 'luma-admin-noauth', // Completely different storage key
      storage: typeof window !== 'undefined' ? {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      } : undefined
    },
    global: {
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'apikey': supabaseServiceRoleKey
      }
    },
    db: {
      schema: 'public'
    }
  });
  
  return _sbAdmin;
};

export const sbAdmin = createAdminClient();

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey)
}
