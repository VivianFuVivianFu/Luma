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

// Admin client for memory operations (bypasses RLS) - completely disable auth to avoid multiple GoTrueClient instances
export const sbAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
    storageKey: 'luma-admin-auth', // Unique storage key to separate from main client
    storage: typeof window !== 'undefined' ? {
      getItem: () => null, // Always return null to prevent session persistence
      setItem: () => {}, // No-op
      removeItem: () => {} // No-op
    } : undefined
  },
  global: {
    headers: {
      'Authorization': `Bearer ${supabaseServiceRoleKey}`
    }
  }
})

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey)
}
