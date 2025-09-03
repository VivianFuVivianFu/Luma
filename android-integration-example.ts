// =====================================================
// ANDROID APP INTEGRATION EXAMPLES
// TypeScript/JavaScript code for your React Native or Expo app
// =====================================================

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://your-project-ref.supabase.co',
  'your-anon-key-here'
);

/**
 * Submit Journal Entry to Supabase Edge Function
 */
export async function submitJournalEntry(
  userId: string,
  prompt: string,
  content: string
): Promise<{ success: boolean; entryId?: string; error?: string }> {
  try {
    console.log('📝 Submitting journal entry...');

    const response = await fetch('https://your-project-ref.supabase.co/functions/v1/submit-journal-entry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        user_id: userId,
        prompt: prompt,
        content: content
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Journal entry submitted successfully');
      return { success: true, entryId: result.data.entry_id };
    } else {
      console.error('❌ Journal submission failed:', result.error);
      return { success: false, error: result.error };
    }

  } catch (error) {
    console.error('❌ Network error submitting journal:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Register Device Token for Push Notifications
 */
export async function registerDeviceToken(
  userId: string,
  deviceToken: string,
  platform: 'android' | 'ios' = 'android'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_device_tokens')
      .upsert({
        user_id: userId,
        device_token: deviceToken,
        platform: platform,
        app_version: '1.0.0', // Get from your app's package.json
        is_active: true,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error registering device token:', error);
      return false;
    }

    console.log('✅ Device token registered successfully');
    return true;

  } catch (error) {
    console.error('Error registering device token:', error);
    return false;
  }
}

/**
 * Update User Notification Preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: {
    daily_checkin_enabled?: boolean;
    daily_checkin_time?: string; // Format: "18:00:00"
    timezone?: string;
    journal_reminders_enabled?: boolean;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: userId,
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
 * Get User's Journal Entries
 */
export async function getUserJournalEntries(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        id,
        created_at,
        prompt,
        content,
        word_count
      `)
      .eq('user_id', userId)
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

/**
 * Get User's Notification History
 */
export async function getNotificationHistory(
  userId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('notifications_log')
      .select(`
        id,
        notification_type,
        message,
        delivery_status,
        sent_at
      `)
      .eq('user_id', userId)
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

/**
 * Helper function to get current user's auth token
 */
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

/**
 * Example: React Native component for journal entry submission
 */
export const JournalEntryScreen = () => {
  const [prompt, setPrompt] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      alert('Please write something before submitting.');
      return;
    }

    setIsSubmitting(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Please log in to save your journal entry.');
      setIsSubmitting(false);
      return;
    }

    // Submit journal entry
    const result = await submitJournalEntry(user.id, prompt, content);

    if (result.success) {
      alert('Journal entry saved successfully!');
      setContent('');
      setPrompt('');
      // Navigate back or to journal list
    } else {
      alert(`Failed to save journal entry: ${result.error}`);
    }

    setIsSubmitting(false);
  };

  return (
    // Your React Native JSX here
    // TextInput components for prompt and content
    // Submit button that calls handleSubmit
    null
  );
};

/**
 * Example: Push notification setup in App.js
 */
export const setupPushNotifications = async () => {
  try {
    // Register for push notifications (React Native Firebase)
    // const messaging = firebase.messaging();
    // const token = await messaging.getToken();
    
    const mockToken = 'example-device-token';
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await registerDeviceToken(user.id, mockToken, 'android');
      console.log('Push notifications set up successfully');
    }

  } catch (error) {
    console.error('Error setting up push notifications:', error);
  }
};

// =====================================================
// USAGE EXAMPLES
// =====================================================

/*
// 1. Submit a journal entry
await submitJournalEntry(
  'user-uuid-here',
  'Write about a time when you overcame a challenge...',
  'Today I reflected on when I started my new job...'
);

// 2. Set up daily notifications at 7 PM
await updateNotificationPreferences('user-uuid-here', {
  daily_checkin_enabled: true,
  daily_checkin_time: '19:00:00',
  timezone: 'America/New_York'
});

// 3. Get user's recent journal entries
const entries = await getUserJournalEntries('user-uuid-here', 10);
console.log('Recent journal entries:', entries);
*/