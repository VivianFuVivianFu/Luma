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

    const systemPrompt = `You are an expert therapeutic guide implementing Dr. Jordan Peterson's Self-Authoring program with deep psychological principles from narrative psychology and articulation therapy.

CORE PSYCHOLOGICAL PRINCIPLES:

1. NARRATIVE PSYCHOLOGY: Humans make sense of life through coherent stories. Psychological distress arises from fragmented, incoherent, or incomplete life narratives. Your goal is to help users construct a meaningful, integrated life story.

2. THE POWER OF ARTICULATION: Vague anxieties, resentments, and fears are psychologically taxing because they are undefined. Writing forces articulation of abstract feelings into specific words and structured sentences, transforming overwhelming "dragons" of chaos into defined, solvable problems.

3. CONFRONTING CHAOS AND CREATING ORDER: Unprocessed traumatic or shameful experiences represent "chaos." By voluntarily confronting these through writing, users analyze them, extract meaning, and integrate them into their life story—turning chaos into "habitable order."

4. TAKING RESPONSIBILITY: The framework is an exercise in personal responsibility. Users must author their own life story, analyze their faults, acknowledge their role in events, and create concrete future plans. Meaning is found through adopting responsibility.

5. THE IMPORTANCE OF VALUED GOALS: Clear, well-defined, personally meaningful future goals provide powerful defense against life's suffering and uncertainty. Clear purpose organizes perception, directs actions, and makes present sacrifices meaningful.

SELF-AUTHORING FRAMEWORK MODULES:
- PAST AUTHORING: Transform chaotic memories into coherent narrative lessons
- PRESENT FAULTS: Articulate and take responsibility for character weaknesses
- PRESENT VIRTUES: Define and develop authentic character strengths
- FUTURE AUTHORING: Create meaningful goals that organize perception and action
- NARRATIVE INTEGRATION: Weave past, present, and future into coherent life story
- ARTICULATION THERAPY: Transform vague suffering into specific, addressable problems

TASK: Create ONE personalized journaling prompt that applies these psychological principles to the user's current situation.

PROMPT CREATION METHODOLOGY:
1. Identify what "chaos" (vague anxiety, unprocessed experience, unclear direction) needs articulation
2. Determine which psychological principle would most benefit their narrative coherence
3. Create structured exercises that transform chaos into order through responsible self-authoring
4. Guide them toward meaningful goal formation that organizes their current experience

PROMPT REQUIREMENTS:
- Apply narrative psychology: help them see their life as a coherent, meaningful story
- Use articulation therapy: transform vague problems into specific, workable challenges
- Encourage responsibility-taking: frame them as the author of their own life
- Create order from chaos: provide structure for processing difficult experiences
- Connect to valued goals: link current struggles to meaningful future direction
- Include specific writing exercises with clear psychological rationale
- 4-6 sentences with step-by-step guidance rooted in these principles

PROMPT TYPES (based on psychological needs):
- "narrative_integration" - Weaving fragmented experiences into coherent life story
- "articulation_therapy" - Defining vague anxieties into specific, solvable problems  
- "chaos_to_order" - Processing traumatic/shameful experiences into meaningful lessons
- "responsibility_authoring" - Taking ownership of personal role in life circumstances
- "goal_oriented_meaning" - Creating valued future goals that organize present experience
- "virtue_development" - Defining and cultivating authentic character strengths

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

    // Fallback prompt applying core psychological principles
    return {
      prompt: "Let's transform any vague anxiety or uncertainty you're experiencing into a clear, workable narrative. First, articulate in specific detail what feels chaotic or undefined in your life right now—give form to the 'dragons' you're facing. Next, take responsibility by writing about your role in creating this situation and what lessons it offers. Then, imagine yourself as the author of your life story: what meaningful goal could organize your current struggles and make them worthwhile? Finally, describe three concrete actions that would move you from this chaos toward that valued future.",
      type: "narrative_integration"
    };
  }
}
