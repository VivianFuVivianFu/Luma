// =====================================================
// COMPLETE LUMA AI ANDROID APP INTEGRATION
// Updated with Memory System, Journaling, Daily Check-ins, and Authentication
// React Native / Expo TypeScript Implementation
// =====================================================

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

// Initialize Supabase client for Android
const supabase = createClient(
  'https://oyqzljunafjfuwdedjee.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cXpsanVuYWZqZnV3ZGVkamVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NTgyMDYsImV4cCI6MjA3MDIzNDIwNn0.jP-zXVLqQHZfzFwg3QU_a0o7VOp_wmIiLZX1ehuOHaI',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// =====================================================
// AUTHENTICATION SYSTEM
// =====================================================

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: any;
  access_token?: string;
}

/**
 * Sign in with email/password
 */
export async function signInWithEmail(email: string, password: string): Promise<{ user: AuthUser | null; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return { user: null, error: error.message };
    }
    
    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
      access_token: data.session?.access_token
    };
    
    return { user };
  } catch (error) {
    return { user: null, error: error.message };
  }
}

/**
 * Sign up with email/password
 */
export async function signUpWithEmail(
  email: string, 
  password: string, 
  displayName?: string
): Promise<{ user: AuthUser | null; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0]
        }
      }
    });
    
    if (error) {
      return { user: null, error: error.message };
    }
    
    const user: AuthUser = {
      id: data.user?.id || '',
      email: data.user?.email,
      user_metadata: data.user?.user_metadata,
      access_token: data.session?.access_token
    };
    
    return { user };
  } catch (error) {
    return { user: null, error: error.message };
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    return {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      access_token: session?.access_token
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { error: error.message };
    }
    
    return {};
  } catch (error) {
    return { error: error.message };
  }
}

// =====================================================
// MEMORY SYSTEM INTEGRATION
// =====================================================

export class AndroidMemoryService {
  
  /**
   * Start a new chat session
   */
  async startSession(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error starting session:', error);
        return null;
      }

      console.log('[Memory] Started new session:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error starting session:', error);
      return null;
    }
  }

  /**
   * Add message to session
   */
  async addMessage(
    sessionId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          user_id: userId,
          role: role,
          content: content,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error adding message:', error);
        return false;
      }

      console.log(`[Memory] Added ${role} message to session ${sessionId}`);
      return true;
    } catch (error) {
      console.error('Error adding message:', error);
      return false;
    }
  }

  /**
   * Get recent messages for context
   */
  async getRecentMessages(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting recent messages:', error);
        return [];
      }

      return data?.reverse() || [];
    } catch (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }
  }

  /**
   * Get user's active session
   */
  async getActiveSession(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // Create new session if none exists
        return await this.startSession(userId);
      }

      return data.id;
    } catch (error) {
      console.error('Error getting active session:', error);
      return await this.startSession(userId);
    }
  }
}

// =====================================================
// CHAT SYSTEM WITH CLAUDE 3.5 HAIKU
// =====================================================

export class AndroidChatService {
  private memoryService: AndroidMemoryService;
  private currentSessionId: string | null = null;

  constructor() {
    this.memoryService = new AndroidMemoryService();
  }

  /**
   * Send message to Claude and get response
   */
  async sendMessage(userMessage: string): Promise<{ reply: string; error?: string }> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return { reply: '', error: 'Please log in to chat' };
      }

      // Get or create session
      if (!this.currentSessionId) {
        this.currentSessionId = await this.memoryService.getActiveSession(currentUser.id);
      }

      // Save user message
      if (this.currentSessionId) {
        await this.memoryService.addMessage(
          this.currentSessionId,
          currentUser.id,
          'user',
          userMessage
        );
      }

      // Get recent context
      const recentMessages = await this.memoryService.getRecentMessages(currentUser.id, 10);
      const history = recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call Vercel Edge Function
      const response = await fetch('https://luma-3.vercel.app/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.access_token}`
        },
        body: JSON.stringify({
          message: userMessage,
          history: history
        })
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.reply;

      // Save assistant response
      if (this.currentSessionId && reply) {
        await this.memoryService.addMessage(
          this.currentSessionId,
          currentUser.id,
          'assistant',
          reply
        );
      }

      return { reply };
    } catch (error) {
      console.error('Error sending message:', error);
      return { 
        reply: "I'm having trouble connecting right now. Could you please try again?", 
        error: error.message 
      };
    }
  }

  /**
   * Start new conversation session
   */
  async startNewSession(): Promise<boolean> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return false;

      this.currentSessionId = await this.memoryService.startSession(currentUser.id);
      return this.currentSessionId !== null;
    } catch (error) {
      console.error('Error starting new session:', error);
      return false;
    }
  }
}

// =====================================================
// JOURNALING SYSTEM
// =====================================================

/**
 * Generate AI journal prompt based on recent conversations
 */
export async function generateJournalPrompt(): Promise<{ prompt: string; type: string; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { prompt: '', type: '', error: 'Please log in to generate journal prompts' };
    }

    const response = await fetch('https://oyqzljunafjfuwdedjee.supabase.co/functions/v1/generate-journal-prompt', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentUser.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: currentUser.id
      })
    });

    if (!response.ok) {
      throw new Error(`Journal prompt API error: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      return {
        prompt: result.data.prompt,
        type: result.data.prompt_type
      };
    } else {
      throw new Error(result.error || 'Failed to generate prompt');
    }
  } catch (error) {
    console.error('Error generating journal prompt:', error);
    return { 
      prompt: "What are three things you're grateful for today, and how did they make you feel?",
      type: "gratitude_reflection",
      error: error.message
    };
  }
}

/**
 * Submit journal entry
 */
export async function submitJournalEntry(
  prompt: string,
  content: string
): Promise<{ success: boolean; entryId?: string; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Please log in to save journal entries' };
    }

    const response = await fetch('https://oyqzljunafjfuwdedjee.supabase.co/functions/v1/submit-journal-entry', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentUser.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: currentUser.id,
        prompt: prompt,
        content: content
      })
    });

    if (!response.ok) {
      throw new Error(`Journal submission API error: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        entryId: result.data.entry_id
      };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error submitting journal entry:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's journal entries
 */
export async function getUserJournalEntries(
  limit: number = 20,
  offset: number = 0
): Promise<any[]> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return [];

    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        id,
        created_at,
        prompt,
        content,
        word_count
      `)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching journal entries:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    return [];
  }
}

// =====================================================
// PUSH NOTIFICATIONS SYSTEM
// =====================================================

/**
 * Register device for push notifications
 */
export async function setupPushNotifications(): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return false;

    // Request permission
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('Push notification permission denied');
      return false;
    }

    // Get device token
    const token = await messaging().getToken();
    console.log('FCM Token:', token);

    // Register token with backend
    const { error } = await supabase
      .from('user_device_tokens')
      .upsert({
        user_id: currentUser.id,
        device_token: token,
        platform: 'android',
        app_version: '1.0.0',
        is_active: true,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error registering device token:', error);
      return false;
    }

    // Set up notification preferences (default to 6 PM)
    await updateNotificationPreferences({
      daily_checkin_enabled: true,
      daily_checkin_time: '18:00:00',
      timezone: 'America/New_York', // Get from device
      journal_reminders_enabled: true
    });

    console.log('✅ Push notifications set up successfully');
    return true;
  } catch (error) {
    console.error('Error setting up push notifications:', error);
    return false;
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(preferences: {
  daily_checkin_enabled?: boolean;
  daily_checkin_time?: string;
  timezone?: string;
  journal_reminders_enabled?: boolean;
}): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return false;

    const { error } = await supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: currentUser.id,
        ...preferences,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }

    console.log('✅ Notification preferences updated');
    return true;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return false;
  }
}

/**
 * Handle incoming push notifications
 */
export function setupNotificationHandlers() {
  // Handle notification when app is in background
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
    
    // Handle different notification types
    const notificationType = remoteMessage.data?.type;
    
    switch (notificationType) {
      case 'daily_checkin':
        // Could trigger local navigation to chat screen
        break;
      case 'journal_reminder':
        // Could trigger local navigation to journal screen
        break;
      default:
        break;
    }
  });

  // Handle notification when app is in foreground
  const unsubscribe = messaging().onMessage(async remoteMessage => {
    console.log('A new FCM message arrived!', remoteMessage);
    
    // Show local notification or update UI
    // You can use libraries like react-native-push-notification
  });

  return unsubscribe;
}

// =====================================================
// NOTIFICATION HISTORY
// =====================================================

/**
 * Get user's notification history
 */
export async function getNotificationHistory(limit: number = 50): Promise<any[]> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return [];

    const { data, error } = await supabase
      .from('notifications_log')
      .select(`
        id,
        notification_type,
        message,
        delivery_status,
        sent_at
      `)
      .eq('user_id', currentUser.id)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notification history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching notification history:', error);
    return [];
  }
}

// =====================================================
// EXPORT ALL SERVICES
// =====================================================

export const LumaAndroidServices = {
  auth: {
    signInWithEmail,
    signUpWithEmail,
    getCurrentUser,
    signOut
  },
  chat: new AndroidChatService(),
  memory: new AndroidMemoryService(),
  journal: {
    generatePrompt: generateJournalPrompt,
    submitEntry: submitJournalEntry,
    getUserEntries: getUserJournalEntries
  },
  notifications: {
    setup: setupPushNotifications,
    updatePreferences: updateNotificationPreferences,
    setupHandlers: setupNotificationHandlers,
    getHistory: getNotificationHistory
  }
};

export default LumaAndroidServices;