import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface LlamaResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log(`🧠 Generating guided journal prompt for user: ${user_id}`);

    // Get user's recent conversation transcript
    const { data: transcript } = await supabase.rpc(
      'get_user_recent_transcript',
      {
        target_user_id: user_id,
        hours_back: 72  // Look back 3 days for more context
      }
    );

    // Get user's recent journal entries for context
    const { data: recentEntries } = await supabase
      .from('journal_entries')
      .select('prompt, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(3);

    // Generate journaling prompt using Llama 3.1 70B
    const journalPrompt = await generateJournalingPrompt(
      transcript || 'No recent conversation found.',
      recentEntries || []
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user_id: user_id,
          prompt: journalPrompt.prompt,
          prompt_type: journalPrompt.type,
          generated_at: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Generate journal prompt error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Failed to generate journal prompt'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Generate personalized journaling prompt using Llama 3.1 70B
 */
async function generateJournalingPrompt(
  transcript: string,
  recentEntries: Array<{prompt: string, created_at: string}>
): Promise<{prompt: string, type: string}> {
  try {
    const recentPrompts = recentEntries.map(e => `- ${e.prompt}`).join('\n');

    const systemPrompt = `You are an expert life coach generating personalized journaling prompts inspired by Jordan Peterson's Self-Authoring program.

TASK: Create ONE forward-looking journaling prompt based on the user's recent conversations.

ANALYSIS STEPS:
1. Identify the user's current emotional state and challenges from the transcript
2. Determine what type of reflection would be most beneficial
3. Create a future-oriented prompt that encourages growth and self-discovery

PROMPT REQUIREMENTS:
- Focus on the FUTURE, not just processing the past
- Encourage specific, actionable reflection
- Use empowering, possibility-focused language
- Be personally relevant to their situation
- 2-3 sentences maximum
- End with a clear writing instruction

PROMPT TYPES TO CHOOSE FROM:
- "future_vision" - Imagining ideal outcomes
- "obstacle_planning" - Preparing for challenges
- "values_clarification" - Defining what matters most
- "growth_reflection" - Learning from experiences
- "relationship_building" - Improving connections

CONVERSATION TRANSCRIPT:
<transcript>
${transcript}
</transcript>

RECENT JOURNAL PROMPTS (avoid repeating themes):
${recentPrompts || 'None'}

Generate ONLY the prompt text and type, formatted as JSON:
{"prompt": "Your prompt here...", "type": "prompt_type"}`;

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('VITE_TOGETHER_API_KEY') ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate a personalized journaling prompt based on this conversation.' }
        ],
        max_tokens: 200,
        temperature: 0.8,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      console.error('Llama API error:', response.status, await response.text());
      throw new Error('Failed to generate prompt with Llama API');
    }

    const data: LlamaResponse = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Empty response from Llama API');
    }

    // Try to parse JSON response
    try {
      const parsed = JSON.parse(content);
      return {
        prompt: parsed.prompt,
        type: parsed.type || 'growth_reflection'
      };
    } catch (parseError) {
      // Fallback: treat entire response as prompt
      return {
        prompt: content,
        type: 'growth_reflection'
      };
    }

  } catch (error) {
    console.error('Error generating journaling prompt:', error);

    // Fallback prompt
    return {
      prompt: "Imagine yourself one year from now, having grown and learned from your current challenges. What specific steps did you take to get there? What did you learn about yourself along the way? Write about that future version of yourself in detail.",
      type: "future_vision"
    };
  }
}
