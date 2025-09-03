// Authentication utilities for Luma AI
import { supabase } from './supabase'

export interface AuthUser {
  id: string
  email?: string
  user_metadata?: any
  access_token?: string
}

// Get current authenticated user with JWT token
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.log('No authenticated user found')
      return null
    }

    // Get the session to access JWT token
    const { data: { session } } = await supabase.auth.getSession()
    
    return {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      access_token: session?.access_token
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// Get JWT token for API calls
export async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch (error) {
    console.error('Error getting auth token:', error)
    return null
  }
}

// Sign in with email/password
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    throw new Error(error.message)
  }
  
  return data
}

// Sign up with email/password
export async function signUpWithEmail(email: string, password: string, metadata?: any) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  })
  
  if (error) {
    throw new Error(error.message)
  }
  
  return data
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    throw new Error(error.message)
  }
}

// Listen to auth state changes
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      const authUser: AuthUser = {
        id: session.user.id,
        email: session.user.email,
        user_metadata: session.user.user_metadata,
        access_token: session.access_token
      }
      callback(authUser)
    } else {
      callback(null)
    }
  })
}

// Call Edge Functions with proper authentication
export async function callEdgeFunction(
  functionName: string, 
  payload: any = {},
  useServiceRole = false
): Promise<any> {
  try {
    const token = useServiceRole 
      ? import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      : await getAuthToken()
    
    if (!token) {
      throw new Error('No authentication token available')
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Function call failed: ${response.status} - ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Error calling edge function ${functionName}:`, error)
    throw error
  }
}

// Specific function calls
export async function submitJournalEntry(userId: string, prompt: string, content: string) {
  return await callEdgeFunction('submit-journal-entry', {
    user_id: userId,
    prompt,
    content
  })
}

export async function generateJournalPrompt(userId: string) {
  return await callEdgeFunction('generate-journal-prompt', {
    user_id: userId
  })
}

export async function triggerDailyCheckin() {
  return await callEdgeFunction('daily-checkin-generator', {}, true) // Use service role
}