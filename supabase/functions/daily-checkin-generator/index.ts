import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ActiveUser {
  user_id: string;
  display_name: string;
  device_token: string;
  daily_checkin_enabled: boolean;
  daily_checkin_time: string;
  timezone: string;
}

interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('🕐 Starting daily check-in generator...');

    // Get list of active users who had chat sessions in last 24 hours
    const { data: activeUsers, error: usersError } = await supabase
      .from('active_users_24h')
      .select('*');

    if (usersError) {
      console.error('Error fetching active users:', usersError);
      throw usersError;
    }

    console.log(`📊 Found ${activeUsers?.length || 0} active users`);

    const results = {
      total_users: activeUsers?.length || 0,
      notifications_sent: 0,
      notifications_failed: 0,
      errors: [] as string[]
    };

    // Process each active user
    for (const user of activeUsers || []) {
      try {
        console.log(`👤 Processing user: ${user.display_name} (${user.user_id})`);

        // Get user's recent conversation transcript
        const { data: transcript } = await supabase.rpc(
          'get_user_recent_transcript',
          {
            target_user_id: user.user_id,
            hours_back: 24
          }
        );

        if (!transcript || transcript === 'No recent conversation found.') {
          console.log(`⚠️  No recent transcript for user ${user.user_id}`);
          continue;
        }

        // Generate personalized check-in message using Claude Haiku
        const checkInMessage = await generateCheckInMessage(transcript);

        if (!checkInMessage) {
          console.log(`❌ Failed to generate message for user ${user.user_id}`);
          results.notifications_failed++;
          continue;
        }

        // Send FCM push notification
        const fcmResult = await sendFCMNotification(
          user.device_token,
          checkInMessage,
          user.display_name
        );

        // Log the notification
        await supabase.rpc('log_notification', {
          target_user_id: user.user_id,
          notification_type: 'daily_checkin',
          message: checkInMessage,
          fcm_message_id: fcmResult.messageId || null,
          delivery_status: fcmResult.success ? 'sent' : 'failed'
        });

        if (fcmResult.success) {
          results.notifications_sent++;
          console.log(`✅ Notification sent to ${user.display_name}`);
        } else {
          results.notifications_failed++;
          results.errors.push(`Failed to send to ${user.display_name}: ${fcmResult.error}`);
          console.log(`❌ Failed to send to ${user.display_name}: ${fcmResult.error}`);
        }

        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (userError) {
        console.error(`Error processing user ${user.user_id}:`, userError);
        results.notifications_failed++;
        results.errors.push(`User ${user.user_id}: ${userError.message}`);
      }
    }

    console.log('🏁 Daily check-in generation complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily check-in notifications processed',
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Daily check-in generator error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Failed to process daily check-in notifications'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Generate personalized check-in message using Claude Haiku
 */
async function generateCheckInMessage(transcript: string): Promise<string | null> {
  try {
    const prompt = `You are a compassionate AI assistant generating daily check-in messages for a mental health app.

TASK: Analyze the conversation transcript and create ONE brief, supportive message for a push notification.

ANALYSIS STEPS:
1. Identify the user's primary emotional state (stressed, anxious, sad, excited, overwhelmed, etc.)
2. Note any specific challenges mentioned (work, relationships, health, projects)
3. Determine what type of support would be most helpful

MESSAGE REQUIREMENTS:
- Maximum 100 characters (critical for mobile notifications)
- Supportive and caring tone, like a trusted friend
- No questions or emojis
- Focus on encouragement, validation, or gentle reminders
- Personalize to their specific situation when possible

CONVERSATION TRANSCRIPT:
<transcript>
${transcript}
</transcript>

Generate only the message text, nothing else.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 50,
        temperature: 0.7,
        system: 'Generate caring, concise daily check-in messages under 100 characters.',
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      console.error('Claude API error:', response.status, await response.text());
      return null;
    }

    const data: ClaudeResponse = await response.json();
    const message = data.content[0]?.text?.trim();

    // Validate message length
    if (message && message.length <= 100) {
      return message;
    }

    // Fallback: truncate if too long
    return message ? message.substring(0, 97) + '...' : null;

  } catch (error) {
    console.error('Error generating check-in message:', error);
    return null;
  }
}

/**
 * Send FCM push notification
 */
async function sendFCMNotification(
  deviceToken: string,
  message: string,
  userName: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const fcmPayload = {
      message: {
        token: deviceToken,
        notification: {
          title: 'Daily Check-in from Luma',
          body: message,
        },
        data: {
          type: 'daily_checkin',
          message: message,
          timestamp: new Date().toISOString()
        },
        android: {
          notification: {
            channel_id: 'daily_checkin',
            priority: 'default',
            default_sound: true,
            default_vibrate_timings: true
          }
        }
      }
    };

    const response = await fetch('https://fcm.googleapis.com/v1/projects/' +
      Deno.env.get('FCM_PROJECT_ID') + '/messages:send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await getFCMAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FCM API error:', response.status, errorText);
      return { success: false, error: `FCM error: ${response.status}` };
    }

    const result = await response.json();
    return {
      success: true,
      messageId: result.name?.split('/').pop()
    };

  } catch (error) {
    console.error('Error sending FCM notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get FCM access token using service account
 */
async function getFCMAccessToken(): Promise<string> {
  try {
    // For now, return the token from environment variable
    // In production, implement proper JWT signing with crypto library
    const token = Deno.env.get('FCM_ACCESS_TOKEN');
    if (!token) {
      throw new Error('FCM_ACCESS_TOKEN environment variable not set');
    }
    return token;
  } catch (error) {
    console.error('Error getting FCM access token:', error);
    throw new Error('Failed to get FCM access token');
  }
}
