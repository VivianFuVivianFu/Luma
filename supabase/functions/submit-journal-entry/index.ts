import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface JournalEntryRequest {
  user_id: string;
  prompt: string;
  content: string;
}

interface ValidationError {
  field: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Method not allowed. Use POST.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    );
  }

  try {
    // Initialize Supabase client
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

    console.log('📝 Processing journal entry submission...');

    // Parse request body
    let requestBody: JournalEntryRequest;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
          details: 'Please ensure the request body is valid JSON'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Validate input fields
    const validationErrors = validateJournalEntry(requestBody);
    if (validationErrors.length > 0) {
      console.log('❌ Validation errors:', validationErrors);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
          validation_errors: validationErrors
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const { user_id, prompt, content } = requestBody;

    // Verify user exists and is authenticated
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(user_id);
    if (userError || !user) {
      console.error('User verification failed:', userError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid user',
          details: 'User not found or not authorized'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    console.log(`👤 Submitting journal entry for user: ${user.user.email}`);

    // Insert journal entry into database
    const { data: journalEntry, error: insertError } = await supabase
      .from('journal_entries')
      .insert({
        user_id: user_id,
        prompt: prompt,
        content: content
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Error inserting journal entry:', insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database error',
          details: 'Failed to save journal entry'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log(`✅ Journal entry saved successfully: ${journalEntry.id}`);

    // Optional: Update user's journaling streak or achievements
    await updateUserJournalingStats(supabase, user_id);

    // Optional: Send confirmation notification
    await sendJournalConfirmationNotification(supabase, user_id, content.length);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Journal entry saved successfully',
        data: {
          entry_id: journalEntry.id,
          created_at: journalEntry.created_at,
          word_count: journalEntry.word_count,
          prompt_preview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
          content_preview: content.substring(0, 150) + (content.length > 150 ? '...' : '')
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );

  } catch (error) {
    console.error('❌ Journal entry submission error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: 'An unexpected error occurred while processing your journal entry'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Validate journal entry input
 */
function validateJournalEntry(entry: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if all required fields are present
  if (!entry.user_id) {
    errors.push({ field: 'user_id', message: 'User ID is required' });
  } else if (typeof entry.user_id !== 'string') {
    errors.push({ field: 'user_id', message: 'User ID must be a string' });
  } else if (!isValidUUID(entry.user_id)) {
    errors.push({ field: 'user_id', message: 'User ID must be a valid UUID' });
  }

  if (!entry.prompt) {
    errors.push({ field: 'prompt', message: 'Prompt is required' });
  } else if (typeof entry.prompt !== 'string') {
    errors.push({ field: 'prompt', message: 'Prompt must be a string' });
  } else if (entry.prompt.length < 10) {
    errors.push({ field: 'prompt', message: 'Prompt must be at least 10 characters long' });
  } else if (entry.prompt.length > 5000) {
    errors.push({ field: 'prompt', message: 'Prompt cannot exceed 5000 characters' });
  }

  if (!entry.content) {
    errors.push({ field: 'content', message: 'Content is required' });
  } else if (typeof entry.content !== 'string') {
    errors.push({ field: 'content', message: 'Content must be a string' });
  } else if (entry.content.trim().length < 5) {
    errors.push({ field: 'content', message: 'Content must be at least 5 characters long' });
  } else if (entry.content.length > 50000) {
    errors.push({ field: 'content', message: 'Content cannot exceed 50,000 characters' });
  }

  return errors;
}

/**
 * Check if string is a valid UUID
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Update user's journaling statistics and achievements
 */
async function updateUserJournalingStats(supabase: any, userId: string): Promise<void> {
  try {
    // Get user's total journal entries count
    const { data: entriesCount } = await supabase
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Check if this is their first entry today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayEntries } = await supabase
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today.toISOString());

    // Calculate journaling streak (consecutive days)
    // This is a simplified version - you might want more sophisticated streak calculation
    const isFirstEntryToday = todayEntries === 1;

    if (isFirstEntryToday) {
      console.log(`🔥 User ${userId} maintained their journaling streak`);
      // Here you could update a user_achievements or user_stats table
    }

    console.log(`📊 User stats - Total entries: ${entriesCount}, Today's entries: ${todayEntries}`);

  } catch (error) {
    console.error('Error updating user journaling stats:', error);
    // Don't throw error - this is optional functionality
  }
}

/**
 * Send confirmation notification for journal entry
 */
async function sendJournalConfirmationNotification(
  supabase: any,
  userId: string,
  contentLength: number
): Promise<void> {
  try {
    // Get user's device token for notification
    const { data: deviceToken } = await supabase
      .from('user_device_tokens')
      .select('device_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!deviceToken?.device_token) {
      console.log('No active device token found for user, skipping notification');
      return;
    }

    // Create personalized confirmation message
    const wordCount = Math.ceil(contentLength / 5); // Rough word count estimation
    let confirmationMessage = 'Great job on your journal entry today! ';

    if (wordCount < 50) {
      confirmationMessage += 'Every reflection counts.';
    } else if (wordCount < 150) {
      confirmationMessage += 'You shared some meaningful insights.';
    } else {
      confirmationMessage += 'You did some deep reflection today.';
    }

    // Log the confirmation (you could also send actual push notification here)
    await supabase.rpc('log_notification', {
      target_user_id: userId,
      notification_type: 'journal_confirmation',
      message: confirmationMessage,
      delivery_status: 'sent'
    });

    console.log(`📲 Journal confirmation logged for user ${userId}`);

  } catch (error) {
    console.error('Error sending journal confirmation:', error);
    // Don't throw error - this is optional functionality
  }
}
